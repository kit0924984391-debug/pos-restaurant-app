/**
 * Hono Application Root
 * 
 * Implements:
 * - Production-ready configuration from hono-routing SKILL.md
 * - Sub-app mounting with app.route()
 * - Global error handling (app.onError) with HTTPException
 * - 404 handler (app.notFound)
 * - Type-safe RPC route export (export type AppType)
 */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { HonoEnv } from './types';
import { healthRouter } from './routes/health';
import { ordersRouter } from './routes/orders';
import { tablesRouter } from './routes/tables';
import { menuRouter } from './routes/menu';

const app = new Hono<HonoEnv>().basePath('/api/rpc');

// 1. Global Middleware: Request ID & Timing
app.use('*', async (c, next) => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();

  c.set('requestId', requestId);
  c.set('startTime', startTime);

  await next();

  const durationMs = Date.now() - startTime;
  c.header('X-Response-Time', `${durationMs}ms`);
  c.header('X-Request-Id', requestId);
});

// 2. Mount Sub-Apps
const routes = app
  .route('/health', healthRouter)
  .route('/orders', ordersRouter)
  .route('/tables', tablesRouter)
  .route('/menu', menuRouter);

// 3. Global Error Handler
app.onError((err, c) => {
  const requestId = c.get('requestId') || 'unknown';

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        statusCode: err.status,
        requestId,
        timestamp: new Date().toISOString(),
      },
      err.status
    );
  }

  console.error('[Hono Error]', err);
  return c.json(
    {
      error: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง (Internal Server Error)',
      statusCode: 500,
      requestId,
      timestamp: new Date().toISOString(),
    },
    500
  );
});

// 4. Global 404 Handler
app.notFound((c) => {
  return c.json(
    {
      error: `ไม่พบเส้นทาง API: ${c.req.method} ${c.req.path}`,
      statusCode: 404,
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
    },
    404
  );
});

export type AppType = typeof routes;
export default app;
