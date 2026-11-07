import { NextResponse } from 'next/server';
import { generateRequestId } from '../errors/apiError';
import {
  RestResourceData,
  RestResourceResponse,
  RestCollectionResponse,
  RestPagination,
  RestLinks,
} from './types';

/**
 * REST API Standard Response Builders
 * Enforces RESTful payload specifications, JSON:API style envelopes, and correct HTTP status codes.
 */

/**
 * 200 OK / 201 Created: Single resource envelope
 */
export function restResource<T extends Record<string, unknown>>(
  resource: RestResourceData<T>,
  status = 200,
  metaExtra: Record<string, unknown> = {},
  headers?: HeadersInit
): NextResponse {
  const reqId = generateRequestId();
  const payload: RestResourceResponse<T> = {
    data: resource,
    meta: {
      requestId: reqId,
      timestamp: new Date().toISOString(),
      ...metaExtra,
    },
  };

  return NextResponse.json(payload, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': reqId,
      ...headers,
    },
  });
}

/**
 * 201 Created: New resource created via POST
 */
export function restCreated<T extends Record<string, unknown>>(
  resource: RestResourceData<T>,
  metaExtra: Record<string, unknown> = {},
  headers?: HeadersInit
): NextResponse {
  return restResource(resource, 201, metaExtra, headers);
}

/**
 * 204 No Content: Successful DELETE or action returning no body
 */
export function restNoContent(headers?: HeadersInit): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

/**
 * 200 OK: Collection response with pagination and hypermedia navigation links
 */
export function restCollection<T>(
  items: T[],
  paginationOptions: {
    page: number;
    limit: number;
    total: number;
    baseUrl?: string;
  },
  extraQueryParams: Record<string, string | number> = {},
  metaExtra: Record<string, unknown> = {},
  headers?: HeadersInit
): NextResponse {
  const page = Math.max(1, paginationOptions.page);
  const limit = Math.max(1, paginationOptions.limit);
  const total = Math.max(0, paginationOptions.total);
  const totalPages = Math.ceil(total / limit) || 1;

  const pagination: RestPagination = {
    page,
    limit,
    total,
    totalPages,
  };

  const baseUrl = paginationOptions.baseUrl || '/api/resources';

  const buildUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set('page', String(targetPage));
    params.set('limit', String(limit));
    for (const [key, val] of Object.entries(extraQueryParams)) {
      if (key !== 'page' && key !== 'limit') {
        params.set(key, String(val));
      }
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const links: RestLinks = {
    self: buildUrl(page),
    first: buildUrl(1),
    prev: page > 1 ? buildUrl(page - 1) : null,
    next: page < totalPages ? buildUrl(page + 1) : null,
    last: buildUrl(totalPages),
  };

  const payload: RestCollectionResponse<T> = {
    data: items,
    pagination,
    links,
    meta: {
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
      ...metaExtra,
    },
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
