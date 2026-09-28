import { PrismaClient } from '@prisma/client/wasm';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres.koutohveoioovtlylphm:11072526%23Kit@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=pos_restaurant';

// Pool idle time before it is closed cleanly. Short enough to release
// Hyperdrive origin connections promptly after each request, long enough to
// cover the natural gaps between sequential queries in one route (e.g. the
// bcrypt compare inside login).
const POOL_IDLE_CLOSE_MS = 300;

interface CloudflareCtx {
  env?: any;
  ctx?: { waitUntil: (p: Promise<unknown>) => void };
}

function getCloudflareContext(): CloudflareCtx | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    // On Workers this returns a fresh AsyncLocalStorage store per request;
    // its identity scopes one PrismaClient to the current request.
    return getCloudflareContext();
  } catch {
    return undefined;
  }
}

// Cloudflare Workers constraints (see git history for the full debugging):
// - Sockets opened while serving a request are killed silently (no FIN) when
//   the request ends. Reusing a pool across requests therefore makes the next
//   request await a dead socket, which never resolves until the runtime
//   cancels the request as "hung".
// - Hyperdrive frees an origin connection only when the client socket closes
//   CLEANLY. Without an explicit pool.end() the origin connections leak until
//   the Hyperdrive origin_connection_limit (20) saturates and everything
//   hangs. Hence: one pool per request, closed after a short idle gap via
//   ctx.waitUntil (which keeps the worker alive past the response, including
//   SSE streams).
// - `maxUses: 1` is forbidden: pg-pool opens a background replacement
//   connection after every query, which deadlocks the pool on workerd.
// - Direct TLS to Supabase from workerd is not possible (no startTLS), so
//   Hyperdrive remains the transport.
interface PoolHandle {
  pool: Pool;
  client: PrismaClient;
  ended: boolean;
  idleCloseTimer: ReturnType<typeof setTimeout> | null;
}

const MAX_CACHED_POOLS = 64;
const requestPools = new Map<unknown, PoolHandle>();

let nodeHandle: PoolHandle | null = null;
let nodeConnKey: string | null = null;

function dbConfig(cfCtx: CloudflareCtx | undefined): {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
} {
  // On Workers the HYPERDRIVE binding carries a local connection string that
  // routes through Cloudflare's pooler (plaintext client socket — Hyperdrive
  // handles TLS to the origin itself).
  const hyperdrive = cfCtx?.env?.HYPERDRIVE?.connectionString as string | undefined;
  if (hyperdrive) {
    return { connectionString: hyperdrive };
  }
  // Direct connection (Node.js, or Workers without the binding): Supabase
  // requires TLS, and its pooler cert chain needs relaxed verification.
  const direct =
    (cfCtx?.env?.DATABASE_URL as string | undefined) ||
    process.env.DATABASE_URL ||
    DEFAULT_DATABASE_URL;
  return { connectionString: direct, ssl: { rejectUnauthorized: false } };
}

function scheduleIdleClose(cfCtx: CloudflareCtx | undefined, state: PoolHandle) {
  if (state.idleCloseTimer || state.ended) return;
  const close = () => {
    if (state.ended) return;
    state.ended = true;
    state.pool.end().catch(() => {});
  };
  if (cfCtx?.ctx?.waitUntil) {
    // waitUntil keeps the worker alive past the response so the sockets are
    // closed cleanly (FIN) even after the handler has returned.
    cfCtx.ctx.waitUntil(
      new Promise<void>((resolve) => {
        state.idleCloseTimer = setTimeout(() => {
          close();
          resolve();
        }, POOL_IDLE_CLOSE_MS);
      })
    );
  } else {
    state.idleCloseTimer = setTimeout(close, POOL_IDLE_CLOSE_MS);
  }
}

