import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hashPayload,
  canonicalizeJson,
  MemoryIdempotencyStore,
  executeIdempotent,
  IdempotencyKeyReusedError,
  IdempotencyConflictError,
  withIdempotency,
  cleanupExpiredIdempotencyKeys,
} from '@/lib/idempotency';
import { NextResponse } from 'next/server';

describe('Idempotency Handling Module Suite', () => {
  let memoryStore: MemoryIdempotencyStore;

  beforeEach(() => {
    memoryStore = new MemoryIdempotencyStore();
  });

  // 1. Deterministic Payload Hashing
  describe('1. Deterministic Payload Hashing & Canonicalization', () => {
    it('produces identical hash regardless of object key order', () => {
      const payload1 = {
        tableNo: 5,
        items: [{ id: 'menu_1', qty: 2, note: 'เผ็ดน้อย' }],
        paymentMethod: 'PROMPTPAY',
      };

      const payload2 = {
        paymentMethod: 'PROMPTPAY',
        tableNo: 5,
        items: [{ note: 'เผ็ดน้อย', id: 'menu_1', qty: 2 }],
      };

      const hash1 = hashPayload(payload1);
      const hash2 = hashPayload(payload2);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });

    it('produces different hash when payload content changes', () => {
      const payloadA = { tableNo: 1, total: 100 };
      const payloadB = { tableNo: 1, total: 120 };

      expect(hashPayload(payloadA)).not.toBe(hashPayload(payloadB));
    });

    it('handles empty or null payloads deterministically', () => {
      expect(hashPayload(null)).toBe('empty_payload_hash');
      expect(hashPayload(undefined)).toBe('empty_payload_hash');
    });
  });

  // 2. Memory Store Lifecycle
  describe('2. Idempotency Store Lifecycle', () => {
    it('locks key during processing and completes with response body', async () => {
      const key = 'test_key_101';
      const hash = 'hash_abc';

      // 1. Lock key
      const locked = await memoryStore.startProcessing(key, hash, 'store_1');
      expect(locked).toBe(true);

      // Attempting to lock again must fail
      const lockAgain = await memoryStore.startProcessing(key, hash, 'store_1');
      expect(lockAgain).toBe(false);

      // 2. Complete with response
      await memoryStore.complete(key, 201, { orderId: 'ord_99' }, 'store_1', hash);

      // 3. Retrieve completed record
      const record = await memoryStore.get(key);
      expect(record).not.toBeNull();
      expect(record?.status).toBe(201);
      expect(record?.responseBody).toEqual({ orderId: 'ord_99' });
    });

    it('removes lock on failure allowing retry', async () => {
      const key = 'test_fail_key';
      await memoryStore.startProcessing(key, 'hash_123', 'store_1');

      await memoryStore.fail(key);
      expect(await memoryStore.get(key)).toBeNull();

      // Can lock again after failure
      const relock = await memoryStore.startProcessing(key, 'hash_123', 'store_1');
      expect(relock).toBe(true);
    });

    it('purges expired keys on cleanup', async () => {
      const expiredKey = 'expired_key';
      // Set expired key with 0 second TTL
      await memoryStore.startProcessing(expiredKey, 'hash', 'store_1', -10);
      await memoryStore.complete(expiredKey, 200, { ok: true }, 'store_1', 'hash');

      const purged = await memoryStore.cleanupExpired();
      expect(purged).toBeGreaterThanOrEqual(1);
      expect(await memoryStore.get(expiredKey)).toBeNull();
    });
  });

  // 3. executeIdempotent Execution Coordinator
  describe('3. executeIdempotent Execution Coordinator', () => {
    it('executes operation on first submission and returns isReplay: false', async () => {
      const operationSpy = vi.fn().mockResolvedValue({ id: 'order_fresh_1', amount: 250 });

      const result = await executeIdempotent(
        {
          key: 'order_idem_key_1',
          payload: { tableNo: 3, items: ['กะเพรา'] },
          operation: operationSpy,
        },
        memoryStore
      );

      expect(operationSpy).toHaveBeenCalledTimes(1);
      expect(result.isReplay).toBe(false);
      expect(result.data).toEqual({ id: 'order_fresh_1', amount: 250 });
    });

    it('replays cached response on duplicate submission without re-invoking operation', async () => {
      const operationSpy = vi.fn().mockResolvedValue({ id: 'order_fresh_1', amount: 250 });
      const idemKey = 'order_idem_key_replay';
      const payload = { tableNo: 3, items: ['กะเพรา'] };

      // 1st Call
      const res1 = await executeIdempotent(
        { key: idemKey, payload, operation: operationSpy },
        memoryStore
      );
      expect(res1.isReplay).toBe(false);

      // 2nd Call with same key and payload
      const res2 = await executeIdempotent(
        { key: idemKey, payload, operation: operationSpy },
        memoryStore
      );

      // Operation MUST NOT be called again
      expect(operationSpy).toHaveBeenCalledTimes(1);
      expect(res2.isReplay).toBe(true);
      expect(res2.data).toEqual({ id: 'order_fresh_1', amount: 250 });
    });

    it('rejects with IdempotencyKeyReusedError (409) if key is reused with modified payload', async () => {
      const idemKey = 'order_idem_key_conflict';
      const originalPayload = { tableNo: 3, total: 100 };
      const modifiedPayload = { tableNo: 3, total: 150 };

      // 1st Call
      await executeIdempotent(
        { key: idemKey, payload: originalPayload, operation: async () => ({ ok: true }) },
        memoryStore
      );

      // 2nd Call with SAME key but MODIFIED payload
      await expect(
        executeIdempotent(
          { key: idemKey, payload: modifiedPayload, operation: async () => ({ ok: true }) },
          memoryStore
        )
      ).rejects.toThrow(IdempotencyKeyReusedError);
    });

    it('rejects with IdempotencyConflictError if key is currently in-flight', async () => {
      const inFlightKey = 'concurrent_in_flight_key';
      const payload = { action: 'PAY' };

      // Lock as processing
      await memoryStore.startProcessing(inFlightKey, hashPayload(payload), 'store_1');

      // Attempting to execute with in-flight key
      await expect(
        executeIdempotent(
          { key: inFlightKey, payload, operation: async () => ({ paid: true }) },
          memoryStore
        )
      ).rejects.toThrow(IdempotencyConflictError);
    });

    it('releases lock if operation throws an error allowing future retries', async () => {
      const failingKey = 'failing_operation_key';
      const payload = { action: 'PAY_FAIL' };

      await expect(
        executeIdempotent(
          {
            key: failingKey,
            payload,
            operation: async () => {
              throw new Error('Database transaction deadlocked');
            },
          },
          memoryStore
        )
      ).rejects.toThrow('Database transaction deadlocked');

      // The key should now be unlocked
      expect(await memoryStore.get(failingKey)).toBeNull();

      // Subsequent retry should succeed
      const retryResult = await executeIdempotent(
        {
          key: failingKey,
          payload,
          operation: async () => ({ recovered: true }),
        },
        memoryStore
      );

      expect(retryResult.isReplay).toBe(false);
      expect(retryResult.data).toEqual({ recovered: true });
    });
  });

  // 4. withIdempotency Route Handler Wrapper
  describe('4. withIdempotency Route Handler Wrapper', () => {
    it('bypasses idempotency when Idempotency-Key header is absent', async () => {
      const handlerSpy = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
      const wrapped = withIdempotency(handlerSpy);

      const req = new Request('http://localhost:3000/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: 'ต้มยำ' }),
      });

      const res = await wrapped(req);
      expect(handlerSpy).toHaveBeenCalledTimes(1);
      expect(res.headers.get('X-Idempotent-Key')).toBeNull();
    });

    it('attaches X-Idempotent-Replay headers and returns cached payload on duplicate', async () => {
      let callCount = 0;
      const handler = async (req: Request) => {
        callCount++;
        const body = await req.json();
        return NextResponse.json({ id: 'ord_wrapped', body, callCount }, { status: 201 });
      };

      const wrapped = withIdempotency(handler, { customStore: memoryStore });
      const idemKey = `wrapped_idem_key_${Date.now()}`;

      // 1st Request
      const req1 = new Request('http://localhost:3000/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idemKey,
        },
        body: JSON.stringify({ item: 'ผัดซีอิ๊ว' }),
      });

      const res1 = await wrapped(req1);
      const data1 = await res1.json();

      expect(res1.status).toBe(201);
      expect(res1.headers.get('X-Idempotent-Replay')).toBe('false');
      expect(data1.callCount).toBe(1);

      // 2nd Request (Identical)
      const req2 = new Request('http://localhost:3000/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idemKey,
        },
        body: JSON.stringify({ item: 'ผัดซีอิ๊ว' }),
      });

      const res2 = await wrapped(req2);
      const data2 = await res2.json();

      expect(res2.status).toBe(201);
      expect(res2.headers.get('X-Idempotent-Replay')).toBe('true');
      expect(data2.callCount).toBe(1); // handler was NOT called again!

      // 3rd Request with modified body -> 409 idempotency_key_reused
      const req3 = new Request('http://localhost:3000/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idemKey,
        },
        body: JSON.stringify({ item: 'ข้าวผัดปู' }),
      });

      const res3 = await wrapped(req3);
      expect(res3.status).toBe(409);
      const data3 = await res3.json();
      expect(data3.code).toBe('idempotency_key_reused');
    });
  });

  // 5. Cleanup Job
  describe('5. Scheduled TTL Cleanup Job', () => {
    it('executes cleanupExpiredIdempotencyKeys returning purged count and duration', async () => {
      const result = await cleanupExpiredIdempotencyKeys(86400);

      expect(typeof result.purgedCount).toBe('number');
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
