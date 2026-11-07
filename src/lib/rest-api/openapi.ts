/**
 * OpenAPI 3.0 / Swagger Specification Generator for POS REST API
 * Conforms to OpenAPI 3.0.3 specification standards.
 */

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

export function generatePosOpenApiSpec(): OpenApiSpec {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Restaurant POS REST API',
      version: '1.0.0',
      description: 'RESTful API for Restaurant Point of Sale, Table Ordering, Kitchen Display, and Store Management.',
    },
    paths: {
      '/api/r/{slug}/menu': {
        get: {
          summary: 'List menu items',
          description: 'Returns a paginated collection of menu dishes with category and price filters.',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'sort', in: 'query', schema: { type: 'string', example: '-price,name' } },
          ],
          responses: {
            '200': {
              description: 'Successful retrieval',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CollectionResponse' },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create a new menu item',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '201': {
              description: 'Menu item created successfully',
            },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/api/r/{slug}/menu/{id}': {
        get: {
          summary: 'Get menu item by ID',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Item details' },
            '404': { description: 'Menu item not found' },
          },
        },
        patch: {
          summary: 'Partially update menu item',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Item updated successfully' },
            '404': { description: 'Menu item not found' },
          },
        },
        delete: {
          summary: 'Delete menu item',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '204': { description: 'Menu item removed, no content' },
            '404': { description: 'Menu item not found' },
          },
        },
      },
      '/api/r/{slug}/orders': {
        get: {
          summary: 'List orders',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            '200': { description: 'List of orders with pagination' },
          },
        },
        post: {
          summary: 'Create a new order',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '201': { description: 'Order created' },
            '400': { description: 'Bad request' },
          },
        },
      },
    },
    components: {
      schemas: {
        CollectionResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
            links: {
              type: 'object',
              properties: {
                self: { type: 'string' },
                next: { type: 'string', nullable: true },
                prev: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  };
}
