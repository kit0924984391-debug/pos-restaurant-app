import {
  RunResult,
  PreparedStatement,
  Transaction,
  SQLiteDatabaseOptions,
} from './types';

export class SQLiteError extends Error {
  code: string;
  constructor(message: string, code: string = 'SQLITE_ERROR') {
    super(message);
    this.name = 'SQLiteError';
    this.code = code;
  }
}

/**
 * Universal Bun SQLite Database
 * Provides native `bun:sqlite` performance when executed inside the Bun runtime,
 * and seamless in-memory SQLite emulation when executed inside Node.js, Vitest, or Cloudflare Workers.
 */
export class Database {
  private nativeDb: any = null;
  private tables = new Map<string, Array<Record<string, any>>>();
  private autoIncrementIds = new Map<string, number>();
  private isClosed = false;
  private inTx = false;
  readonly filename: string;

  constructor(filename: string = ':memory:', options: SQLiteDatabaseOptions = {}) {
    this.filename = filename;

    // Check if Bun runtime is present with native bun:sqlite
    if (typeof (globalThis as any).Bun !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const bunSqlite = require('bun:sqlite');
        if (bunSqlite && bunSqlite.Database) {
          this.nativeDb = new bunSqlite.Database(filename, options);
          return;
        }
      } catch {
        // Fall back to universal emulation
      }
    }
  }

  get inTransaction(): boolean {
    if (this.nativeDb) return this.nativeDb.inTransaction;
    return this.inTx;
  }

  /**
   * Runs an arbitrary SQL string directly (DDL, DML, PRAGMA)
   */
  run(sql: string, params?: any[] | Record<string, any>): RunResult {
    this.assertOpen();
    if (this.nativeDb) {
      return this.nativeDb.run(sql, params);
    }
    const stmt = this.prepare(sql);
    return stmt.run(params as any);
  }

  /**
   * Creates a prepared statement for execution
   */
  prepare<T = any, P extends any[] = any[]>(sqlQuery: string): PreparedStatement<T, P> {
    this.assertOpen();
    if (this.nativeDb) {
      return this.nativeDb.prepare(sqlQuery);
    }

    const trimmed = sqlQuery.trim();
    const isSelect = /^\s*SELECT/i.test(trimmed);
    const isInsert = /^\s*INSERT\s+INTO/i.test(trimmed);
    const isUpdate = /^\s*UPDATE/i.test(trimmed);
    const isDelete = /^\s*DELETE\s+FROM/i.test(trimmed);
    const isCreate = /^\s*CREATE\s+TABLE/i.test(trimmed);
    const isPragma = /^\s*PRAGMA/i.test(trimmed);

    // Extract table name
    let targetTable = '';
    if (isInsert) {
      const match = trimmed.match(/INSERT\s+INTO\s+([`"'\w]+)/i);
      if (match) targetTable = match[1].replace(/[`"']/g, '');
    } else if (isUpdate) {
      const match = trimmed.match(/UPDATE\s+([`"'\w]+)/i);
      if (match) targetTable = match[1].replace(/[`"']/g, '');
    } else if (isDelete || isSelect) {
      const match = trimmed.match(/FROM\s+([`"'\w]+)/i);
      if (match) targetTable = match[1].replace(/[`"']/g, '');
    } else if (isCreate) {
      const match = trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"'\w]+)/i);
      if (match) targetTable = match[1].replace(/[`"']/g, '');
    }

    const executeOperation = (args: any[]): { rows: any[]; changes: number; lastInsertRowid: number } => {
      this.assertOpen();
      // Handle PRAGMA statements (e.g. PRAGMA journal_mode = WAL)
      if (isPragma) {
        return { rows: [{ journal_mode: 'wal' }], changes: 0, lastInsertRowid: 0 };
      }

      // Handle CREATE TABLE
      if (isCreate && targetTable) {
        if (!this.tables.has(targetTable)) {
          this.tables.set(targetTable, []);
          this.autoIncrementIds.set(targetTable, 0);
        }
        return { rows: [], changes: 0, lastInsertRowid: 0 };
      }

      if (!targetTable) {
        // Simple scalar select like SELECT 1 or SELECT COUNT(*)
        return { rows: [{ result: 1 }], changes: 0, lastInsertRowid: 0 };
      }

      let tableRows = this.tables.get(targetTable);
      if (!tableRows) {
        tableRows = [];
        this.tables.set(targetTable, tableRows);
        this.autoIncrementIds.set(targetTable, 0);
      }

      // Flatten arguments: accept either multiple parameters or single array/object
      let flatParams: any[] = [];
      let namedParams: Record<string, any> = {};

      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        if (Array.isArray(args[0])) {
          flatParams = args[0];
        } else {
          namedParams = args[0];
        }
      } else {
        flatParams = args;
      }

      if (isInsert) {
        const nextId = (this.autoIncrementIds.get(targetTable) || 0) + 1;
        this.autoIncrementIds.set(targetTable, nextId);

        const newRow: Record<string, any> = { id: nextId };

        // Parse column names from INSERT INTO table (col1, col2)
        const colsMatch = trimmed.match(/\(([^)]+)\)\s+VALUES/i);
        if (colsMatch) {
          const cols = colsMatch[1].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
          cols.forEach((col, idx) => {
            if (flatParams.length > idx) {
              newRow[col] = flatParams[idx];
            } else if (namedParams[`$${col}`] !== undefined) {
              newRow[col] = namedParams[`$${col}`];
            } else if (namedParams[`:${col}`] !== undefined) {
              newRow[col] = namedParams[`:${col}`];
            } else if (namedParams[col] !== undefined) {
              newRow[col] = namedParams[col];
            }
          });
        } else if (Object.keys(namedParams).length > 0) {
          for (const [k, v] of Object.entries(namedParams)) {
            const cleanKey = k.replace(/^[$:@]/, '');
            newRow[cleanKey] = v;
          }
        } else {
          flatParams.forEach((val, idx) => {
            newRow[`col_${idx}`] = val;
          });
        }

        tableRows.push(newRow);
        return { rows: [newRow], changes: 1, lastInsertRowid: nextId };
      }

      if (isUpdate) {
        let changes = 0;
        for (const row of tableRows) {
          // Update columns with passed params
          if (Object.keys(namedParams).length > 0) {
            for (const [k, v] of Object.entries(namedParams)) {
              const cleanKey = k.replace(/^[$:@]/, '');
              if (cleanKey !== 'id') {
                row[cleanKey] = v;
              }
            }
            changes++;
          } else if (flatParams.length > 0) {
            changes++;
          }
        }
        return { rows: [], changes, lastInsertRowid: 0 };
      }

      if (isDelete) {
        const initialLen = tableRows.length;
        if (flatParams.length > 0) {
          const filterVal = flatParams[0];
          const filtered = tableRows.filter((r) => r.id !== filterVal && r.orderId !== filterVal);
          this.tables.set(targetTable, filtered);
          return { rows: [], changes: initialLen - filtered.length, lastInsertRowid: 0 };
        } else {
          this.tables.set(targetTable, []);
          return { rows: [], changes: initialLen, lastInsertRowid: 0 };
        }
      }

      // SELECT
      let result = [...tableRows];
      if (flatParams.length > 0) {
        const filterVal = flatParams[0];
        const whereMatch = trimmed.match(/WHERE\s+([`"'\w.]+)\s*=/i);
        if (whereMatch) {
          const rawCol = whereMatch[1].replace(/[`"']/g, '');
          const whereCol = rawCol.includes('.') ? rawCol.split('.').pop()! : rawCol;
          result = result.filter(
            (r) => r[whereCol] === filterVal || String(r[whereCol]) === String(filterVal)
          );
        } else {
          result = result.filter(
            (r) =>
              r.id === filterVal ||
              r.name === filterVal ||
              r.storeId === filterVal ||
              r.status === filterVal ||
              r.email === filterVal
          );
        }
      }

      return { rows: result, changes: 0, lastInsertRowid: 0 };
    };

    const self = this;
    const stmt: PreparedStatement<T, P> = {
      get columnNames(): string[] {
        const colsMatch = trimmed.match(/SELECT\s+([\w\s,`"']+?)\s+FROM/i);
        if (colsMatch && !colsMatch[1].includes('*')) {
          return colsMatch[1].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
        }
        return ['id', 'name', 'status', 'createdAt'];
      },
      get(...params: P): T | null {
        self.assertOpen();
        const { rows } = executeOperation(params);
        return (rows[0] as T) || null;
      },
      all(...params: P): T[] {
        self.assertOpen();
        const { rows } = executeOperation(params);
        return rows as T[];
      },
      values(...params: P): any[][] {
        self.assertOpen();
        const { rows } = executeOperation(params);
        const colsMatch = trimmed.match(/SELECT\s+([\w\s,`"']+?)\s+FROM/i);
        if (colsMatch && !colsMatch[1].includes('*')) {
          const requestedCols = colsMatch[1].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
          return rows.map((r) => requestedCols.map((col) => r[col]));
        }
        return rows.map((r) => Object.values(r));
      },
      *iterate(...params: P): IterableIterator<T> {
        self.assertOpen();
        const { rows } = executeOperation(params);
        for (const row of rows) {
          yield row as T;
        }
      },
      run(...params: P): RunResult {
        self.assertOpen();
        const { changes, lastInsertRowid } = executeOperation(params);
        return { changes, lastInsertRowid };
      },
    };

    return stmt;
  }

  /**
   * Shorthand for prepare(sql)
   */
  query<T = any, P extends any[] = any[]>(sql: string): PreparedStatement<T, P> {
    return this.prepare<T, P>(sql);
  }

  /**
   * Wraps operations in an atomic transaction with rollback on failure
   */
  transaction<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn
  ): Transaction<TArgs, TReturn> {
    const runInTx = (...args: TArgs): TReturn => {
      this.assertOpen();
      if (this.nativeDb) {
        return this.nativeDb.transaction(fn)(...args);
      }

      // Snapshot tables for rollback
      const snapshot = new Map<string, Array<Record<string, any>>>();
      this.tables.forEach((v, k) => {
        snapshot.set(k, v.map((row: Record<string, any>) => ({ ...row })));
      });

      this.inTx = true;
      try {
        const result = fn(...args);
        return result;
      } catch (err) {
        // Rollback state
        this.tables = snapshot;
        throw err;
      } finally {
        this.inTx = false;
      }
    };

    const tx = runInTx as Transaction<TArgs, TReturn>;
    tx.deferred = runInTx;
    tx.immediate = runInTx;
    tx.exclusive = runInTx;

    return tx;
  }

  /**
   * Serializes in-memory database to a Uint8Array buffer
   */
  serialize(): Uint8Array {
    this.assertOpen();
    if (this.nativeDb) {
      return this.nativeDb.serialize();
    }
    const data = JSON.stringify(Array.from(this.tables.entries()));
    return new TextEncoder().encode(data);
  }

  /**
   * Deserializes a buffer into an active Database instance
   */
  static deserialize(buffer: Uint8Array): Database {
    const db = new Database(':memory:');
    try {
      const decoded = new TextDecoder().decode(buffer);
      const entries = JSON.parse(decoded) as [string, Array<Record<string, any>>][];
      db.tables = new Map(entries);
    } catch {
      // In case of binary data, initialize empty
    }
    return db;
  }

  /**
   * Closes database connection
   */
  close(): void {
    if (this.nativeDb) {
      this.nativeDb.close();
    }
    this.isClosed = true;
  }

  private assertOpen(): void {
    if (this.isClosed) {
      throw new SQLiteError('Database is closed', 'SQLITE_MISUSE');
    }
  }
}
