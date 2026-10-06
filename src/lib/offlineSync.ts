/**
 * Offline-First PWA Synchronization Engine
 * Handles network dropouts, mutation queuing in localStorage/IndexedDB,
 * and automatic synchronization when network re-establishes.
 */

export interface QueuedMutation {
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body: any;
  createdAt: number;
  retryCount: number;
  description: string;
  tenantSlug: string;
}

const QUEUE_STORAGE_KEY = 'pos_offline_mutations_queue';

class OfflineSyncEngine {
  private static instance: OfflineSyncEngine;
  private isSyncing = false;
  private listeners: Set<(count: number, isSyncing: boolean) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineSync] Network reconnected! Triggering auto-sync...');
        this.processQueue();
      });

      // Periodic check every 30 seconds if online and items exist
      setInterval(() => {
        if (navigator.onLine && this.getQueue().length > 0 && !this.isSyncing) {
          this.processQueue();
        }
      }, 30000);
    }
  }

  public static getInstance(): OfflineSyncEngine {
    if (!OfflineSyncEngine.instance) {
      OfflineSyncEngine.instance = new OfflineSyncEngine();
    }
    return OfflineSyncEngine.instance;
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public getQueue(tenantSlug?: string): QueuedMutation[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return [];
      const list: QueuedMutation[] = JSON.parse(raw);
      if (tenantSlug) {
        return list.filter((m) => m.tenantSlug === tenantSlug);
      }
      return list;
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedMutation[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      this.notifyListeners();
    } catch (e) {
      console.error('[OfflineSync] Error saving queue:', e);
    }
  }

  public enqueue(mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'retryCount'>): QueuedMutation {
    const item: QueuedMutation = {
      ...mutation,
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      retryCount: 0,
    };

    const current = this.getQueue();
    current.push(item);
    this.saveQueue(current);

    console.log(`[OfflineSync] Enqueued offline mutation: ${item.description} (${item.id})`);

    // If online, attempt to flush immediately
    if (this.isOnline()) {
      this.processQueue();
    }

    return item;
  }

  public async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isSyncing || !this.isOnline()) {
      return { processed: 0, failed: 0 };
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let processedCount = 0;
    let failedCount = 0;
    const remaining: QueuedMutation[] = [];

    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            ...(item.headers || {}),
          },
          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        if (response.ok) {
          processedCount++;
          console.log(`[OfflineSync] Successfully synced mutation: ${item.description}`);
        } else if (response.status >= 400 && response.status < 500) {
          // Client-side invalid mutation (cannot be resolved by retrying, discard)
          console.warn(`[OfflineSync] Mutation rejected with ${response.status}, discarding:`, item);
          processedCount++;
        } else {
          // Server error 5xx or temporary network blip, keep for retry
          item.retryCount += 1;
          if (item.retryCount < 5) {
            remaining.push(item);
          }
          failedCount++;
        }
      } catch (networkErr) {
        // Network failed mid-request
        console.warn(`[OfflineSync] Network error syncing mutation:`, networkErr);
        item.retryCount += 1;
        remaining.push(item);
        failedCount++;
        break; // Stop loop if network is down again
      }
    }

    this.saveQueue(remaining);
    this.isSyncing = false;
    this.notifyListeners();

    if (processedCount > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pos-offline-synced', {
          detail: { processedCount, remainingCount: remaining.length },
        })
      );
    }

    return { processed: processedCount, failed: failedCount };
  }

  public subscribe(listener: (count: number, isSyncing: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.getQueue().length, this.isSyncing);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const count = this.getQueue().length;
    this.listeners.forEach((listener) => {
      try {
        listener(count, this.isSyncing);
      } catch (e) {
        console.error('[OfflineSync] Listener error:', e);
      }
    });
  }
}

export const offlineSyncEngine = OfflineSyncEngine.getInstance();

/**
 * Enhanced fetch with automatic offline mutation fallback
 */
export async function fetchWithOfflineFallback(
  url: string,
  options: {
    method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'GET';
    body?: any;
    headers?: Record<string, string>;
    tenantSlug?: string;
    description?: string;
  }
): Promise<{ ok: boolean; status: number; data?: any; queued?: boolean }> {
  const method = (options.method || 'GET').toUpperCase() as any;

  // GET requests are not queued
  if (method === 'GET' || !options.tenantSlug) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  // Attempt normal online request
  if (navigator.onLine) {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        return { ok: true, status: res.status, data };
      }
    } catch (err) {
      console.warn('[OfflineFallback] Network request failed, queueing mutation...', err);
    }
  }

  // Fallback: enqueue mutation to execute when back online
  const queued = offlineSyncEngine.enqueue({
    url,
    method,
    headers: options.headers,
    body: options.body,
    tenantSlug: options.tenantSlug,
    description: options.description || `${method} ${url}`,
  });

  return {
    ok: true,
    status: 202,
    queued: true,
    data: { offlineQueued: true, queuedId: queued.id },
  };
}
