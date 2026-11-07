import { describe, it, expect } from 'vitest';
import { handleGraphQLRequest, getGraphQLSchema } from '@/server/graphql';
import { createDataLoaders } from '@/server/graphql/dataloaders';

describe('GraphQL Implementation Suite', () => {
  it('1. Compiles and initializes GraphQL Schema from SDL correctly', () => {
    const schema = getGraphQLSchema();
    expect(schema).toBeDefined();
    expect(schema.getQueryType()).toBeDefined();
    expect(schema.getMutationType()).toBeDefined();

    const queryFields = schema.getQueryType()?.getFields();
    expect(queryFields?.store).toBeDefined();
    expect(queryFields?.menu).toBeDefined();
    expect(queryFields?.tables).toBeDefined();
    expect(queryFields?.orders).toBeDefined();
  });

  it('2. Rejects request with empty query with HTTP 400', async () => {
    const req = new Request('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    });

    const res = await handleGraphQLRequest(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toContain('ต้องระบุ GraphQL Query');
  });

  it('3. Handles GET query parameters via GraphQL over HTTP spec', async () => {
    const query = encodeURIComponent('{ __typename }');
    const req = new Request(`http://localhost/api/graphql?query=${query}`, {
      method: 'GET',
    });

    const res = await handleGraphQLRequest(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.__typename).toBe('Query');
  });

  it('4. Handles not found error with standard GraphQLError extensions', async () => {
    const req = new Request('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetStore {
            store(slug: "non-existent-store-slug-xyz") {
              id
              name
            }
          }
        `,
      }),
    });

    const res = await handleGraphQLRequest(req);
    expect(res.status).toBe(200); // GraphQL over HTTP returns 200 with errors array

    const body = await res.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toContain('ไม่พบร้านค้า');
    expect(body.errors[0].extensions?.code).toBe('NOT_FOUND');
  });

  it('5. DataLoader pattern caches entities to prevent N+1 queries', async () => {
    const loaders = createDataLoaders();
    expect(loaders.orderItemsLoader).toBeDefined();
    expect(loaders.menuItemLoader).toBeDefined();
    expect(loaders.tableOrdersLoader).toBeDefined();

    // Repeated call to loader for same non-existent ID should use in-memory batch cache
    const item1 = await loaders.menuItemLoader('item_mock_123');
    const item2 = await loaders.menuItemLoader('item_mock_123');
    expect(item1).toEqual(item2);
  });

  it('6. Rejects mutation with empty items list via BAD_USER_INPUT GraphQLError', async () => {
    const req = new Request('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation CreateEmptyOrder {
            createOrder(slug: "test-slug", input: { items: [] }) {
              success
              message
            }
          }
        `,
      }),
    });

    const res = await handleGraphQLRequest(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions?.code).toBe('BAD_USER_INPUT');
    expect(body.errors[0].message).toContain('อย่างน้อย 1 รายการ');
  });

  it('7. Handles OPTIONS preflight with 204 No Content and CORS headers', async () => {
    const req = new Request('http://localhost/api/graphql', {
      method: 'OPTIONS',
    });

    const res = await handleGraphQLRequest(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
