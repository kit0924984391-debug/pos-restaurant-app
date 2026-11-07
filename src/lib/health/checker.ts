import { prisma } from '@/lib/prisma';
import { getWebSocketManager } from '@/lib/websocket/server';
import { getIdempotencyStore } from '@/lib/idempotency/store';
import {
  DependencyCheckResult,
  LivenessResult,
  ReadinessResult,
  DeepHealthResult,
  HealthStatus,
} from './types';

const processStartTime = Date.now();

/**
 * HealthChecker Engine
 * Coordinates liveness, readiness, startup, and deep dependency health diagnostics.
 */
export class HealthChecker {
  private startTime = processStartTime;

  /**
   * Database check with timeout protection
   */
  async checkDatabase(timeoutMs = 3000): Promise<DependencyCheckResult> {
    const start = Date.now();

    const dbQueryPromise = (async () => {
      // Execute lightweight raw query
      await prisma.$queryRaw`SELECT 1`;
      return true;
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Database check timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      await Promise.race([dbQueryPromise, timeoutPromise]);
      const latencyMs = Date.now() - start;
      return {
        status: 'healthy',
        latencyMs,
        message: 'Database query executed successfully',
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: 'unhealthy',
        latencyMs,
        error: String(err?.message || err),
      };
    }
  }

  /**
   * Real-time Hub and WebSocket check
   */
  checkRealtime(): DependencyCheckResult {
    try {
      const manager = getWebSocketManager();
      const stats = manager.getStats();
      return {
        status: 'healthy',
        details: {
          activeConnections: stats.activeConnections,
          activeRooms: stats.totalRooms,
          messagesProcessed: stats.totalMessagesProcessed,
        },
      };
    } catch (err: any) {
      return {
        status: 'unhealthy',
        error: String(err?.message || err),
      };
    }
  }

  /**
   * Idempotency subsystem check
   */
  async checkIdempotency(): Promise<DependencyCheckResult> {
    const start = Date.now();
    try {
      const store = getIdempotencyStore();
      // Test read non-existent sentinel key
      await store.get('__health_probe_key__');
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        message: 'Idempotency store responsive',
      };
    } catch (err: any) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: String(err?.message || err),
      };
    }
  }

  /**
   * Minimal Liveness Probe: Never depends on external services
   */
  getLiveness(): LivenessResult {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Readiness Probe: Verifies critical services can process customer traffic
   */
  async getReadiness(dbTimeoutMs = 3000): Promise<ReadinessResult> {
    const start = Date.now();
    const dbCheck = await this.checkDatabase(dbTimeoutMs);

    const healthy = dbCheck.status === 'healthy';
    const status: HealthStatus = healthy ? 'healthy' : 'unhealthy';

    return {
      status,
      healthy,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      checks: {
        database: dbCheck,
      },
    };
  }

  /**
   * Deep Diagnostics: Comprehensive health of all subsystems
   */
  async getDeepHealth(): Promise<DeepHealthResult> {
    const start = Date.now();

    const [dbCheck, idempotencyCheck] = await Promise.all([
      this.checkDatabase(3500),
      this.checkIdempotency(),
    ]);

    const realtimeCheck = this.checkRealtime();

    const isDbHealthy = dbCheck.status === 'healthy';
    const isRealtimeHealthy = realtimeCheck.status === 'healthy';
    const isIdempotencyHealthy = idempotencyCheck.status === 'healthy';

    let status: HealthStatus = 'healthy';
    if (!isDbHealthy) {
      status = 'unhealthy';
    } else if (!isRealtimeHealthy || !isIdempotencyHealthy) {
      status = 'degraded';
    }

    const healthy = status !== 'unhealthy';

    return {
      service: 'pos-restaurant-app',
      status,
      healthy,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      runtime: typeof (globalThis as any).WebSocketPair !== 'undefined' ? 'cloudflare-workers' : 'node',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      durationMs: Date.now() - start,
      checks: {
        database: dbCheck,
        realtime: realtimeCheck,
        idempotency: idempotencyCheck,
      },
    };
  }
}

export const defaultHealthChecker = new HealthChecker();

export function getHealthChecker(): HealthChecker {
  return defaultHealthChecker;
}
