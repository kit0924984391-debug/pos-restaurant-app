/**
 * REST API Design Standards & Specification Types
 * Follows REST API Design conventions:
 * - Resource naming (nouns, plural, hierarchical)
 * - HTTP Methods & Idempotency
 * - Predictable JSON envelopes (Single resource & Collection with links)
 * - Standard query parameters (filter, sort, page, limit, fields)
 */

export interface RestResourceData<T = Record<string, unknown>> {
  id: string | number;
  type: string;
  attributes: T;
}

export interface RestResourceMeta {
  requestId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface RestResourceResponse<T = Record<string, unknown>> {
  data: RestResourceData<T>;
  meta?: RestResourceMeta;
}

export interface RestPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RestLinks {
  self: string;
  first?: string;
  prev?: string | null;
  next?: string | null;
  last?: string;
}

export interface RestCollectionResponse<T = unknown> {
  data: T[];
  pagination: RestPagination;
  links: RestLinks;
  meta?: Record<string, unknown>;
}

export interface RestSortItem {
  field: string;
  order: 'asc' | 'desc';
}

export interface ParsedRestQueryParams {
  filter: Record<string, string>;
  sort: RestSortItem[];
  page: number;
  limit: number;
  fields?: string[];
}

export type RestHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RestEndpointMetadata {
  path: string;
  method: RestHttpMethod;
  resource: string;
  description: string;
  isIdempotent: boolean;
  successStatus: number;
  queryParameters?: string[];
}

export interface RestLintViolation {
  rule: 'RESOURCE_NAMING_VERB' | 'TRAILING_SLASH' | 'SINGULAR_NOUN' | 'METHOD_IDEMPOTENCY_MISMATCH' | 'STATUS_CODE_MISMATCH';
  message: string;
  path?: string;
  method?: string;
  suggestion: string;
}
