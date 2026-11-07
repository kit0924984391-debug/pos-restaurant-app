import { prisma } from '@/lib/prisma';
import { IdempotencyRecord } from './types';

export interface IIdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null>;
  startProcessing(key: string, payloadHash: string, storeId?: string, ttlSeconds?: number): Promise<boolean>;
  complete(key: string, status: number, responseBody: any, storeId?: string, payloadHash?: string): Promise<void>;
  fail(key: string): Promise<void>;
  delete(key: string): Promise<void>;
  cleanupExpired(ttlSeconds?: number): Promise<number>;
}

const DEFAULT_TTL_SECONDS = 86400; // 24 hours

/**
 * High-performance In-Memory Idempotency Store
 * Great for unit tests, local development, and fast fallback.
 */
export class MemoryIdempotencyStore implements IIdempotencyStore {
  private cache = new Map<string, IdempotencyRecord>();

  async get(key: string): Promise<IdempotencyRecord | null> {
    const record = this.cache.get(key);
    if (!record) return null;

    if (record.expiresAt && Date.now() > record.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return record;
  }

  async startProcessing(
    key: string,
    payloadHash: string,
    storeId = 'global',
    ttlSeconds = DEFAULT_TTL_SECONDS
  ): Promise<boolean> {
    const existing = await this.get(key);
    if (existing) {
      return false; // already locked / processed
    }

    const now = Date.now();
    this.cache.set(key, {
      key,
      storeId,
      payloadHash,
      status: 102, // 102 Processing
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    });

    return true;
  }

  async complete(
    key: string,
    status: number,
    responseBody: any,
    storeId = 'global',
    payloadHash = ''
  ): Promise<void> {
    const existing = this.cache.get(key);
    const now = Date.now();
    this.cache.set(key, {
      key,
      storeId: existing?.storeId || storeId,
      payloadHash: existing?.payloadHash || payloadHash,
      status,
      responseStatus: status,
      body: JSON.stringify(responseBody),
      responseBody,
      createdAt: existing?.createdAt || now,
      expiresAt: existing?.expiresAt || now + DEFAULT_TTL_SECONDS * 1000,
    });
  }

  async fail(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async cleanupExpired(): Promise<number> {
    let purged = 0;
    const now = Date.now();
    this.cache.forEach((record, key) => {
      if (record.expiresAt && now > record.expiresAt) {
        this.cache.delete(key);
        purged++;
      }
    });
    return purged;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Database-backed Idempotency Store (Cloudflare D1 / SQLite / PostgreSQL)
 */
export class D1PrismaIdempotencyStore implements IIdempotencyStore {
  async get(key: string): Promise<IdempotencyRecord | null> {
    try {
      const rows: any[] = await prisma.$queryRaw`
        SELECT "key", "storeId", "payloadHash", "status", "body", "createdAt"
        FROM "IdempotencyKey" WHERE "key" = ${key}
      `;

      if (!rows || rows.length === 0) return null;
      const row = rows[0];

      let parsedBody: any = undefined;
      if (row.body) {
        try {
          parsedBody = JSON.parse(row.body);
        } catch {}
      }

      return {
        key: row.key,
        storeId: row.storeId,
        payloadHash: row.payloadHash,
        status: Number(row.status),
        responseStatus: Number(row.status),
        body: row.body,
        responseBody: parsedBody,
        createdAt: Number(row.createdAt),
      };
    } catch {
      return null;
    }
  }

  async startProcessing(
    key: string,
    payloadHash: string,
    storeId = 'global'
  ): Promise<boolean> {
    try {
      const now = Date.now();
      await prisma.$executeRaw`
        INSERT INTO "IdempotencyKey" ("key", "storeId", "payloadHash", "status", "body", "createdAt")
        VALUES (${key}, ${storeId}, ${payloadHash}, 102, '', ${now})
      `;
      return true;
    } catch {
      // Key conflict: row already exists
      return false;
    }
  }

  async complete(
    key: string,
    status: number,
    responseBody: any,
    storeId = 'global',
    payloadHash = ''
  ): Promise<void> {
    try {
      const bodyStr = JSON.stringify(responseBody);
      const now = Date.now();
      await prisma.$executeRaw`
        INSERT INTO "IdempotencyKey" ("key", "storeId", "payloadHash", "status", "body", "createdAt")
        VALUES (${key}, ${storeId}, ${payloadHash}, ${status}, ${bodyStr}, ${now})
        ON CONFLICT("key") DO UPDATE SET
          "status" = ${status},
          "body" = ${bodyStr},
          "createdAt" = ${now}
      `;
    } catch (e) {
      console.warn('[IdempotencyStore:D1] complete failed:', e);
    }
  }

  async fail(key: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        DELETE FROM "IdempotencyKey" WHERE "key" = ${key} AND "status" = 102
      `;
    } catch {}
  }

  async delete(key: string): Promise<void> {
    try {
      await prisma.$executeRaw`DELETE FROM "IdempotencyKey" WHERE "key" = ${key}`;
    } catch {}
  }

  async cleanupExpired(ttlSeconds = DEFAULT_TTL_SECONDS): Promise<number> {
    try {
      const cutoff = Date.now() - ttlSeconds * 1000;
      const count = await prisma.$executeRaw`
        DELETE FROM "IdempotencyKey" WHERE "createdAt" < ${cutoff}
      `;
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Hybrid Store: Tries D1 first, seamlessly falls back to In-Memory store if table isn't provisioned
 */
export class HybridIdempotencyStore implements IIdempotencyStore {
  private memory = new MemoryIdempotencyStore();
  private d1 = new D1PrismaIdempotencyStore();

  async get(key: string): Promise<IdempotencyRecord | null> {
    const memRecord = await this.memory.get(key);
    if (memRecord) return memRecord;

    const dbRecord = await this.d1.get(key);
    if (dbRecord) {
      // Sync into memory for subsequent fast lookups
      await this.memory.complete(
        key,
        dbRecord.status as number,
        dbRecord.responseBody,
        dbRecord.storeId,
        dbRecord.payloadHash
      );
      return dbRecord;
    }

    return null;
  }

  async startProcessing(
    key: string,
    payloadHash: string,
    storeId = 'global',
    ttlSeconds?: number
  ): Promise<boolean> {
    const memOk = await this.memory.startProcessing(key, payloadHash, storeId, ttlSeconds);
    if (!memOk) return false;

    // Try DB lock asynchronously
    await this.d1.startProcessing(key, payloadHash, storeId).catch(() => {});
    return true;
  }

  async complete(
    key: string,
    status: number,
    responseBody: any,
    storeId?: string,
    payloadHash?: string
  ): Promise<void> {
    await this.memory.complete(key, status, responseBody, storeId, payloadHash);
    await this.d1.complete(key, status, responseBody, storeId, payloadHash).catch(() => {});
  }

  async fail(key: string): Promise<void> {
    await this.memory.fail(key);
    await this.d1.fail(key).catch(() => {});
  }

  async delete(key: string): Promise<void> {
    await this.memory.delete(key);
    await this.d1.delete(key).catch(() => {});
  }

  async cleanupExpired(ttlSeconds?: number): Promise<number> {
    const memPurged = await this.memory.cleanupExpired();
    const dbPurged = await this.d1.cleanupExpired(ttlSeconds);
    return memPurged + dbPurged;
  }
}

export const defaultIdempotencyStore = new HybridIdempotencyStore();
export function getIdempotencyStore(): IIdempotencyStore {
  return defaultIdempotencyStore;
}
