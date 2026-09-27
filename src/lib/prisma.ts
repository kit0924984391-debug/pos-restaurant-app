import { PrismaClient } from '@prisma/client/wasm';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres.koutohveoioovtlylphm:11072526%23Kit@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=pos_restaurant';


function getDatabaseConfig(): { connectionString: string; ssl?: any } {
  try {
    // Attempt to load from Cloudflare OpenNext request context if available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      return {
        connectionString: ctx.env.HYPERDRIVE.connectionString,
      };
    }
    if (ctx?.env?.DATABASE_URL) {
      return {
        connectionString: ctx.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      };
    }
  } catch {
    // ignore
  }

  const rawUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return {
    connectionString: rawUrl,
    ssl: { rejectUnauthorized: false },
  };
}

let cachedPrisma: PrismaClient | null = null;
let currentConnKey: string | null = null;

function createPrismaInstance(connectionString: string, ssl?: any): PrismaClient {
  const pool = new Pool({
    connectionString,
    options: '-c search_path=pos_restaurant',
    ssl: ssl || undefined,
    max: 10,
    maxUses: 1, // Destroy connection after use so frozen worker isolates never reuse dead sockets
    idleTimeoutMillis: 100,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });
  const adapter = new PrismaPg(pool, { schema: 'pos_restaurant' });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function getPrisma(): PrismaClient {
  const { connectionString, ssl } = getDatabaseConfig();
  const connKey = `${connectionString}_${!!ssl}`;

  if (!cachedPrisma || currentConnKey !== connKey) {
    cachedPrisma = createPrismaInstance(connectionString, ssl);
    currentConnKey = connKey;
  }
  return cachedPrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
