import { describe, it, expect } from 'vitest';
import {
  apiSuccess,
  apiCreated,
  apiPaginated,
  apiError,
  apiNotFound,
  apiUnauthorized,
  apiForbidden,
  apiConflict,
} from '@/lib/apiResponse';
import {
  ApiVersionNegotiator,
  HateoasLinkBuilders,
  encodeCursor,
  decodeCursor,
  toRelayConnection,
  SimpleDataLoader,
} from '@/lib/api-principles';

describe('API Design Principles Response Utility Suite', () => {
  it('1. apiSuccess returns 200 OK with expected JSON payload and headers', async () => {
    const res = apiSuccess({ store: 'ร้านตามสั่งลุงภา', status: 'OPEN' });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(data.store).toBe('ร้านตามสั่งลุงภา');
  });

  it('2. apiCreated returns 201 Created for new resource generation', async () => {
    const res = apiCreated({ id: 'order_123', totalAmount: 180 });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe('order_123');
    expect(data.totalAmount).toBe(180);
  });

  it('3. apiPaginated computes pagination metadata (pages, hasNext, hasPrev) correctly', async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const res = apiPaginated(items, { page: 1, limit: 10, total: 25 }, { extraKey: 'extraVal' });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items.length).toBe(3);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.total).toBe(25);
    expect(data.pagination.totalPages).toBe(3);
    expect(data.pagination.hasNext).toBe(true);
    expect(data.pagination.hasPrev).toBe(false);
    expect(data.extraKey).toBe('extraVal');
  });

  it('4. apiPaginated sets hasNext: false on final page', async () => {
    const res = apiPaginated([], { page: 3, limit: 10, total: 25 });
    const data = await res.json();

    expect(data.pagination.page).toBe(3);
    expect(data.pagination.totalPages).toBe(3);
    expect(data.pagination.hasNext).toBe(false);
    expect(data.pagination.hasPrev).toBe(true);
  });

  it('5. apiError formats structured errors with status and ISO timestamp', async () => {
    const res = apiError('INVALID_INPUT', 'ข้อมูลไม่ถูกต้อง', 422, { field: 'price' });
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error).toBe('INVALID_INPUT');
    expect(data.message).toBe('ข้อมูลไม่ถูกต้อง');
    expect(data.statusCode).toBe(422);
    expect(data.details).toEqual({ field: 'price' });
    expect(data.timestamp).toBeDefined();
  });

  it('6. apiNotFound, apiUnauthorized, apiForbidden, apiConflict return correct HTTP status codes', async () => {
    const notFoundRes = apiNotFound('เมนูอาหาร', 'menu_999');
    expect(notFoundRes.status).toBe(404);
    const notFoundData = await notFoundRes.json();
    expect(notFoundData.error).toBe('NOT_FOUND');

    const unauthRes = apiUnauthorized();
    expect(unauthRes.status).toBe(401);

    const forbidRes = apiForbidden();
    expect(forbidRes.status).toBe(403);

    const conflictRes = apiConflict('มีหมายเลขโต๊ะนี้อยู่แล้ว');
    expect(conflictRes.status).toBe(409);
  });

  describe('API Versioning Strategies (URL, Header, Query Parameter)', () => {
    const negotiator = new ApiVersionNegotiator({
      defaultVersion: '1',
      deprecatedVersions: {
        '1': '2026-12-31T23:59:59Z',
      },
    });

    it('7. negotiates version via URL path (/api/v2/orders)', () => {
      const info = negotiator.resolveVersion({ url: 'https://api.ordepos.com/api/v2/orders' });
      expect(info.version).toBe('2');
      expect(info.strategy).toBe('URL');
      expect(info.isDeprecated).toBe(false);
    });

    it('8. negotiates version via X-API-Version and Accept headers', () => {
      // X-API-Version
      const infoHeader = negotiator.resolveVersion({
        url: 'https://api.ordepos.com/api/orders',
        headers: { 'x-api-version': '2' },
      });
      expect(infoHeader.version).toBe('2');
      expect(infoHeader.strategy).toBe('HEADER');

      // Accept header
      const infoAccept = negotiator.resolveVersion({
        url: 'https://api.ordepos.com/api/orders',
        headers: { accept: 'application/vnd.pos+json; version=3' },
      });
      expect(infoAccept.version).toBe('3');
      expect(infoAccept.strategy).toBe('HEADER');
    });

    it('9. negotiates version via query parameter (?v=2 or ?version=2)', () => {
      const info = negotiator.resolveVersion({ url: 'https://api.ordepos.com/api/orders?v=2' });
      expect(info.version).toBe('2');
      expect(info.strategy).toBe('QUERY_PARAM');
    });

    it('10. injects Warning and Sunset headers for deprecated API versions', () => {
      const info = negotiator.resolveVersion({ url: 'https://api.ordepos.com/api/v1/orders' });
      expect(info.isDeprecated).toBe(true);

      const headers = new Headers();
      negotiator.applyVersionHeaders(headers, info);

      expect(headers.get('X-API-Version')).toBe('v1');
      expect(headers.get('Warning')).toContain('is deprecated');
      expect(headers.get('Sunset')).toBe('2026-12-31T23:59:59Z');
    });
  });

  describe('HATEOAS (Hypermedia State Transitions)', () => {
    it('11. attaches order state transitions (PENDING order contains pay link)', () => {
      const pendingLinks = HateoasLinkBuilders.forOrder({
        baseUrl: 'https://pos.restaurant',
        storeSlug: 'krapow-express',
        orderId: 'ord-101',
        status: 'PENDING',
      });

      expect(pendingLinks.self.href).toBe('https://pos.restaurant/api/r/krapow-express/orders/ord-101');
      expect(pendingLinks.pay).toBeDefined();
      expect(pendingLinks.pay?.method).toBe('POST');
      expect(pendingLinks.receipt).toBeUndefined();
    });

    it('12. attaches paid order transitions (PAID order contains digital receipt link)', () => {
      const paidLinks = HateoasLinkBuilders.forOrder({
        baseUrl: 'https://pos.restaurant',
        storeSlug: 'krapow-express',
        orderId: 'ord-101',
        status: 'PAID',
      });

      expect(paidLinks.receipt).toBeDefined();
      expect(paidLinks.receipt?.href).toContain('/receipt/ord-101');
      expect(paidLinks.pay).toBeUndefined();
    });
  });

  describe('GraphQL Relay-Spec Cursor Pagination', () => {
    it('13. correctly encodes and decodes base64 opaque cursors', () => {
      const encoded = encodeCursor('dish-999');
      expect(decodeCursor(encoded)).toBe('dish-999');
    });

    it('14. builds Relay Connection with edges, pageInfo, and totalCount', () => {
      const dishes = [
        { id: 'd1', name: 'กะเพราหมูกรอบ' },
        { id: 'd2', name: 'ต้มยำกุ้ง' },
        { id: 'd3', name: 'ผัดไทย' },
      ];

      const connection = toRelayConnection(dishes, 10, { first: 2 });

      expect(connection.totalCount).toBe(10);
      expect(connection.edges).toHaveLength(2);
      expect(connection.edges[0].node.name).toBe('กะเพราหมูกรอบ');
      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(connection.pageInfo.startCursor).toBeDefined();
    });
  });

  describe('DataLoader Pattern (N+1 Query Elimination)', () => {
    it('15. batches multiple concurrent loads into a single database batch fetch', async () => {
      let batchExecutionCount = 0;
      const batchFn = async (keys: readonly string[]) => {
        batchExecutionCount++;
        // Simulate batch query
        return keys.map((k) => ({ id: k, title: `Item ${k}` }));
      };

      const loader = new SimpleDataLoader(batchFn);

      // Trigger 3 concurrent loads in the same microtask
      const [itemA, itemB, itemC] = await Promise.all([
        loader.load('1'),
        loader.load('2'),
        loader.load('3'),
      ]);

      expect(batchExecutionCount).toBe(1);
      expect(itemA.title).toBe('Item 1');
      expect(itemB.title).toBe('Item 2');
      expect(itemC.title).toBe('Item 3');

      // Subsequent load of an existing key uses memoization cache without hitting batchFn again
      const cachedA = await loader.load('1');
      expect(cachedA.title).toBe('Item 1');
      expect(batchExecutionCount).toBe(1);
    });
  });
});
