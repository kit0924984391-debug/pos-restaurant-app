import { ParsedRestQueryParams, RestSortItem } from './types';

/**
 * Standard REST API Query Parameter Parser
 * Parses filtering, multi-field sorting, pagination, and sparse fieldsets
 */
export function parseRestQueryParams(
  urlOrSearch: string | URL | Request,
  options: { defaultLimit?: number; maxLimit?: number } = {}
): ParsedRestQueryParams {
  const defaultLimit = options.defaultLimit || 20;
  const maxLimit = options.maxLimit || 100;

  let searchParams: URLSearchParams;
  if (typeof urlOrSearch === 'string') {
    const qIndex = urlOrSearch.indexOf('?');
    searchParams = new URLSearchParams(qIndex >= 0 ? urlOrSearch.slice(qIndex + 1) : urlOrSearch);
  } else if (urlOrSearch instanceof URL) {
    searchParams = urlOrSearch.searchParams;
  } else if ('url' in urlOrSearch && typeof urlOrSearch.url === 'string') {
    const u = new URL(urlOrSearch.url);
    searchParams = u.searchParams;
  } else {
    searchParams = new URLSearchParams();
  }

  // 1. Pagination: page & limit
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;

  // 2. Sorting: ?sort=-price,name
  const sort: RestSortItem[] = [];
  const rawSort = searchParams.get('sort');
  if (rawSort) {
    const parts = rawSort.split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.startsWith('-')) {
        sort.push({ field: part.slice(1), order: 'desc' });
      } else if (part.startsWith('+')) {
        sort.push({ field: part.slice(1), order: 'asc' });
      } else {
        sort.push({ field: part, order: 'asc' });
      }
    }
  }

  // 3. Field selection: ?fields=id,name,price
  let fields: string[] | undefined;
  const rawFields = searchParams.get('fields');
  if (rawFields) {
    fields = rawFields.split(',').map((f) => f.trim()).filter(Boolean);
  }

  // 4. Filtering: remaining query parameters
  const reservedKeys = new Set(['page', 'limit', 'sort', 'fields']);
  const filter: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (!reservedKeys.has(key)) {
      filter[key] = value;
    }
  });

  return {
    filter,
    sort,
    page,
    limit,
    fields,
  };
}
