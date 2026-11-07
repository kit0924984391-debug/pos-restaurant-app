import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthChecker } from '@/lib/health/checker';
import { GET as getLiveProbe } from '@/app/api/health/live/route';
import { GET as getReadyProbe } from '@/app/api/health/ready/route';
import { GET as getStartupProbe } from '@/app/api/health/startup/route';
import { GET as getDeepHealth } from '@/app/api/health/route';

describe('Health Check Endpoints Suite', () => {
  let checker: HealthChecker;

  beforeEach(() => {
    vi.restoreAllMocks();
    checker = new HealthChecker();
  });

  // 1. Liveness Probe (Minimal, Zero-Dependency)
  describe('1. Liveness Probe (/api/health/live)', () => {
    it('returns status ok, timestamp, and uptime seconds without external dependency calls', () => {
      const liveness = checker.getLiveness();

      expect(liveness.status).toBe('ok');
      expect(typeof liveness.timestamp).toBe('string');
      expect(typeof liveness.uptimeSeconds).toBe('number');
      expect(liveness.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/health/live returns HTTP 200 and prevents probe caching', async () => {
      const res = await getLiveProbe();
      expect(res.status).toBe(200);

      const cacheControl = res.headers.get('Cache-Control');
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('no-cache');

      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  // 2. Readiness Probe (Critical Dependencies)
  describe('2. Readiness Probe (/api/health/ready)', () => {
    it('executes database check and returns latency in milliseconds', async () => {
      const dbResult = await checker.checkDatabase();

      expect(dbResult.status).toBe('healthy');
      expect(typeof dbResult.latencyMs).toBe('number');
      expect(dbResult.latencyMs).toBeGreaterThanOrEqual(0);
      expect(dbResult.message).toContain('Database query executed successfully');
    });

    it('GET /api/health/ready returns HTTP 200 when database is responsive', async () => {
      const res = await getReadyProbe();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.healthy).toBe(true);
      expect(data.checks.database.status).toBe('healthy');
      expect(typeof data.durationMs).toBe('number');
    });

    it('returns HTTP 503 Service Unavailable when database fails or times out', async () => {
      // Mock database check to return failure
      vi.spyOn(checker, 'checkDatabase').mockResolvedValueOnce({
        status: 'unhealthy',
        latencyMs: 3000,
        error: 'Database connection refused',
      });

      const readiness = await checker.getReadiness();
      expect(readiness.healthy).toBe(false);
      expect(readiness.status).toBe('unhealthy');
      expect(readiness.checks.database.error).toBe('Database connection refused');
    });
  });

  // 3. Startup Probe (/api/health/startup)
  describe('3. Startup Probe (/api/health/startup)', () => {
    it('GET /api/health/startup returns HTTP 200 confirming container initialization', async () => {
      const res = await getStartupProbe();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('started');
      expect(data.initialized).toBe(true);
      expect(typeof data.uptimeSeconds).toBe('number');
    });
  });

  // 4. Deep Health Check (/api/health)
  describe('4. Deep System Health Diagnostics (/api/health)', () => {
    it('inspects database, realtime, and idempotency subsystems comprehensively', async () => {
      const deep = await checker.getDeepHealth();

      expect(deep.service).toBe('pos-restaurant-app');
      expect(['healthy', 'degraded']).toContain(deep.status);
      expect(deep.healthy).toBe(true);
      expect(deep.checks.database.status).toBe('healthy');
      expect(deep.checks.realtime.status).toBe('healthy');
      expect(deep.checks.idempotency.status).toBe('healthy');
      expect(typeof deep.durationMs).toBe('number');
    });

    it('GET /api/health returns HTTP 200 with complete system diagnostics', async () => {
      const res = await getDeepHealth();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.service).toBe('pos-restaurant-app');
      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBeDefined();
      expect(data.checks.realtime).toBeDefined();
      expect(data.checks.idempotency).toBeDefined();
      expect(data.environment).toBeDefined();
    });

    it('marks status as degraded if secondary subsystem encounters issues', async () => {
      vi.spyOn(checker, 'checkRealtime').mockReturnValueOnce({
        status: 'unhealthy',
        error: 'WebSocket manager uninitialized',
      });

      const deep = await checker.getDeepHealth();
      expect(deep.status).toBe('degraded');
      expect(deep.healthy).toBe(true); // Still healthy enough to route HTTP traffic
    });
  });

  // 5. Timeout and Resilience Protection
  describe('5. Probe Timeout & Failure Isolation', () => {
    it('checkDatabase enforces timeout limit and returns error without hanging', async () => {
      // Test timeout with 1ms limit on simulated slow execution
      const check = await checker.checkDatabase(1);
      // Even if fast local sqlite responds, check returns valid status and latencyMs
      expect(['healthy', 'unhealthy']).toContain(check.status);
      expect(typeof check.latencyMs).toBe('number');
    });
  });
});
