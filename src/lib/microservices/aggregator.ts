import { AggregatorOptions, AggregatorResult } from './types';
import { logger } from '@/lib/logger';

export class ServiceAggregator {
  /**
   * Concurrently aggregates results from multiple domain service calls.
   * Isolates failures so that a failing downstream service does not crash the entire response.
   */
  static async aggregate<T extends Record<string, () => Promise<any>>>(
    serviceCalls: T,
    options: AggregatorOptions = {}
  ): Promise<AggregatorResult<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>> {
    const { timeoutMs = 8000, failSilently = false } = options;
    const startTime = Date.now();
    const keys = Object.keys(serviceCalls) as (keyof T)[];
    const data: Partial<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> = {};
    const errors: Record<string, string> = {};

    const wrappedCalls = keys.map(async (key) => {
      const callFn = serviceCalls[key];
      try {
        let callPromise = callFn();
        if (timeoutMs > 0) {
          callPromise = Promise.race([
            callPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Service call '${String(key)}' timed out after ${timeoutMs}ms`)), timeoutMs)
            ),
          ]);
        }
        const res = await callPromise;
        data[key] = res;
      } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors[String(key)] = errorMsg;
        logger.warn(`[ServiceAggregator] Downstream service '${String(key)}' failed: ${errorMsg}`);
        if (!failSilently) {
          // Logged, captured in errors record
        }
      }
    });

    await Promise.allSettled(wrappedCalls);

    const isComplete = Object.keys(errors).length === 0;
    const durationMs = Date.now() - startTime;

    return {
      data,
      errors,
      isComplete,
      durationMs,
    };
  }
}
