/**
 * Hono Type-Safe RPC Client
 * 
 * Provides end-to-end type safety between client components and the Hono API router.
 * Adheres to Hono Rule: export type AppType and consume with hc<AppType>
 */

import { hc } from 'hono/client';
import type { AppType } from '@/server/hono';

export const getHonoClient = (baseUrl?: string) => {
  const origin =
    baseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  return hc<AppType>(origin);
};

export type HonoClientInstance = ReturnType<typeof getHonoClient>;
