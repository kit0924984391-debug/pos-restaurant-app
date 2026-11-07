/**
 * API Design Principles - Core Types & Contracts
 * Covers REST Resource-Oriented Architecture, HATEOAS, API Versioning,
 * and GraphQL Schema-First / Relay-Spec Cursor Pagination Patterns.
 */

export type ApiVersionStrategy = 'URL' | 'HEADER' | 'QUERY_PARAM';

export interface ApiVersionInfo {
  version: string;
  strategy: ApiVersionStrategy;
  isDeprecated?: boolean;
  sunsetDate?: string;
}

export interface HateoasLink {
  href: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description?: string;
}

export type HateoasResource<T> = T & {
  _links: Record<string, HateoasLink>;
};

export interface RelayPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface RelayEdge<T> {
  cursor: string;
  node: T;
}

export interface RelayConnection<T> {
  edges: RelayEdge<T>[];
  pageInfo: RelayPageInfo;
  totalCount: number;
}
