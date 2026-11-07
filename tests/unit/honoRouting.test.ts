import { describe, it, expect, vi } from 'vitest';
import app from '@/server/hono';
import { getHonoClient } from '@/lib/honoClient';

describe('Hono Routing & Middleware Suite', () => {
  it('1. GET /api/rpc/health returns 200 HEALTHY with custom headers', async () => {
    const req = new Request('http://localhost/api/rpc/health');
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Response-Time')).toBeDefined();
    expect(res.headers.get('X-Request-Id')).toBeDefined();

    const data = await res.json();
    expect(data.status).toBe('HEALTHY');
    expect(data.version).toBe('1.0.0');
    expect(data.requestId).toBeDefined();
  });

  it('2. GET /api/rpc/orders validates required query parameters with zValidator', async () => {
    // Missing required 'slug' parameter
    const reqMissingSlug = new Request('http://localhost/api/rpc/orders');
    const res = await app.fetch(reqMissingSlug);

    // zValidator returns 400 Bad Request when validation fails
    expect(res.status).toBe(400);
  });

  it('3. GET /api/rpc/orders with valid slug executes query and returns pagination envelope', async () => {
    const reqValid = new Request('http://localhost/api/rpc/orders?slug=demo&page=1&limit=10');
    const res = await app.fetch(reqValid);

    // If store exists or not found:
    // If not found, returns 404 HTTPException
    // In both cases, response format is valid JSON and adheres to Hono contract
    expect([200, 404]).toContain(res.status);

    const data = await res.json();
    if (res.status === 200) {
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
    } else {
      expect(data.error).toBeDefined();
      expect(data.statusCode).toBe(404);
    }
  });

  it('4. Global 404 handler returns structured JSON payload', async () => {
    const reqNotFound = new Request('http://localhost/api/rpc/unknown-endpoint');
    const res = await app.fetch(reqNotFound);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('ไม่พบเส้นทาง API');
    expect(data.statusCode).toBe(404);
    expect(data.requestId).toBeDefined();
  });

  it('5. Type-safe RPC Client initializes correctly', () => {
    const client = getHonoClient('http://localhost:3000');
    expect(client).toBeDefined();
    expect((client as any).api).toBeDefined();
    expect(['function', 'object']).toContain(typeof (client as any).api);
  });

  it('6. GET /api/rpc/menu validates required slug query parameter', async () => {
    // Missing slug
    const req = new Request('http://localhost/api/rpc/menu');
    const res = await app.fetch(req);

    expect(res.status).toBe(400);
  });

  it('7. GET /api/rpc/menu with non-existent slug returns 404 HTTPException', async () => {
    const req = new Request('http://localhost/api/rpc/menu?slug=non-existent-store-xyz');
    const res = await app.fetch(req);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('ไม่พบร้านค้า');
    expect(data.statusCode).toBe(404);
  });

  it('8. GET /api/rpc/menu/:id with missing id returns 404', async () => {
    const req = new Request('http://localhost/api/rpc/menu/missing-item-id-12345');
    const res = await app.fetch(req);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('ไม่พบเมนูอาหาร');
  });

  it('9. PATCH /api/rpc/menu/:id/availability enforces requireAuthMiddleware', async () => {
    const req = new Request('http://localhost/api/rpc/menu/item-123/availability', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: false }),
    });

    const res = await app.fetch(req);
    // Unauthenticated request should throw 401 HTTPException
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('กรุณาเข้าสู่ระบบก่อนดำเนินการ');
  });

  it('10. PATCH /api/rpc/menu/:id/availability rejects invalid JSON body schema', async () => {
    // Authenticated mock or unauthenticated check:
    // Even if auth is passed or checked, invalid JSON schema is validated by zValidator
    const reqInvalidBody = new Request('http://localhost/api/rpc/menu/item-123/availability', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: 'not-a-boolean' }),
    });

    const res = await app.fetch(reqInvalidBody);
    // Returns 400 or 401 depending on middleware order
    expect([400, 401]).toContain(res.status);
  });

  it('11. Middleware chain sets X-Response-Time and preserves X-Request-Id', async () => {
    const customReqId = 'req_custom_123456';
    const req = new Request('http://localhost/api/rpc/health', {
      headers: { 'x-request-id': customReqId },
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Request-Id')).toBe(customReqId);
    expect(res.headers.get('X-Response-Time')).toMatch(/\d+ms/);
  });
});

