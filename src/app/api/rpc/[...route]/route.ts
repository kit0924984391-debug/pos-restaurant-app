/**
 * Next.js App Router Adapter for Hono
 * 
 * Routes all /api/rpc/* requests directly to Hono's Web Standards fetch handler.
 * Preserves 100% of existing Next.js routes under /api/r/* and /api/auth/*.
 */

import app from '@/server/hono';

export const dynamic = 'force-dynamic';

export const GET = (req: Request) => app.fetch(req);
export const POST = (req: Request) => app.fetch(req);
export const PUT = (req: Request) => app.fetch(req);
export const PATCH = (req: Request) => app.fetch(req);
export const DELETE = (req: Request) => app.fetch(req);
export const OPTIONS = (req: Request) => app.fetch(req);
