import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';
import type { BatchItem } from 'drizzle-orm/batch';

export * from './schema';
export * from '@/lib/sqlite';
export { schema };

// Minimal D1Database shape for typechecking without @cloudflare/workers-types.
// Runtime object is provided by Cloudflare; we only need batch/exec/prepare.
export interface D1Database {
  batch(statements: unknown[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
  prepare(query: string): unknown;
}

export type AppDatabase = DrizzleD1Database<typeof schema>;

/**
 * Initializes a type-safe Drizzle ORM client connected to Cloudflare D1
 */
export function getDrizzleDb(d1: D1Database): AppDatabase {
  return drizzle(d1, { schema });
}

/**
 * Helper to safely execute atomic operations using Cloudflare D1's native Batch API
 * D1 does not support interactive SQL BEGIN/COMMIT transactions, so db.batch() is required.
 */
export async function executeD1Batch<T extends BatchItem<'sqlite'>[]>(
  db: AppDatabase,
  batchStatements: T
): Promise<any[]> {
  return (db as any).batch(batchStatements as any);
}

/**
 * Common query helpers and prepared statement factories for POS hot paths
 */
export const queryHelpers = {
  /**
   * Helper to format Date to D1-compatible timestamp integer
   */
  toTimestamp(date: Date = new Date()): number {
    return Math.floor(date.getTime() / 1000);
  },
};
