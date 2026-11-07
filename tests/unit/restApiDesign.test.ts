import { describe, it, expect } from 'vitest';
import {
  RestApiLinter,
  parseRestQueryParams,
  restResource,
  restCreated,
  restNoContent,
  restCollection,
  generatePosOpenApiSpec,
} from '@/lib/rest-api';
import {
  apiNoContent,
  apiBadRequest,
  apiTooManyRequests,
} from '@/lib/apiResponse';

describe('REST API Design Specification Suite', () => {
  describe('1. Resource Naming & Linter Conventions', () => {
    it('approves RESTful noun-based, hierarchical routes without trailing slashes', () => {
      const goodRoutes = [
        '/api/users',
        '/api/users/123',
        '/api/users/123/orders',
        '/api/r/test-store/menu',
        '/api/r/test-store/orders/ord-456',
        '/api/platform-admin/plans',
      ];

      for (const path of goodRoutes) {
        const violations = RestApiLinter.lintEndpoint(path, 'GET');
        expect(violations).toHaveLength(0);
      }
    });

    it('detects and flags action verbs embedded in URL paths', () => {
      const badRoutes = [
        '/api/getUsers',
        '/api/createUser',
        '/api/orders/delete',
        '/api/tables/123/edit',
      ];

      for (const path of badRoutes) {
        const violations = RestApiLinter.lintEndpoint(path, 'POST');
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0].rule).toBe('RESOURCE_NAMING_VERB');
      }
    });

    it('detects and flags trailing slashes in resource endpoints', () => {
      const violations = RestApiLinter.lintEndpoint('/api/menu/dishes/', 'GET');
      expect(violations.some((v) => v.rule === 'TRAILING_SLASH')).toBe(true);
      expect(violations[0].suggestion).toBe('/api/menu/dishes');
    });

    it('correctly reports HTTP method idempotency', () => {
      expect(RestApiLinter.isIdempotent('GET')).toBe(true);
      expect(RestApiLinter.isIdempotent('PUT')).toBe(true);
      expect(RestApiLinter.isIdempotent('PATCH')).toBe(true);
      expect(RestApiLinter.isIdempotent('DELETE')).toBe(true);
      expect(RestApiLinter.isIdempotent('POST')).toBe(false);
    });

    it('assigns standard success HTTP status codes for methods', () => {
      expect(RestApiLinter.getStandardSuccessStatus('GET')).toBe(200);
      expect(RestApiLinter.getStandardSuccessStatus('POST')).toBe(201);
      expect(RestApiLinter.getStandardSuccessStatus('DELETE')).toBe(204);
      expect(RestApiLinter.getStandardSuccessStatus('PATCH')).toBe(200);
    });
  });

  describe('2. Query Parameter Parsing (Filtering, Sorting, Pagination, Fieldsets)', () => {
    it('parses multi-field sorting (+/- syntax)', () => {
      const parsed = parseRestQueryParams('/api/products?sort=-price,name');

      expect(parsed.sort).toEqual([
        { field: 'price', order: 'desc' },
        { field: 'name', order: 'asc' },
      ]);
    });

    it('parses sparse fieldsets', () => {
      const parsed = parseRestQueryParams('/api/products?fields=id,name,price');

      expect(parsed.fields).toEqual(['id', 'name', 'price']);
    });

    it('parses pagination with limits and clamped bounds', () => {
      const parsed = parseRestQueryParams('/api/products?page=3&limit=50', { maxLimit: 100 });

      expect(parsed.page).toBe(3);
      expect(parsed.limit).toBe(50);
    });

    it('extracts custom filtering query parameters cleanly', () => {
      const parsed = parseRestQueryParams('/api/products?category=food&status=available&sort=-price&page=1');

      expect(parsed.filter).toEqual({
        category: 'food',
        status: 'available',
      });
    });
  });

  describe('3. REST Response Envelopes & Hypermedia Links', () => {
    it('generates standard JSON:API resource envelope with data and meta', async () => {
      const res = restResource({
        id: 'user_123',
        type: 'user',
        attributes: {
          name: 'Somchai',
          email: 'somchai@example.com',
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe('user_123');
      expect(json.data.type).toBe('user');
      expect(json.data.attributes.name).toBe('Somchai');
      expect(json.meta.requestId).toBeDefined();
      expect(json.meta.timestamp).toBeDefined();
    });

    it('restCreated returns 201 Created with resource envelope', async () => {
      const res = restCreated({
        id: 'ord_999',
        type: 'order',
        attributes: {
          totalAmount: 150,
          status: 'PENDING',
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('ord_999');
      expect(json.data.attributes.totalAmount).toBe(150);
    });

    it('restCollection produces paginated collection with RFC navigation links', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const res = restCollection(
        items,
        {
          page: 2,
          limit: 10,
          total: 35,
          baseUrl: '/api/v1/orders',
        },
        { status: 'PAID' }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(2);
      expect(json.pagination.page).toBe(2);
      expect(json.pagination.totalPages).toBe(4);
      expect(json.links.self).toContain('/api/v1/orders?page=2&limit=10&status=PAID');
      expect(json.links.prev).toContain('/api/v1/orders?page=1&limit=10&status=PAID');
      expect(json.links.next).toContain('/api/v1/orders?page=3&limit=10&status=PAID');
      expect(json.links.first).toContain('/api/v1/orders?page=1&limit=10&status=PAID');
      expect(json.links.last).toContain('/api/v1/orders?page=4&limit=10&status=PAID');
    });

    it('restCollection handles boundary page links (first page prev is null, last page next is null)', async () => {
      // First page
      const resFirst = restCollection([], { page: 1, limit: 10, total: 30, baseUrl: '/api/items' });
      const jsonFirst = await resFirst.json();
      expect(jsonFirst.links.prev).toBeNull();
      expect(jsonFirst.links.next).not.toBeNull();

      // Last page
      const resLast = restCollection([], { page: 3, limit: 10, total: 30, baseUrl: '/api/items' });
      const jsonLast = await resLast.json();
      expect(jsonLast.links.next).toBeNull();
      expect(jsonLast.links.prev).not.toBeNull();
    });
  });

  describe('4. Status Code Helpers (204, 400, 429)', () => {
    it('restNoContent and apiNoContent return 204 No Content with empty body', async () => {
      const res1 = restNoContent();
      expect(res1.status).toBe(204);
      const text1 = await res1.text();
      expect(text1).toBe('');

      const res2 = apiNoContent();
      expect(res2.status).toBe(204);
    });

    it('apiBadRequest returns 400 Bad Request with error details', async () => {
      const res = apiBadRequest('รูปแบบข้อมูลไม่ถูกต้อง', { field: 'email' });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('BAD_REQUEST');
      expect(json.details.field).toBe('email');
    });

    it('apiTooManyRequests returns 429 Too Many Requests and Retry-After header', async () => {
      const res = apiTooManyRequests('คำขอถี่เกินไป', 60);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('60');
      const json = await res.json();
      expect(json.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('5. OpenAPI 3.0 Specification Generation', () => {
    it('generates a valid OpenAPI 3.0 document with POS endpoints', () => {
      const spec = generatePosOpenApiSpec();

      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toContain('Restaurant POS');
      expect(spec.paths['/api/r/{slug}/menu']).toBeDefined();
      expect(spec.paths['/api/r/{slug}/menu/{id}']).toBeDefined();
      expect(spec.paths['/api/r/{slug}/orders']).toBeDefined();
      expect(spec.components.schemas.CollectionResponse).toBeDefined();
    });
  });
});
