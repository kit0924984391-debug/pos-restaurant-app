import { NextResponse } from 'next/server';
import { logger as defaultLogger, Logger } from './logger';
import { runWithLogContext } from './context';
import { generateRequestId } from '@/lib/errors/apiError';

export interface RequestLoggerOptions {
  service?: string;
  ignorePaths?: (string | RegExp)[];
  logger?: Logger;
  attachRequestIdHeader?: boolean;
}

/**
 * Higher-order Route Handler wrapper for automatic request/response structured logging
 */
export function withRequestLogger<T extends (...args: any[]) => Promise<Response | NextResponse>>(
  handler: T,
  options: RequestLoggerOptions = {}
): (...args: Parameters<T>) => Promise<Response | NextResponse> {
  const { ignorePaths = [/^\/api\/health/], logger = defaultLogger, attachRequestIdHeader = true } = options;

  return async (...args: Parameters<T>): Promise<Response | NextResponse> => {
    const request = args[0] instanceof Request ? (args[0] as Request) : undefined;
    if (!request) {
      return handler(...args);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Skip noisy health probes if configured
    const shouldIgnore = ignorePaths.some((pattern) =>
      typeof pattern === 'string' ? pattern === path : pattern.test(path)
    );

    const requestId =
      request.headers.get('x-request-id') ||
      request.headers.get('x-correlation-id') ||
      generateRequestId();

    const context = {
      requestId,
      method: request.method,
      path,
      ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || undefined,
    };

    return runWithLogContext(context, async () => {
      const start = Date.now();

      if (!shouldIgnore) {
        logger.info(`HTTP ${request.method} ${path}`, {
          requestId,
          path,
          method: request.method,
        });
      }

      try {
        const response = await handler(...args);
        const durationMs = Date.now() - start;
        const status = response.status;

        if (attachRequestIdHeader && !response.headers.has('x-request-id')) {
          try {
            response.headers.set('X-Request-Id', requestId);
          } catch {
            // Some responses might have immutable headers, ignore
          }
        }

        if (!shouldIgnore) {
          const logPayload = {
            requestId,
            path,
            method: request.method,
            statusCode: status,
            status,
            durationMs,
          };

          if (status >= 500) {
            logger.error(`HTTP Request Failed: ${request.method} ${path} -> ${status} (${durationMs}ms)`, logPayload);
          } else if (status >= 400) {
            logger.warn(`HTTP Request Client Error: ${request.method} ${path} -> ${status} (${durationMs}ms)`, logPayload);
          } else {
            logger.info(`HTTP Request Completed: ${request.method} ${path} -> ${status} (${durationMs}ms)`, logPayload);
          }
        }

        return response;
      } catch (error: any) {
        const durationMs = Date.now() - start;
        logger.error(`HTTP Request Failed: ${request.method} ${path} -> 500 (${durationMs}ms) [UNHANDLED]`, error, {
          requestId,
          path,
          method: request.method,
          durationMs,
        });
        throw error;
      }
    });
  };
}
