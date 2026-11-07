/**
 * Microservices Patterns Type Definitions
 * Covers Saga Orchestration, Domain Event Bus, Bulkhead Isolation, and API Gateway Aggregation.
 */

export type SagaStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPENSATING'
  | 'COMPENSATED'
  | 'FAILED';

export interface SagaStep<TContext = any> {
  name: string;
  action: (context: TContext) => Promise<any> | any;
  compensation: (context: TContext, error?: unknown) => Promise<void> | void;
}

export interface SagaExecutionResult<TContext = any> {
  status: SagaStatus;
  context: TContext;
  error?: string;
  completedSteps: string[];
  compensatedSteps: string[];
  durationMs: number;
}

export interface DomainEvent<TData = any> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: number;
  correlationId?: string;
  causationId?: string;
  data: TData;
  metadata?: Record<string, any>;
}

export type EventHandler<TData = any> = (
  event: DomainEvent<TData>
) => Promise<void> | void;

export interface BulkheadOptions {
  maxConcurrent?: number;
  maxQueue?: number;
  queueTimeoutMs?: number;
}

export interface BulkheadStats {
  activeCalls: number;
  queueSize: number;
  maxConcurrent: number;
  maxQueue: number;
  totalCompleted: number;
  totalRejected: number;
  totalTimeouts: number;
}

export interface AggregatorOptions {
  timeoutMs?: number;
  failSilently?: boolean;
}

export interface AggregatorResult<T> {
  data: Partial<T>;
  errors: Record<string, string>;
  isComplete: boolean;
  durationMs: number;
}
