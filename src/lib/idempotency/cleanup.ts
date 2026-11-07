import { getIdempotencyStore } from './store';

export interface CleanupResult {
  purgedCount: number;
  timestamp: number;
  durationMs: number;
}

/**
 * Purges expired idempotency keys older than the specified TTL (default: 24h)
 */
export async function cleanupExpiredIdempotencyKeys(ttlSeconds = 86400): Promise<CleanupResult> {
  const start = Date.now();
  const store = getIdempotencyStore();
  const purgedCount = await store.cleanupExpired(ttlSeconds);
  const durationMs = Date.now() - start;

  return {
    purgedCount,
    timestamp: Date.now(),
    durationMs,
  };
}
