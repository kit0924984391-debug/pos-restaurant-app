/**
 * DataLoader Pattern (N+1 Query Problem Prevention)
 * Batches multiple individual load calls into a single batch execution within the same microtask tick.
 * Caches loaded values per instance to prevent redundant database fetches.
 */

export type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<(V | Error)[]>;

export class SimpleDataLoader<K, V> {
  private batchLoadFn: BatchLoadFn<K, V>;
  private cache: Map<K, Promise<V>>;
  private queue: Array<{ key: K; resolve: (val: V) => void; reject: (err: unknown) => void }>;
  private isBatchScheduled: boolean;

  constructor(batchLoadFn: BatchLoadFn<K, V>) {
    this.batchLoadFn = batchLoadFn;
    this.cache = new Map();
    this.queue = [];
    this.isBatchScheduled = false;
  }

  /**
   * Loads a single key, returning a Promise that resolves with the value
   */
  load(key: K): Promise<V> {
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (!this.isBatchScheduled) {
        this.isBatchScheduled = true;
        // Batch in the next microtask tick
        Promise.resolve().then(() => this.dispatchBatch());
      }
    });

    this.cache.set(key, promise);
    return promise;
  }

  /**
   * Loads multiple keys concurrently
   */
  async loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map((k) => this.load(k)));
  }

  /**
   * Clears a key from the cache
   */
  clear(key: K): this {
    this.cache.delete(key);
    return this;
  }

  /**
   * Clears all cached entries
   */
  clearAll(): this {
    this.cache.clear();
    return this;
  }

  /**
   * Primes the cache with a known key-value pair
   */
  prime(key: K, value: V): this {
    this.cache.set(key, Promise.resolve(value));
    return this;
  }

  private async dispatchBatch(): Promise<void> {
    this.isBatchScheduled = false;
    const currentQueue = this.queue;
    this.queue = [];

    if (currentQueue.length === 0) return;

    const keys = currentQueue.map((item) => item.key);

    try {
      const results = await this.batchLoadFn(keys);

      if (results.length !== keys.length) {
        throw new Error(
          `DataLoader batchLoadFn returned ${results.length} items for ${keys.length} keys.`
        );
      }

      for (let i = 0; i < currentQueue.length; i++) {
        const item = currentQueue[i];
        const res = results[i];
        if (res instanceof Error) {
          item.reject(res);
        } else {
          item.resolve(res);
        }
      }
    } catch (err) {
      for (const item of currentQueue) {
        item.reject(err);
      }
    }
  }
}
