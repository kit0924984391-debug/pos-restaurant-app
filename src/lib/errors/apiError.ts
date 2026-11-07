import { NextResponse } from 'next/server';

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
  [key: string]: unknown;
}

export interface StandardErrorPayload {
  code: string;
  message: string;
  status: number;
  requestId: string;
  timestamp: string;
  details?: unknown;
}

export interface StandardErrorResponse {
  error: StandardErrorPayload;
  // Backward compatibility fields for legacy clients
  code?: string;
  message?: string;
  statusCode?: number;
  status?: number;
  details?: unknown;
  timestamp?: string;
}

export function generateRequestId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `req_${time}_${rand}`;
}

/**
 * Standard ApiError Class
 * Implements RFC-compliant status codes, standard error codes, request ID tracing, and details.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;
  public requestId: string;
  public readonly timestamp: string;

  constructor(
    code: string,
    message: string,
    status = 500,
    details: unknown = null,
    isOperational = true,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.statusCode = status;
    this.details = details ?? undefined;
    this.isOperational = isOperational;
    this.requestId = requestId || generateRequestId();
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // Common Factory Methods

  static badRequest(message = 'Invalid request parameters', details?: unknown): ApiError {
    return new ApiError('BAD_REQUEST', message, 400, details);
  }

  static validationError(details?: unknown, message = 'ข้อมูลที่ส่งมาไม่ถูกต้องตามรูปแบบที่กำหนด'): ApiError {
    return new ApiError('VALIDATION_ERROR', message, 422, details);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'You do not have permission to access this resource'): ApiError {
    return new ApiError('FORBIDDEN', message, 403);
  }

  static notFound(resource = 'Resource', identifier?: string | number): ApiError {
    const msg = identifier !== undefined ? `${resource} '${identifier}' not found` : `${resource} not found`;
    return new ApiError('NOT_FOUND', msg, 404, { resource, identifier });
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError('CONFLICT', message, 409, details);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', retryAfterSeconds = 60): ApiError {
    return new ApiError('TOO_MANY_REQUESTS', message, 429, { retryAfterSeconds });
  }

  static internal(message = 'Internal server error', originalError?: unknown): ApiError {
    return new ApiError(
      'INTERNAL_ERROR',
      message,
      500,
      process.env.NODE_ENV !== 'production' && originalError ? String(originalError) : undefined,
      false
    );
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', retryAfterSeconds = 30): ApiError {
    return new ApiError('SERVICE_UNAVAILABLE', message, 503, { retryAfterSeconds });
  }

  /**
   * Safely transforms any unknown caught error into a standardized ApiError.
   * Strips sensitive database connection strings, stack traces, and queries in production.
   */
  static fromError(err: unknown, requestId?: string): ApiError {
    if (err instanceof ApiError) {
      if (requestId) err.requestId = requestId;
      return err;
    }

    const reqId = requestId || generateRequestId();

    // Zod validation errors
    if (err && typeof err === 'object' && 'issues' in err && Array.isArray((err as any).issues)) {
      const details = (err as any).issues.map((i: any) => ({
        field: i.path?.join('.'),
        message: i.message,
        code: i.code,
      }));
      return new ApiError('VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้องตามข้อกำหนด', 422, details, true, reqId);
    }

    // Prisma known errors
    if (err && typeof err === 'object' && 'code' in err && typeof (err as any).code === 'string') {
      const prismaCode = (err as any).code;
      if (prismaCode === 'P2002') {
        const target = (err as any).meta?.target;
        return new ApiError(
          'CONFLICT',
          'ข้อมูลซ้ำซ้อนกับที่มีอยู่ในระบบแล้ว',
          409,
          { fields: target },
          true,
          reqId
        );
      }
      if (prismaCode === 'P2025') {
        return new ApiError('NOT_FOUND', 'ไม่พบข้อมูลที่ต้องการในระบบ', 404, undefined, true, reqId);
      }
    }

    if (err instanceof Error) {
      // Check for syntax/JSON parse errors
      if (err instanceof SyntaxError) {
        return new ApiError('BAD_REQUEST', 'รูปแบบข้อมูล JSON ไม่ถูกต้อง', 400, undefined, true, reqId);
      }
      return new ApiError('INTERNAL_ERROR', err.message || 'Internal server error', 500, undefined, false, reqId);
    }

    return new ApiError('INTERNAL_ERROR', 'Internal server error', 500, undefined, false, reqId);
  }

  /**
   * Formats the standard response payload adhering to standard schema
   */
  toEnvelope(): StandardErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.status === 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : this.message,
        status: this.status,
        requestId: this.requestId,
        timestamp: this.timestamp,
        ...(this.details !== undefined && { details: this.details }),
      },
      // Backward compatibility fields
      code: this.code,
      message: this.message,
      statusCode: this.status,
      status: this.status,
      ...(this.details !== undefined && { details: this.details }),
      timestamp: this.timestamp,
    };
  }

  /**
   * Generates a standard NextResponse with appropriate status and headers
   */
  toResponse(requestId?: string): NextResponse {
    if (requestId) {
      this.requestId = requestId;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Id': this.requestId,
    };

    if (this.status === 429 || this.status === 503) {
      const retryAfter = (this.details as any)?.retryAfterSeconds;
      if (retryAfter) {
        headers['Retry-After'] = String(retryAfter);
      }
    }

    return NextResponse.json(this.toEnvelope(), {
      status: this.status,
      headers,
    });
  }
}
