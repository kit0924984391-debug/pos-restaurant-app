import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApiError,
  CircuitBreaker,
  CircuitBreakerOpenError,
  retryWithBackoff,
  handleApiError,
  withApiErrorHandler,
  generateRequestId,
} from '@/lib/errors';
import { apiError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/apiResponse';

describe('API Error Handling Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Standard Error Envelope & Response Format
  describe('1. Standard Error Response Format & Protocol', () => {
    it('creates standard error envelope conforming to the schema specification', () => {
      const err = new ApiError(
        'VALIDATION_ERROR',
        'Invalid request parameters',
        400,
        [{ field: 'email', message: 'Invalid email format' }],
        true,
        'req_test_abc123'
      );

      const envelope = err.toEnvelope();
      expect(envelope.error).toBeDefined();
      expect(envelope.error.code).toBe('VALIDATION_ERROR');
      expect(envelope.error.message).toBe('Invalid request parameters');
      expect(envelope.error.status).toBe(400);
      expect(envelope.error.requestId).toBe('req_test_abc123');
      expect(envelope.error.timestamp).toBeDefined();
      expect(envelope.error.details).toEqual([
        { field: 'email', message: 'Invalid email format' },
      ]);

      // Backward compatibility fields
      expect(envelope.code).toBe('VALIDATION_ERROR');
      expect(envelope.statusCode).toBe(400);
      expect(envelope.message).toBe('Invalid request parameters');
    });

    it('toResponse attaches X-Request-Id and Retry-After headers appropriately', async () => {
      const rateLimitErr = ApiError.tooManyRequests('Rate limit exceeded', 45);
      const res = rateLimitErr.toResponse();

      expect(res.status).toBe(429);
      expect(res.headers.get('X-Request-Id')).toBe(rateLimitErr.requestId);
      expect(res.headers.get('Retry-After')).toBe('45');

      const data = await res.json();
      expect(data.error.code).toBe('TOO_MANY_REQUESTS');
      expect(data.error.status).toBe(429);
    });

    it('generateRequestId generates valid unique request identifiers', () => {
      const reqId1 = generateRequestId();
      const reqId2 = generateRequestId();

      expect(reqId1.startsWith('req_')).toBe(true);
      expect(reqId2.startsWith('req_')).toBe(true);
      expect(reqId1).not.toBe(reqId2);
    });
  });

  // 2. ApiError Class & Factory Methods
  describe('2. ApiError Factory Methods & HTTP Status Codes', () => {
    it('ApiError.badRequest creates 400 error', () => {
      const err = ApiError.badRequest('Malformed request body', { field: 'name' });
      expect(err.status).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.details).toEqual({ field: 'name' });
    });

    it('ApiError.validationError creates 422 error', () => {
      const err = ApiError.validationError([{ field: 'price', message: 'Must be positive' }]);
      expect(err.status).toBe(422);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual([{ field: 'price', message: 'Must be positive' }]);
    });

    it('ApiError.unauthorized and ApiError.forbidden create 401 & 403 errors', () => {
      const unauth = ApiError.unauthorized();
      expect(unauth.status).toBe(401);
      expect(unauth.code).toBe('UNAUTHORIZED');

      const forbidden = ApiError.forbidden();
      expect(forbidden.status).toBe(403);
      expect(forbidden.code).toBe('FORBIDDEN');
    });

    it('ApiError.notFound creates 404 error with resource and identifier', () => {
      const err = ApiError.notFound('Menu Item', 'menu_123');
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toContain("Menu Item 'menu_123' not found");
      expect((err.details as any).resource).toBe('Menu Item');
      expect((err.details as any).identifier).toBe('menu_123');
    });

    it('ApiError.conflict and ApiError.serviceUnavailable create 409 & 503 errors', () => {
      const conflict = ApiError.conflict('Table number already occupied');
      expect(conflict.status).toBe(409);
      expect(conflict.code).toBe('CONFLICT');

      const unavailable = ApiError.serviceUnavailable('Database failover in progress', 15);
      expect(unavailable.status).toBe(503);
      expect(unavailable.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  // 3. Safe Error Transformation (fromError)
  describe('3. Safe Error Transformation (ApiError.fromError)', () => {
    it('transforms Zod validation issues into structured validation details', () => {
      const zodMockError = {
        issues: [
          { path: ['user', 'email'], message: 'Invalid email address', code: 'invalid_string' },
          { path: ['password'], message: 'Too short', code: 'too_small' },
        ],
      };

      const err = ApiError.fromError(zodMockError);
      expect(err.status).toBe(422);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(err.details)).toBe(true);
      expect((err.details as any[])[0].field).toBe('user.email');
    });

    it('transforms Prisma unique constraint error P2002 to 409 Conflict', () => {
      const prismaP2002 = {
        code: 'P2002',
        meta: { target: ['email'] },
      };

      const err = ApiError.fromError(prismaP2002);
      expect(err.status).toBe(409);
      expect(err.code).toBe('CONFLICT');
      expect(err.message).toContain('ข้อมูลซ้ำซ้อน');
    });

    it('transforms Prisma not found error P2025 to 404 Not Found', () => {
      const prismaP2025 = {
        code: 'P2025',
      };

      const err = ApiError.fromError(prismaP2025);
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });

    it('transforms SyntaxError into 400 Bad Request', () => {
      const syntaxErr = new SyntaxError('Unexpected token in JSON');
      const err = ApiError.fromError(syntaxErr);
      expect(err.status).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
    });
  });

  // 4. Circuit Breaker Pattern
  describe('4. Circuit Breaker Resilience Pattern', () => {
    it('executes normally when circuit is CLOSED', async () => {
      const breaker = new CircuitBreaker(3, 1000);
      const action = vi.fn().mockResolvedValue('success_data');

      const result = await breaker.call(action);
      expect(result).toBe('success_data');
      expect(breaker.failures).toBe(0);
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.isOpen()).toBe(false);
    });

    it('transitions to OPEN when failure threshold is reached and fast-fails', async () => {
      const breaker = new CircuitBreaker(2, 500);
      const failingAction = vi.fn().mockRejectedValue(new Error('Downstream service failed'));

      // 1st failure
      await expect(breaker.call(failingAction)).rejects.toThrow('Downstream service failed');
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.failures).toBe(1);

      // 2nd failure -> threshold reached
      await expect(breaker.call(failingAction)).rejects.toThrow('Downstream service failed');
      expect(breaker.getState()).toBe('OPEN');
      expect(breaker.isOpen()).toBe(true);

      // 3rd call must fast-fail with CircuitBreakerOpenError without calling downstream
      failingAction.mockClear();
      await expect(breaker.call(failingAction)).rejects.toThrow(CircuitBreakerOpenError);
      expect(failingAction).not.toHaveBeenCalled();
    });

    it('executes fallback function when circuit is OPEN if fallback is provided', async () => {
      const breaker = new CircuitBreaker(1, 1000);
      await expect(breaker.call(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      expect(breaker.isOpen()).toBe(true);

      // Call with fallback
      const fallbackResult = await breaker.call(
        () => Promise.resolve('primary'),
        () => 'fallback_cached_data'
      );
      expect(fallbackResult).toBe('fallback_cached_data');
    });

    it('recovers from HALF_OPEN to CLOSED upon successful trial call', async () => {
      const breaker = new CircuitBreaker(1, 50);
      await expect(breaker.call(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      expect(breaker.isOpen()).toBe(true);

      // Wait for breaker timeout to transition to HALF_OPEN
      await new Promise((r) => setTimeout(r, 60));
      expect(breaker.getState()).toBe('HALF_OPEN');

      // Successful trial call
      const recoveredResult = await breaker.call(() => Promise.resolve('recovered'));
      expect(recoveredResult).toBe('recovered');
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.failures).toBe(0);
    });
  });

  // 5. Retry with Exponential Backoff
  describe('5. Retry with Exponential Backoff', () => {
    it('resolves on transient failure retry within max attempts', async () => {
      let attempts = 0;
      const transientFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient network glitch');
        }
        return 'recovered_after_retry';
      });

      const result = await retryWithBackoff(transientFn, {
        maxRetries: 3,
        initialDelayMs: 10,
        jitter: false,
      });

      expect(result).toBe('recovered_after_retry');
      expect(attempts).toBe(3);
    });

    it('throws if maximum retries are exhausted', async () => {
      const persistentErrorFn = vi.fn().mockRejectedValue(new Error('Fatal DB Connection Error'));

      await expect(
        retryWithBackoff(persistentErrorFn, {
          maxRetries: 2,
          initialDelayMs: 10,
          jitter: false,
        })
      ).rejects.toThrow('Fatal DB Connection Error');

      expect(persistentErrorFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  // 6. Global Error Handler & Route Wrappers
  describe('6. Global Error Handler & Middleware Wrapper', () => {
    it('handleApiError preserves incoming X-Request-Id header and logs error', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const req = new Request('http://localhost:3000/api/test', {
        headers: { 'X-Request-Id': 'req_custom_client_id' },
      });

      const notFoundErr = ApiError.notFound('Customer Order', 'ord_888');
      const res = handleApiError(notFoundErr, req);

      expect(res.status).toBe(404);
      expect(res.headers.get('X-Request-Id')).toBe('req_custom_client_id');
      expect(warnSpy).toHaveBeenCalled();

      const data = await res.json();
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.requestId).toBe('req_custom_client_id');
    });

    it('withApiErrorHandler wraps route handlers and catches unexpected throws cleanly', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const buggyHandler = async () => {
        throw new Error('Unexpected database syntax fault');
      };

      const safeHandler = withApiErrorHandler(buggyHandler);
      const res = await (safeHandler as any)(new Request('http://localhost:3000/api/buggy'));

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.requestId).toBeDefined();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // 7. Backward Compatibility Verification
  describe('7. 100% Backward Compatibility with Existing apiResponse Utilities', () => {
    it('apiError maintains existing signature and compatibility fields', async () => {
      const res = apiError('INVALID_INPUT', 'ข้อมูลไม่ถูกต้อง', 422, { field: 'price' });
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.error).toBe('INVALID_INPUT');
      expect(data.message).toBe('ข้อมูลไม่ถูกต้อง');
      expect(data.statusCode).toBe(422);
      expect(data.details).toEqual({ field: 'price' });
      expect(data.timestamp).toBeDefined();
      expect(data.requestId).toBeDefined();
      expect(res.headers.get('X-Request-Id')).toBe(data.requestId);
    });

    it('apiNotFound, apiUnauthorized, apiForbidden retain existing behavior', async () => {
      const notFoundRes = apiNotFound('สินค้า', 'item_1');
      expect(notFoundRes.status).toBe(404);

      const unauthRes = apiUnauthorized();
      expect(unauthRes.status).toBe(401);

      const forbidRes = apiForbidden();
      expect(forbidRes.status).toBe(403);
    });
  });
});
