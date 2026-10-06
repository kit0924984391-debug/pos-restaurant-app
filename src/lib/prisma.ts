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
let stubClient: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  const env = getCloudflareEnv();
  if (env?.DB) {
    if (!workerClient) {
      workerClient = new PrismaClient({ adapter: new PrismaD1(env.DB) });
    }
    return workerClient;
  }

  // Build time / plain Node (e.g. `next build` prerendering): the D1 binding
  // only exists inside Cloudflare Workers. Hand back a client whose queries
  // reject with a clear message — server pages catch this and load data
  // client-side instead.
  if (!stubClient) {
    const stub = {
      prepare: () => {
        throw new Error('D1 database is only available inside Cloudflare Workers');
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
