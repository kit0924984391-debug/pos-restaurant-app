import { RelayConnection, RelayEdge, RelayPageInfo } from './types';

/**
 * Base64 Opaque Cursor Encoding / Decoding (Relay Specification)
 */
export function encodeCursor(id: string | number): string {
  const str = String(id);
  if (typeof btoa === 'function') {
    return btoa(`cursor:${str}`);
  }
  return Buffer.from(`cursor:${str}`).toString('base64');
}

export function decodeCursor(cursor: string): string {
  let decoded: string;
  if (typeof atob === 'function') {
    decoded = atob(cursor);
  } else {
    decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  }
  return decoded.replace(/^cursor:/, '');
}

/**
 * Converts a list of items into a Relay-compliant Connection payload with edges and pageInfo
 */
export function toRelayConnection<T extends { id?: string | number }>(
  items: T[],
  totalCount: number,
  options: {
    first?: number;
    after?: string;
    getCursorId?: (item: T) => string | number;
  } = {}
): RelayConnection<T> {
  const getId = options.getCursorId || ((item: T) => (item.id !== undefined ? item.id : ''));

  let startIndex = 0;
  if (options.after) {
    const afterId = decodeCursor(options.after);
    const foundIndex = items.findIndex((item) => String(getId(item)) === afterId);
    if (foundIndex >= 0) {
      startIndex = foundIndex + 1;
    }
  }

  const requestedFirst = options.first || 20;
  const slicedItems = items.slice(startIndex, startIndex + requestedFirst);

  const edges: RelayEdge<T>[] = slicedItems.map((item) => ({
    cursor: encodeCursor(getId(item)),
    node: item,
  }));

  const startCursor = edges.length > 0 ? edges[0].cursor : null;
  const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

  const hasNextPage = startIndex + slicedItems.length < totalCount;
  const hasPreviousPage = startIndex > 0;

  const pageInfo: RelayPageInfo = {
    hasNextPage,
    hasPreviousPage,
    startCursor,
    endCursor,
  };

  return {
    edges,
    pageInfo,
    totalCount,
  };
}
