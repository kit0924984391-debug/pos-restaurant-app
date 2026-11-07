/**
 * Hono Middleware - Authentication & Context Population
 * 
 * Adheres to Hono Rules:
 * - Always call await next()
 * - Throw HTTPException for expected auth errors
 * - Set typed variables via c.set('user', ...)
 */

import { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getCurrentUser } from '@/lib/auth';
import { HonoEnv } from '../types';

/**
 * Optional Auth Middleware: Populates user context if present without blocking
 */
export const optionalAuthMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    if (user) {
      c.set('user', user);
    }
  } catch {
    // Continue without user
  }
  await next();
};

/**
 * Required Auth Middleware: Enforces valid authenticated session
 */
export const requireAuthMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const user = await getCurrentUser(c.req.raw);
  if (!user) {
    throw new HTTPException(401, {
      message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ (Authentication Required)',
    });
  }
  c.set('user', user);
  await next();
};
