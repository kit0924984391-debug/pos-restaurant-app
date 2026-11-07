import { ApiError } from '@/lib/errors';
import { hashPayload } from './hasher';
import { getIdempotencyStore, IIdempotencyStore } from './store';
import { IdempotentOptions, IdempotentExecutionResult } from './types';

export class IdempotencyKeyReusedError extends ApiError {
  constructor(message = 'Idempotency key reused with different request payload') {
    super('idempotency_key_reused', message, 409, { error: message }, true);
    this.name = 'IdempotencyKeyReusedError';
  }
}

export class IdempotencyConflictError extends ApiError {
  constructor(message = 'Request already processing - retry later') {
    super('request_in_progress', message, 409, { error: message }, true);
    this.name = 'IdempotencyConflictError';
  }
}

/**
 * Executes an operation with strict idempotency semantics:
 * 1. Returns cached result on duplicate submission with matching hash
 * 2. Rejects request with 409 if key was reused with different payload
 * 3. Prevents race conditions with concurrent identical keys (in-flight lock)
 * 4. Cleans up lock on operation failure
 */
export async function executeIdempotent<T = any>(
  options: IdempotentOptions<T>,
  customStore?: IIdempotencyStore
): Promise<IdempotentExecutionResult<T>> {
  const { key, storeId = 'global', payload, ttlSeconds, operation } = options;

  // If no idempotency key was supplied, execute normally without idempotency guarantees
  if (!key || typeof key !== 'string' || key.trim() === '') {
    const res = await operation();
    const data = res && typeof res === 'object' && 'data' in res ? (res as any).data : res;
    const statusCode =
      res && typeof res === 'object' && 'status' in res && typeof (res as any).status === 'number'
        ? (res as any).status
        : 200;
    return { data, statusCode, isReplay: false };
  }

  const cleanKey = key.trim();
  const payloadHash = hashPayload(payload);
  const store = customStore || getIdempotencyStore();

  // 1. Check existing record
  const existing = await store.get(cleanKey);

  if (existing) {
    // A) Key reused with DIFFERENT payload hash
    if (existing.payloadHash && existing.payloadHash !== payloadHash) {
      throw new IdempotencyKeyReusedError(
        'รหัสคำขอซ้ำถูกใช้กับข้อมูลอื่น (idempotency key reused with different payload)'
      );
    }

    // B) Request still processing in another worker/isolate
    if (existing.status === 102 || existing.status === 'processing') {
      throw new IdempotencyConflictError('Request already processing - retry later');
    }

    // C) Request completed previously -> Idempotent Replay
    const cachedData = existing.responseBody !== undefined ? existing.responseBody : existing.body ? JSON.parse(existing.body) : null;
    const cachedStatus = existing.responseStatus || (typeof existing.status === 'number' && existing.status !== 102 ? existing.status : 200);

    return {
      data: cachedData,
      statusCode: cachedStatus,
      isReplay: true,
      key: cleanKey,
    };
  }

  // 2. Lock key with processing status
  const locked = await store.startProcessing(cleanKey, payloadHash, storeId, ttlSeconds);
  if (!locked) {
    // Another concurrent request locked it in the split second
    throw new IdempotencyConflictError('Request already processing - retry later');
  }

  // 3. Execute the operation
  try {
    const rawResult = await operation();
    const data =
      rawResult && typeof rawResult === 'object' && 'data' in rawResult
        ? (rawResult as any).data
        : rawResult;
    const statusCode =
      rawResult &&
      typeof rawResult === 'object' &&
      'status' in rawResult &&
      typeof (rawResult as any).status === 'number'
        ? (rawResult as any).status
        : 200;

    // 4. Mark completed with response
    await store.complete(cleanKey, statusCode, data, storeId, payloadHash);

    return {
      data,
      statusCode,
      isReplay: false,
      key: cleanKey,
    };
  } catch (error) {
    // Release the processing lock on failure so subsequent attempts may retry
    await store.fail(cleanKey);
    throw error;
  }
}
