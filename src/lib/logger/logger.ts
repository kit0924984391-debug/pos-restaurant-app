import {
  LogLevel,
  LOG_LEVEL_PRIORITY,
  StructuredLogEntry,
  LogContext,
  LogTransport,
} from './types';
import { sanitizeLogData } from './sanitizer';
import { getLogContext } from './context';

export interface LoggerOptions {
  service?: string;
  minLevel?: LogLevel;
  environment?: string;
  bindings?: Record<string, any>;
  transports?: LogTransport[];
  silent?: boolean;
}

export class Logger {
  private service: string;
  private minLevel: LogLevel;
  private environment: string;
  private bindings: Record<string, any>;
  private transports: LogTransport[];
  private silent: boolean;

  constructor(options: LoggerOptions = {}) {
    this.service = options.service || 'pos-restaurant-app';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.minLevel =
      options.minLevel ||
      ((process.env.LOG_LEVEL as LogLevel) ||
        (this.environment === 'production' ? 'info' : 'debug'));
    this.bindings = options.bindings || {};
    this.transports = options.transports ? [...options.transports] : [];
    this.silent = options.silent ?? false;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  /**
   * Spawns a child logger with persistent contextual bindings
   */
  child(bindings: Record<string, any>): Logger {
    return new Logger({
      service: this.service,
      minLevel: this.minLevel,
      environment: this.environment,
      bindings: { ...this.bindings, ...bindings },
      transports: this.transports,
      silent: this.silent,
    });
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;
    const currentPriority = LOG_LEVEL_PRIORITY[this.minLevel] ?? 1;
    const targetPriority = LOG_LEVEL_PRIORITY[level] ?? 1;
    return targetPriority >= currentPriority;
  }

  formatEntry(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>,
    error?: unknown
  ): StructuredLogEntry {
    const asyncCtx = getLogContext() || {};
    const mergedContext: LogContext = sanitizeLogData({
      ...asyncCtx,
      ...this.bindings,
    });

    const sanitizedMeta = meta ? sanitizeLogData(meta) : undefined;

    let errorInfo: StructuredLogEntry['error'] = undefined;
    if (error) {
      if (error instanceof Error) {
        errorInfo = {
          name: error.name,
          message: error.message,
          code: (error as any).code,
          stack: level === 'error' || level === 'fatal' ? error.stack : undefined,
        };
      } else {
        errorInfo = {
          message: String(error),
        };
      }
    }

    const entry: StructuredLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      environment: this.environment,
      ...(Object.keys(mergedContext).length > 0 && { context: mergedContext }),
      ...(errorInfo && { error: errorInfo }),
      ...(sanitizedMeta && { metadata: sanitizedMeta }),
    };

    return entry;
  }

  private emit(entry: StructuredLogEntry): void {
    // 1. Output to console using standard log level
    if (this.environment === 'production') {
      // Production: Structured single-line JSON for log aggregators (Logpush, CloudWatch, Datadog)
      const serialized = JSON.stringify(entry);
      if (entry.level === 'error' || entry.level === 'fatal') {
        console.error(serialized);
      } else if (entry.level === 'warn') {
        console.warn(serialized);
      } else {
        console.log(serialized);
      }
    } else {
      // Development: Readable structured output
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
      if (entry.level === 'error' || entry.level === 'fatal') {
        console.error(prefix, entry.message, entry.metadata || '', entry.error || '');
      } else if (entry.level === 'warn') {
        console.warn(prefix, entry.message, entry.metadata || '');
      } else {
        console.log(prefix, entry.message, entry.metadata || '');
      }
    }

    // 2. Dispatch to custom transports (if registered)
    for (const transport of this.transports) {
      try {
        transport(entry);
      } catch (e) {
        console.error('[LoggerTransportError]', e);
      }
    }
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    this.emit(this.formatEntry('debug', message, meta));
  }

  info(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    this.emit(this.formatEntry('info', message, meta));
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    this.emit(this.formatEntry('warn', message, meta));
  }

  error(message: string, errorOrMeta?: unknown, meta?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;

    if (errorOrMeta instanceof Error) {
      this.emit(this.formatEntry('error', message, meta, errorOrMeta));
    } else if (typeof errorOrMeta === 'object' && errorOrMeta !== null) {
      this.emit(this.formatEntry('error', message, errorOrMeta as Record<string, any>));
    } else if (typeof errorOrMeta === 'string') {
      this.emit(this.formatEntry('error', message, meta, new Error(errorOrMeta)));
    } else {
      this.emit(this.formatEntry('error', message, meta));
    }
  }

  fatal(message: string, errorOrMeta?: unknown, meta?: Record<string, any>): void {
    if (!this.shouldLog('fatal')) return;

    if (errorOrMeta instanceof Error) {
      this.emit(this.formatEntry('fatal', message, meta, errorOrMeta));
    } else if (typeof errorOrMeta === 'object' && errorOrMeta !== null) {
      this.emit(this.formatEntry('fatal', message, errorOrMeta as Record<string, any>));
    } else {
      this.emit(this.formatEntry('fatal', message, meta));
    }
  }
}

export const logger = new Logger();
export function getLogger(): Logger {
  return logger;
}
