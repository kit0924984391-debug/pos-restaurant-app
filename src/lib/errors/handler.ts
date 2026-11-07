import { NextResponse } from 'next/server';
import { ApiError, generateRequestId } from './apiError';
import { logger } from '../logger';

export interface ErrorHandlerOptions {
  logErrors?: boolean;
  requestIdHeader?: string;
  onError?: (err: ApiError, req?: Request) => void;
}

/**
 * Global API Error Handler
 * Standardizes error responses, assigns/preserves Request IDs, and logs with appropriate severity.
 */
export function handleApiError(
  err: unknown,
  request?: Request,
  options: ErrorHandlerOptions = {}
): NextResponse {
  const { logErrors = true, requestIdHeader = 'x-request-id', onError } = options;

  // Extract or generate requestId
  const incomingReqId = request?.headers?.get(requestIdHeader) || request?.headers?.get('x-correlation-id');
  const requestId = incomingReqId || generateRequestId();

  // Standardize error into ApiError instance
  const apiError = ApiError.fromError(err, requestId);

  // Logging with appropriate severity
  if (logErrors) {
    const errorLogData = {
      code: apiError.code,
      status: apiError.status,
      message: apiError.message,
      requestId: apiError.requestId,
      path: request ? new URL(request.url).pathname : undefined,
      method: request?.method,
      details: apiError.details,
      timestamp: apiError.timestamp,
    };

    if (apiError.status >= 500) {
      logger.error(`[API_ERROR:5XX] ${apiError.message}`, err, errorLogData);
    } else if (apiError.status >= 400) {
      logger.warn(`[API_ERROR:4XX] ${apiError.message}`, errorLogData);
    }
  }

  if (onError) {
    try {
      onError(apiError, request);
    } catch {}
  }

  return apiError.toResponse();
}

/**
 * Higher-order function wrapping Next.js App Router handlers with standard error catching
 */
export function withApiErrorHandler<T extends (...args: any[]) => Promise<Response | NextResponse>>(
  handler: T,
  options: ErrorHandlerOptions = {}
): (...args: Parameters<T>) => Promise<Response | NextResponse> {
  return async (...args: Parameters<T>): Promise<Response | NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      const request = args[0] instanceof Request ? (args[0] as Request) : undefined;
      return handleApiError(err, request, options);
    }
  };
}
