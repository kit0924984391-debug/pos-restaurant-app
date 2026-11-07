/**
 * Bun SQLite Compatible Types
 * Conforms to bun:sqlite Database API specification
 */

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export type SQLQueryBindings =
  | string
  | bigint
  | number
  | boolean
  | null
  | Uint8Array
  | Record<string, any>;

export interface PreparedStatement<T = any, P extends any[] = any[]> {
  get(...params: P): T | null;
  all(...params: P): T[];
  values(...params: P): any[][];
  iterate(...params: P): IterableIterator<T>;
  run(...params: P): RunResult;
  columnNames: string[];
}

export type TransactionMode = 'deferred' | 'immediate' | 'exclusive';

export interface Transaction<TArgs extends any[] = any[], TReturn = any> {
  (...args: TArgs): TReturn;
  deferred: (...args: TArgs) => TReturn;
  immediate: (...args: TArgs) => TReturn;
  exclusive: (...args: TArgs) => TReturn;
}

export interface SQLiteDatabaseOptions {
  readonly?: boolean;
  create?: boolean;
  strict?: boolean;
}
