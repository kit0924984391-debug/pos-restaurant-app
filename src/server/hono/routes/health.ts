/**
 * Hono Routes - Health & System Status Sub-App
 */

import { Hono } from 'hono';
import { HonoEnv } from '../types';

export const healthRouter = new Hono<HonoEnv>();

healthRouter.get('/', (c) => {
  const startTime = c.get('startTime') || Date.now();
  const latencyMs = Date.now() - startTime;

  return c.json({
    status: 'HEALTHY',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requestId: c.get('requestId'),
    latencyMs,
    environment: process.env.NODE_ENV || 'production',
  });
});
