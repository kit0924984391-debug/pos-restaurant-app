export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  storeId?: string;
  storeSlug?: string;
  path?: string;
  method?: string;
  ip?: string;
  [key: string]: any;
}

export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  environment: string;
  context?: LogContext;
  durationMs?: number;
  error?: {
    name?: string;
    message: string;
    code?: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
  [key: string]: any;
}

export type LogTransport = (entry: StructuredLogEntry) => void | Promise<void>;
