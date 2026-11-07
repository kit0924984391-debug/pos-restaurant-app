import { NextResponse } from 'next/server';
import { generateRequestId } from './errors/apiError';

export * from './errors';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiStandardError {
  error: string;
  code?: string;
  message: string;
  statusCode: number;
  details?: unknown;
  requestId?: string;
  timestamp: string;
}

/**
 * Standard REST API Response Utilities
 * Designed according to API Design Principles:
 * - Proper HTTP status codes
 * - Consistent collection pagination
 * - Predictable error structures
 * - Backward compatibility with existing Next.js clients
 */

/**
 * 200 OK: Standard successful response
 */
export function apiSuccess<T extends object | unknown[]>(
  data: T,
  status = 200,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * 201 Created: Successful resource creation
 */
export function apiCreated<T extends object>(
  data: T,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(data, {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * 200 OK: Paginated collection response
 * Automatically calculates totalPages, hasNext, and hasPrev
 */
export function apiPaginated<T>(
  items: T[],
  pagination: { page: number; limit: number; total: number },
  extraFields: Record<string, unknown> = {}
): NextResponse {
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const total = Math.max(0, pagination.total);
  const totalPages = Math.ceil(total / limit) || 1;

  const meta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return NextResponse.json({
    items,
    pagination: meta,
    ...extraFields,
  });
}

/**
 * Standardized Client/Server Error Response
 */
export function apiError(
  error: string,
  message?: string,
  statusCode = 400,
  details?: unknown,
  code?: string,
  requestId?: string
): NextResponse {
  const reqId = requestId || generateRequestId();
  const payload: ApiStandardError = {
    error,
    code: code || error,
    message: message || error,
    statusCode,
    ...(details !== undefined && { details }),
    requestId: reqId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    status: statusCode,
    headers: {
      'X-Request-Id': reqId,
    },
  });
}

/**
 * 404 Not Found helper
 */
export function apiNotFound(resource: string, identifier?: string | number): NextResponse {
  return apiError(
    'NOT_FOUND',
    `ไม่พบ${resource}${identifier ? ` (ID/Slug: ${identifier})` : ''}`,
    404,
    { resource, identifier },
    'NOT_FOUND'
  );
}

/**
 * 401 Unauthorized helper
 */
export function apiUnauthorized(message = 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'): NextResponse {
  return apiError('UNAUTHORIZED', message, 401, undefined, 'UNAUTHORIZED');
}

/**
 * 403 Forbidden helper
 */
export function apiForbidden(message = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้'): NextResponse {
  return apiError('FORBIDDEN', message, 403, undefined, 'FORBIDDEN');
}

/**
 * 409 Conflict helper
 */
export function apiConflict(message: string, details?: unknown): NextResponse {
  return apiError('CONFLICT', message, 409, details, 'CONFLICT');
}

/**
 * 422 Unprocessable Entity / Validation Error helper
 * Used at system boundaries when client payload fails schema validation
 */
export function apiValidationError(
  details: unknown,
  message = 'ข้อมูลที่ส่งมาไม่ถูกต้องตามข้อกำหนดของระบบ (Validation Failed)'
): NextResponse {
  return apiError('VALIDATION_ERROR', message, 422, details, 'VALIDATION_ERROR');
}

/**
 * 204 No Content helper
 * Used for successful DELETE or actions that return no response body
 */
export function apiNoContent(headers?: HeadersInit): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

/**
 * 400 Bad Request helper
 */
export function apiBadRequest(message = 'คำขอไม่ถูกต้อง (Bad Request)', details?: unknown): NextResponse {
  return apiError('BAD_REQUEST', message, 400, details, 'BAD_REQUEST');
}

/**
 * 429 Too Many Requests helper
 * Includes optional Retry-After header
 */
export function apiTooManyRequests(
  message = 'คำขอมากเกินไป กรุณารอสักครู่ (Too Many Requests)',
  retryAfterSeconds?: number
): NextResponse {
  const res = apiError('TOO_MANY_REQUESTS', message, 429, retryAfterSeconds ? { retryAfterSeconds } : undefined, 'TOO_MANY_REQUESTS');
  if (retryAfterSeconds !== undefined) {
    res.headers.set('Retry-After', String(retryAfterSeconds));
  }
  return res;
}

/**
 * 500 Internal Server Error helper
 * Prevents implementation detail leaks in production
 */
export function apiInternalError(
  message = 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง'
): NextResponse {
  return apiError('INTERNAL_SERVER_ERROR', message, 500, undefined, 'INTERNAL_SERVER_ERROR');
}


