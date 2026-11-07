/**
 * Hono Routing - Server Types & Context Extension
 * 
 * Defines custom context variables and Cloudflare bindings for full type safety.
 * Adheres to Hono Rule: Define context types in Hono<{ Variables, Bindings }>
 */

import { SessionUser } from '@/lib/auth';

export type HonoVariables = {
  requestId: string;
  startTime: number;
  user?: SessionUser;
  storeSlug?: string;
};

export type HonoEnv = {
  Variables: HonoVariables;
  Bindings: {
    DB?: any;
    REALTIME_HUB?: any;
  };
};
