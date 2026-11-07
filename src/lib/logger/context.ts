import { LogContext } from './types';

let asyncLocalStorage: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AsyncLocalStorage } = require('node:async_hooks');
  if (AsyncLocalStorage) {
    asyncLocalStorage = new AsyncLocalStorage();
  }
} catch {
  // AsyncLocalStorage not available in this environment
}

/**
 * Runs a function inside an asynchronous log context.
 * Automatically merges with existing outer context when nested.
 */
export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  if (asyncLocalStorage) {
    const parentContext = asyncLocalStorage.getStore();
    const merged = parentContext ? { ...parentContext, ...context } : { ...context };
    return asyncLocalStorage.run(merged, fn);
  }
  return fn();
}

/**
 * Retrieves the current request log context
 */
export function getLogContext(): LogContext | undefined {
  if (asyncLocalStorage) {
    return asyncLocalStorage.getStore();
  }
  return undefined;
}

/**
 * Mutates or attaches a property to the current active log context
 */
export function setLogContextProperty(key: string, value: any): void {
  if (asyncLocalStorage) {
    const current = asyncLocalStorage.getStore();
    if (current && typeof current === 'object') {
      current[key] = value;
    }
  }
}
