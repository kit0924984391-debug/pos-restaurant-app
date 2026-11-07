import { Database } from './database';
import { PreparedStatement } from './types';

export interface SqliteOrderRecord {
  id: string;
  storeId: string;
  tableNo: number;
  status: string;
  totalAmount: number;
  customerName?: string;
}

export interface SqliteMenuItemRecord {
  id: string;
  storeId: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

/**
 * Optimizes SQLite database for ultra-high performance concurrent reads and writes
 */
export function enablePerformancePragmas(db: Database): void {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA cache_size = 10000');
  db.run('PRAGMA foreign_keys = ON');
}

/**
 * POS Order Repository implemented using Bun SQLite prepared statements & transactions
 */
export class PosOrderSqliteRepository {
  private db: Database;
  private stmts: {
    createTable: PreparedStatement;
    insertOrder: PreparedStatement;
    findById: PreparedStatement;
    listAll: PreparedStatement;
    updateStatus: PreparedStatement;
    deleteById: PreparedStatement;
  };

  constructor(db: Database) {
    this.db = db;

    // Initialize Schema
    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        storeId TEXT NOT NULL,
        tableNo INTEGER NOT NULL,
        status TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        customerName TEXT
      )
    `);

    // Prepare statements for hot paths
    this.stmts = {
      createTable: this.db.prepare('SELECT 1 FROM orders'),
      insertOrder: this.db.prepare(
        'INSERT INTO orders (id, storeId, tableNo, status, totalAmount, customerName) VALUES ($id, $storeId, $tableNo, $status, $totalAmount, $customerName)'
      ),
      findById: this.db.prepare('SELECT * FROM orders WHERE id = ?'),
      listAll: this.db.prepare('SELECT * FROM orders'),
      updateStatus: this.db.prepare('UPDATE orders SET status = $status WHERE id = $id'),
      deleteById: this.db.prepare('DELETE FROM orders WHERE id = ?'),
    };
  }

  create(order: SqliteOrderRecord): SqliteOrderRecord {
    this.stmts.insertOrder.run({
      $id: order.id,
      $storeId: order.storeId,
      $tableNo: order.tableNo,
      $status: order.status,
      $totalAmount: order.totalAmount,
      $customerName: order.customerName || '',
    });
    return order;
  }

  findById(id: string): SqliteOrderRecord | null {
    return this.stmts.findById.get(id) as SqliteOrderRecord | null;
  }

  listAll(): SqliteOrderRecord[] {
    return this.stmts.listAll.all() as SqliteOrderRecord[];
  }

  updateStatus(id: string, status: string): boolean {
    const result = this.stmts.updateStatus.run({
      $id: id,
      $status: status,
    });
    return result.changes > 0;
  }

  delete(id: string): boolean {
    const result = this.stmts.deleteById.run(id);
    return result.changes > 0;
  }

  /**
   * Batch insert multiple orders inside an atomic SQLite transaction
   */
  createMany(ordersList: SqliteOrderRecord[]): number {
    const insertManyTx = this.db.transaction((orders: SqliteOrderRecord[]) => {
      for (const order of orders) {
        this.create(order);
      }
      return orders.length;
    });

    return insertManyTx(ordersList);
  }
}