function createPoolHandle(cfCtx: CloudflareCtx | undefined): PoolHandle {
  const state: PoolHandle = {
    pool: null as unknown as Pool,
    client: null as unknown as PrismaClient,
    ended: false,
    idleCloseTimer: null,
  };
  const { connectionString, ssl } = dbConfig(cfCtx);
  const pool = new Pool({
    connectionString,
    options: '-c search_path=pos_restaurant',
    ssl: ssl || undefined,
    max: 2,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
  });
  state.pool = pool;
  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });
  // Re-arm the idle close whenever a query is checked out, and schedule it
  // again when the pool goes back to fully idle.
  pool.on('acquire', () => {
    if (state.idleCloseTimer) {
      clearTimeout(state.idleCloseTimer);
      state.idleCloseTimer = null;
    }
    if (!state.ended) scheduleIdleClose(cfCtx, state);
  });
  pool.on('release', () => {
    if (!state.ended) scheduleIdleClose(cfCtx, state);
  });

  const adapter = new PrismaPg(pool, { schema: 'pos_restaurant' });
  state.client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  return state;
}

function getPoolHandle(): PoolHandle {
  const cfCtx = getCloudflareContext();

  if (cfCtx) {
    let state = requestPools.get(cfCtx);
    if (!state || state.ended) {
      // `state.ended` covers a query arriving after the idle close already
      // ran (e.g. an SSE stream polling again later) — build a fresh pool
      // instead of failing.
      state = createPoolHandle(cfCtx);
      requestPools.set(cfCtx, state);
      if (requestPools.size > MAX_CACHED_POOLS) {
        const drop = requestPools.size - MAX_CACHED_POOLS;
        const oldest: unknown[] = [];
        let i = 0;
        requestPools.forEach((_h, key) => {
          if (i++ < drop) oldest.push(key);
        });
        oldest.forEach((key) => requestPools.delete(key));
      }
    }
    return state;
  }

  // Plain Node.js runtime (dev / `next start`): sockets stay alive, one
  // singleton per connection string is safe.
  const key = dbConfig(undefined).connectionString;
  if (!nodeHandle || nodeConnKey !== key) {
    nodeHandle = createPoolHandle(undefined);
    nodeConnKey = key;
  }
  return nodeHandle;
}

function isPoolEndedError(err: unknown): boolean {
  return /Cannot use a pool after calling end/i.test(String((err as any)?.message ?? err));
}

// Lazily resolves `path` against the current pool handle. If the pool was
// closed by the idle close in between queries, a fresh pool is built and the
// call is replayed (safe: the failed query never reached the server).
function resolveOnFreshPool(path: (string | symbol)[]): unknown {
  const cfCtx = getCloudflareContext();
  if (!cfCtx) return undefined;
  const fresh = createPoolHandle(cfCtx);
  requestPools.set(cfCtx, fresh);
  let value: any = fresh.client;
  for (const p of path) value = value?.[p];
  return value;
}

function makeProxy(path: (string | symbol)[]): unknown {
  return new Proxy(() => {}, {
    get(_t, prop) {
      const nextPath = [...path, prop];
      const state = getPoolHandle();
      let current: any = state.client;
      for (const p of nextPath) current = current?.[p];

      if (typeof current === 'function') {
        return function (this: unknown, ...args: unknown[]) {
          const call = (target: any): unknown => target.apply(target, args);
          try {
            const out = call(current);
            if (out && typeof (out as Promise<unknown>).then === 'function') {
              return (out as Promise<unknown>).then(
                (v) => v,
                (err) => {
                  if (isPoolEndedError(err)) {
                    const fresh: any = resolveOnFreshPool(nextPath);
                    if (typeof fresh === 'function') return call(fresh);
                  }
                  throw err;
                }
              );
            }
            return out;
          } catch (err) {
            if (isPoolEndedError(err)) {
              const fresh: any = resolveOnFreshPool(nextPath);
              if (typeof fresh === 'function') return call(fresh);
            }
            throw err;
          }
        };
      }
      if (current && typeof current === 'object') {
        return makeProxy(nextPath);
      }
      return current;
    },
    apply(_t, _thisArg, args) {
      const state = getPoolHandle();
      let current: any = state.client;
      for (const p of path) current = current?.[p];
      if (typeof current === 'function') return current.apply(current, args);
      return current;
    },
  });
}

export const prisma = makeProxy([]) as PrismaClient;

export default prisma;
