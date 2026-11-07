import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Logger,
  logger,
  sanitizeLogData,
  runWithLogContext,
  getLogContext,
  setLogContextProperty,
  withRequestLogger,
  type StructuredLogEntry,
} from '@/lib/logger';
import { handleApiError, ApiError } from '@/lib/errors';
import { NextResponse } from 'next/server';

describe('Logging Best Practices Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. PII and Credential Sanitization
  describe('1. PII & Credential Sanitization (sanitizeLogData)', () => {
    it('redacts sensitive fields like passwords, tokens, API keys, and auth headers', () => {
      const rawPayload = {
        username: 'somchai_staff',
        password: 'SuperSecretPassword123!',
        userToken: 'eyJh...jwt_token_payload...xyz',
        apiKey: 'test-api-key-value',
        secretKey: 'topsecret-vault-key',
        authorization: 'Bearer secret_access_token',
        cookie: 'session_id=abcdef1234567890',
        creditCard: '4111222233334444',
        cvv: '123',
        bankAccountNo: '123-4-56789-0',
        promptPayId: '0812345678',
      };

      const sanitized = sanitizeLogData(rawPayload);

      expect(sanitized.username).toBe('somchai_staff');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.userToken).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.secretKey).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.cookie).toBe('[REDACTED]');
      expect(sanitized.creditCard).toBe('[REDACTED]');
      expect(sanitized.cvv).toBe('[REDACTED]');
      expect(sanitized.bankAccountNo).toBe('[REDACTED]');
      expect(sanitized.promptPayId).toBe('[REDACTED]');
    });

    it('masks email addresses and phone numbers accurately in string values', () => {
      const input = {
        managerEmail: 'somchai.restaurant@gmail.com',
        shortEmail: 'me@pos.com',
        phoneNumber: '089-123-4567',
        compactPhone: '0812345678',
        safeNotes: 'Table 4 requested extra spicy basil chicken with fried egg',
      };

      const sanitized = sanitizeLogData(input);

      expect(sanitized.managerEmail).toBe('so***@gmail.com');
      expect(sanitized.shortEmail).toBe('me***@pos.com');
      expect(sanitized.phoneNumber).toBe('089-***-4567');
      expect(sanitized.compactPhone).toBe('081-***-5678');
      expect(sanitized.safeNotes).toBe('Table 4 requested extra spicy basil chicken with fried egg');
    });

    it('handles nested objects, arrays, and prevents infinite loops on circular references', () => {
      const parent: any = {
        name: 'Order #101',
        items: [
          { name: 'Krapao Pork', price: 60 },
          { name: 'Iced Milk Tea', price: 30, discountToken: 'SECRET_VOUCHER_100' },
        ],
      };
      parent.selfRef = parent;

      const sanitized = sanitizeLogData(parent);

      expect(sanitized.name).toBe('Order #101');
      expect(sanitized.items[0].name).toBe('Krapao Pork');
      expect(sanitized.items[1].discountToken).toBe('[REDACTED]');
      expect(sanitized.selfRef).toBe('[CIRCULAR]');
    });

    it('preserves primitive values (null, undefined, numbers, booleans)', () => {
      expect(sanitizeLogData(null)).toBeNull();
      expect(sanitizeLogData(undefined)).toBeUndefined();
      expect(sanitizeLogData(12345)).toBe(12345);
      expect(sanitizeLogData(true)).toBe(true);
      expect(sanitizeLogData(false)).toBe(false);
    });
  });

  // 2. Context Propagation & Async Tracking
  describe('2. Request Context Propagation (AsyncLocalStorage)', () => {
    it('propagates context through asynchronous operations with runWithLogContext', async () => {
      const initialCtx = getLogContext();
      expect(initialCtx).toBeUndefined();

      await runWithLogContext({ requestId: 'req_async_001', userId: 'user_42', role: 'admin' }, async () => {
        const currentCtx = getLogContext();
        expect(currentCtx?.requestId).toBe('req_async_001');
        expect(currentCtx?.userId).toBe('user_42');
        expect(currentCtx?.role).toBe('admin');

        setLogContextProperty('tableNo', 8);
        const updatedCtx = getLogContext();
        expect(updatedCtx?.tableNo).toBe(8);
      });

      // Scope has terminated
      expect(getLogContext()).toBeUndefined();
    });

    it('merges nested context scopes properly', async () => {
      await runWithLogContext({ requestId: 'outer_req' }, async () => {
        expect(getLogContext()?.requestId).toBe('outer_req');

        await runWithLogContext({ subAction: 'calculate_discount' }, async () => {
          const nested = getLogContext();
          expect(nested?.requestId).toBe('outer_req');
          expect(nested?.subAction).toBe('calculate_discount');
        });

        // Restores outer context
        expect(getLogContext()?.requestId).toBe('outer_req');
        expect(getLogContext()?.subAction).toBeUndefined();
      });
    });
  });

  // 3. Structured Logger Core & Priority Filtering
  describe('3. Structured Logger Core & Level Filtering', () => {
    it('generates standard structured log entry adhering to specifications', () => {
      const customLogger = new Logger({
        service: 'pos-kitchen-display',
        environment: 'staging',
        minLevel: 'debug',
      });

      const entry = customLogger.formatEntry('info', 'Kitchen ticket printed', { orderId: 88, table: 3 });

      expect(entry.service).toBe('pos-kitchen-display');
      expect(entry.environment).toBe('staging');
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('Kitchen ticket printed');
      expect(entry.timestamp).toBeDefined();
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
      expect(entry.metadata).toEqual({ orderId: 88, table: 3 });
    });

    it('respects log level priorities and suppresses lower levels', () => {
      const capturedEntries: StructuredLogEntry[] = [];
      const testLogger = new Logger({
        minLevel: 'warn',
        transports: [(entry) => { capturedEntries.push(entry); }],
        silent: false,
      });

      testLogger.debug('This debug log should be suppressed');
      testLogger.info('This info log should be suppressed');
      expect(capturedEntries.length).toBe(0);

      testLogger.warn('Warning: Low inventory on basil');
      testLogger.error('Error: Printer disconnected');
      testLogger.fatal('Fatal: Database connection lost');

      expect(capturedEntries.length).toBe(3);
      expect(capturedEntries[0].level).toBe('warn');
      expect(capturedEntries[1].level).toBe('error');
      expect(capturedEntries[2].level).toBe('fatal');
    });

    it('silent mode suppresses all logs including errors', () => {
      const transportMock = vi.fn();
      const silentLogger = new Logger({
        silent: true,
        transports: [transportMock],
      });

      silentLogger.fatal('Critical failure');
      expect(transportMock).not.toHaveBeenCalled();
    });

    it('child logger inherits parent settings and combines child bindings', () => {
      const capturedEntries: StructuredLogEntry[] = [];
      const parentLogger = new Logger({
        service: 'pos-main',
        bindings: { appVersion: '2.4.0' },
        transports: [(entry) => { capturedEntries.push(entry); }],
      });

      const orderLogger = parentLogger.child({ orderId: 999, cashier: 'Nong Som' });
      orderLogger.info('Payment received');

      expect(capturedEntries.length).toBe(1);
      const entry = capturedEntries[0];
      expect(entry.context?.appVersion).toBe('2.4.0');
      expect(entry.context?.orderId).toBe(999);
      expect(entry.context?.cashier).toBe('Nong Som');
    });

    it('captures stack traces for error and fatal levels, but omits for info and warn', () => {
      const testLogger = new Logger({ minLevel: 'debug' });
      const sampleErr = new Error('Database pool exhausted');

      const infoEntry = testLogger.formatEntry('info', 'Server started');
      expect(infoEntry.error).toBeUndefined();

      const errorEntry = testLogger.formatEntry('error', 'Query timeout', undefined, sampleErr);
      expect(errorEntry.error?.name).toBe('Error');
      expect(errorEntry.error?.message).toBe('Database pool exhausted');
      expect(errorEntry.error?.stack).toBeDefined();

      const fatalEntry = testLogger.formatEntry('fatal', 'System crash', undefined, sampleErr);
      expect(fatalEntry.error?.stack).toBeDefined();
    });

    it('emits single-line JSON string in production environment', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const prodLogger = new Logger({
        environment: 'production',
        minLevel: 'info',
      });

      prodLogger.info('Shift started for cashier #1', { cashierId: 1 });

      expect(consoleLogSpy).toHaveBeenCalled();
      const emittedArg = consoleLogSpy.mock.calls[0][0];
      expect(typeof emittedArg).toBe('string');
      const parsed = JSON.parse(emittedArg);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Shift started for cashier #1');
      expect(parsed.environment).toBe('production');
      expect(parsed.metadata?.cashierId).toBe(1);
    });
  });

  // 4. Request Logging Middleware (withRequestLogger)
  describe('4. Request Logging Middleware (withRequestLogger)', () => {
    it('logs request completion with status, duration, and sets X-Request-Id header', async () => {
      const capturedEntries: StructuredLogEntry[] = [];
      const testLogger = new Logger({
        minLevel: 'info',
        transports: [(entry) => { capturedEntries.push(entry); }],
      });

      const mockHandler = async (req: Request) => {
        // Small delay to simulate work
        await new Promise((r) => setTimeout(r, 10));
        return NextResponse.json({ success: true, tableId: 5 });
      };

      const wrappedHandler = withRequestLogger(mockHandler, { logger: testLogger });
      const req = new Request('https://pos.local/api/orders', {
        method: 'POST',
        headers: { 'X-Request-Id': 'req_custom_trace_123' },
      });

      const response = await wrappedHandler(req);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Request-Id')).toBe('req_custom_trace_123');

      // Check captured log entries
      expect(capturedEntries.length).toBeGreaterThanOrEqual(1);
      const completionLog = capturedEntries.find((e) => e.message.includes('HTTP Request Completed'));
      expect(completionLog).toBeDefined();
      expect(completionLog?.metadata?.method).toBe('POST');
      expect(completionLog?.metadata?.path).toBe('/api/orders');
      expect(completionLog?.metadata?.statusCode).toBe(200);
      expect(typeof completionLog?.metadata?.durationMs).toBe('number');
      expect(completionLog?.metadata?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('catches unhandled exceptions in route handlers, logs error with duration, and rethrows', async () => {
      const capturedEntries: StructuredLogEntry[] = [];
      const testLogger = new Logger({
        minLevel: 'debug',
        transports: [(entry) => { capturedEntries.push(entry); }],
      });

      const failingHandler = async (_req: Request) => {
        throw new Error('Database transaction deadlocked');
      };

      const wrappedHandler = withRequestLogger(failingHandler, { logger: testLogger });
      const req = new Request('https://pos.local/api/pay', { method: 'POST' });

      await expect(wrappedHandler(req)).rejects.toThrow('Database transaction deadlocked');

      const errorLog = capturedEntries.find((e) => e.message.includes('HTTP Request Failed'));
      expect(errorLog).toBeDefined();
      expect(errorLog?.level).toBe('error');
      expect(errorLog?.error?.message).toBe('Database transaction deadlocked');
      expect(errorLog?.metadata?.method).toBe('POST');
      expect(errorLog?.metadata?.path).toBe('/api/pay');
      expect(typeof errorLog?.metadata?.durationMs).toBe('number');
    });
  });

  // 5. Integration with Global API Error Handler
  describe('5. Integration with handleApiError', () => {
    it('handleApiError emits structured warn for 4xx client errors and error for 5xx server errors', () => {
      const warnSpy = vi.spyOn(logger, 'warn');
      const errorSpy = vi.spyOn(logger, 'error');

      // Test 400 Client Error
      const badReq = ApiError.badRequest('Missing menu item ID');
      const req400 = new Request('https://pos.local/api/items', { method: 'GET' });
      const res400 = handleApiError(badReq, req400);

      expect(res400.status).toBe(400);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API_ERROR:4XX] Missing menu item ID'),
        expect.objectContaining({
          code: 'BAD_REQUEST',
          status: 400,
        })
      );

      // Test 500 Server Error
      const internalErr = new Error('D1 storage read failure');
      const req500 = new Request('https://pos.local/api/sync', { method: 'POST' });
      const res500 = handleApiError(internalErr, req500);

      expect(res500.status).toBe(500);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API_ERROR:5XX]'),
        internalErr,
        expect.objectContaining({
          code: 'INTERNAL_ERROR',
          status: 500,
        })
      );
    });
  });
});
