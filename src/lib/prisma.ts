import { PrismaClient } from '@prisma/client/wasm';
import { PrismaD1 } from '@prisma/adapter-d1';

// Cloudflare D1 is accessed through a native binding — no sockets, no
// connection pooling, no per-request lifecycle. One client per worker isolate
// is safe and cheap (each query is an RPC into the binding).
function getCloudflareEnv(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    return getCloudflareContext()?.env;
  } catch {
    return undefined;
  }
}

let workerClient: PrismaClient | null = null;
let localClient: PrismaClient | null = null;
let stubClient: PrismaClient | null = null;

function getLocalD1(): any {
  try {
    // Only attempt in Node.js runtime with node:sqlite
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');

    const dbPath = path.resolve(process.cwd(), 'prisma/dev.db');
    if (!fs.existsSync(dbPath)) return null;

    const db = new DatabaseSync(dbPath);

    return {
      prepare(sql: string) {
        let boundArgs: any[] = [];
        return {
          bind(...args: any[]) {
            boundArgs = args.map((arg) => (arg instanceof Date ? arg.toISOString() : arg));
            return this;
          },
          async run() {
            const stmt = db.prepare(sql);
            const result = stmt.run(...boundArgs);
            return {
              meta: {
                changes: Number(result.changes),
                last_row_id: Number(result.lastInsertRowid),
              },
            };
          },
          async raw(options?: { columnNames?: boolean }) {
            const stmt = db.prepare(sql);
            const rows: any[] = stmt.all(...boundArgs);
            if (rows.length === 0) {
              return options?.columnNames ? [[]] : [];
            }
            const colNames = Object.keys(rows[0]);
            const rawRows = rows.map((r) => colNames.map((c) => r[c]));
            if (options?.columnNames) {
              return [colNames, ...rawRows];
            }
            return rawRows;
          },
          async all() {
            const stmt = db.prepare(sql);
            const rows = stmt.all(...boundArgs);
            return { results: rows };
          },
          async first(col?: string) {
            const stmt = db.prepare(sql);
            const row: any = stmt.get(...boundArgs);
            if (!row) return null;
            return col ? row[col] : row;
          },
        };
      },
      async batch(stmts: any[]) {
        const results = [];
        for (const s of stmts) {
          results.push(await s.run());
        }
        return results;
      },
      async exec(sql: string) {
        db.exec(sql);
        return { count: 0, duration: 0 };
      },
    };
  } catch {
    return null;
  }
}

function getPrisma(): PrismaClient {
  const env = getCloudflareEnv();
  if (env?.DB) {
    if (!workerClient) {
      workerClient = new PrismaClient({ adapter: new PrismaD1(env.DB) });
    }
    return workerClient;
  }

  // Local development, testing, and scripts in Node.js
  const localD1 = getLocalD1();
  if (localD1) {
    if (!localClient) {
      localClient = new PrismaClient({ adapter: new PrismaD1(localD1) });
    }
    return localClient;
  }

  // Build time / fallback when neither Cloudflare binding nor local sqlite is available
  if (!stubClient) {
    const stub = {
      prepare: () => {
        throw new Error('D1 database is only available inside Cloudflare Workers or local Node.js environment');
      },
    };
    stubClient = new PrismaClient({ adapter: new PrismaD1(stub as any) });
  }
  return stubClient;
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
