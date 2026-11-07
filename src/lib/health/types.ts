export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface DependencyCheckResult {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface LivenessResult {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

export interface ReadinessResult {
  status: HealthStatus;
  healthy: boolean;
  timestamp: string;
  durationMs: number;
  checks: {
    database: DependencyCheckResult;
    [key: string]: DependencyCheckResult;
  };
}

export interface DeepHealthResult {
  service: string;
  status: HealthStatus;
  healthy: boolean;
  version: string;
  environment: string;
  runtime: string;
  timestamp: string;
  uptimeSeconds: number;
  durationMs: number;
  checks: {
    database: DependencyCheckResult;
    realtime: DependencyCheckResult;
    idempotency: DependencyCheckResult;
    [key: string]: DependencyCheckResult;
  };
}
