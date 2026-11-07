import { describe, it, expect, beforeEach } from 'vitest';
import {
  Database,
  SQLiteError,
  PosOrderSqliteRepository,
  enablePerformancePragmas,
} from '@/lib/sqlite';

describe('Bun SQLite Engine & Repository Suite', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  // 1. Basic Database Lifecycle & Direct Execution
  describe('1. Database Lifecycle & Direct Execution', () => {
    it('creates in-memory database and executes DDL/DML with db.run()', () => {
      expect(db.filename).toBe(':memory:');
      expect(db.inTransaction).toBe(false);

      const ddlResult = db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE
        )
      `);
      expect(ddlResult.changes).toBe(0);

      const insertResult = db.run(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['Somchai', 'somchai@pos.local']
      );
      expect(insertResult.changes).toBe(1);
      expect(insertResult.lastInsertRowid).toBe(1);
    });

    it('enforces open database state and throws SQLiteError after close()', () => {
      db.close();
      expect(() => db.run('SELECT 1')).toThrow(SQLiteError);
      try {
        db.run('SELECT 1');
      } catch (err: any) {
        expect(err.code).toBe('SQLITE_MISUSE');
      }
    });
  });

  // 2. Prepared Statements & Parameter Bindings
  describe('2. Prepared Statements & Query Methods', () => {
    beforeEach(() => {
      db.run(`
        CREATE TABLE menu_items (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          category TEXT NOT NULL
        )
      `);

      const insert = db.prepare(
        'INSERT INTO menu_items (name, price, category) VALUES (?, ?, ?)'
      );
      insert.run('Krapao Pork', 60, 'FOOD');
      insert.run('Tom Yum Kung', 120, 'FOOD');
      insert.run('Thai Milk Tea', 30, 'DRINK');
    });

    it('supports positional parameters and fetches single row via .get()', () => {
      const stmt = db.prepare('SELECT * FROM menu_items WHERE id = ?');
      const item: any = stmt.get(1);

      expect(item).toBeDefined();
      expect(item?.id).toBe(1);
      expect(item?.name).toBe('Krapao Pork');
      expect(item?.price).toBe(60);
    });

    it('supports named parameters ($name, :name) in statements', () => {
      const namedStmt = db.prepare(
        'INSERT INTO menu_items (name, price, category) VALUES ($name, $price, $category)'
      );
      namedStmt.run({
        $name: 'Fried Rice',
        $price: 55,
        $category: 'FOOD',
      });

      const queryStmt = db.prepare('SELECT * FROM menu_items WHERE name = ?');
      const result: any = queryStmt.get('Fried Rice');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Fried Rice');
      expect(result?.price).toBe(55);
    });

    it('fetches all rows via .all() and raw arrays via .values()', () => {
      const allStmt = db.prepare('SELECT * FROM menu_items');
      const allRows = allStmt.all();
      expect(allRows.length).toBe(3);

      const valuesStmt = db.prepare('SELECT name, price FROM menu_items');
      const rawValues = valuesStmt.values();
      expect(rawValues.length).toBe(3);
      expect(Array.isArray(rawValues[0])).toBe(true);
      expect(rawValues[0]).toEqual(['Krapao Pork', 60]);
      expect(valuesStmt.columnNames).toEqual(['name', 'price']);
    });

    it('iterates over result sets memory-efficiently using .iterate()', () => {
      const iterStmt = db.prepare('SELECT * FROM menu_items');
      const collectedNames: string[] = [];

      for (const row of Array.from(iterStmt.iterate())) {
        collectedNames.push((row as any).name);
      }

      expect(collectedNames).toEqual(['Krapao Pork', 'Tom Yum Kung', 'Thai Milk Tea']);
    });
  });

  // 3. Transactions & Rollback Behavior
  describe('3. Transactions & Rollback Modes', () => {
    beforeEach(() => {
      db.run(`
        CREATE TABLE accounts (
          id INTEGER PRIMARY KEY,
          owner TEXT NOT NULL,
          balance REAL NOT NULL
        )
      `);
      db.run('INSERT INTO accounts (owner, balance) VALUES (?, ?)', ['Store Cashbox', 1000]);
    });

    it('commits transaction operations when successful', () => {
      const updateBalanceTx = db.transaction((amountToAdd: number) => {
        db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run({
          balance: 1000 + amountToAdd,
        });
        return true;
      });

      const success = updateBalanceTx(500);
      expect(success).toBe(true);
      expect(db.inTransaction).toBe(false);

      const row: any = db.prepare('SELECT * FROM accounts WHERE id = ?').get(1);
      expect(row?.balance).toBe(1500);
    });

    it('rolls back database state automatically when transaction throws an error', () => {
      const failingTx = db.transaction(() => {
        db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run({
          balance: 9999,
        });
        throw new Error('Payment gateway network timeout!');
      });

      expect(() => failingTx()).toThrow('Payment gateway network timeout!');
      expect(db.inTransaction).toBe(false);

      // Verify balance was rolled back to original 1000
      const row: any = db.prepare('SELECT * FROM accounts WHERE id = ?').get(1);
      expect(row?.balance).toBe(1000);
    });

    it('supports transaction execution modes (.deferred, .immediate, .exclusive)', () => {
      const tx = db.transaction(() => 'tx_done');
      expect(typeof tx.deferred).toBe('function');
      expect(typeof tx.immediate).toBe('function');
      expect(typeof tx.exclusive).toBe('function');

      expect(tx.immediate()).toBe('tx_done');
      expect(tx.deferred()).toBe('tx_done');
      expect(tx.exclusive()).toBe('tx_done');
    });
  });

  // 4. Performance Pragmas & Serialization
  describe('4. Performance Pragmas & Serialization', () => {
    it('applies WAL mode and performance tuning pragmas without error', () => {
      expect(() => enablePerformancePragmas(db)).not.toThrow();
    });

    it('serializes database to buffer and restores via Database.deserialize', () => {
      db.run('CREATE TABLE notes (id INTEGER PRIMARY KEY, content TEXT)');
      db.run('INSERT INTO notes (content) VALUES (?)', ['Recipe note: Add extra basil']);

      const buffer = db.serialize();
      expect(buffer instanceof Uint8Array).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);

      const restoredDb = Database.deserialize(buffer);
      const row: any = restoredDb.prepare('SELECT * FROM notes WHERE id = ?').get(1);
      expect(row?.content).toBe('Recipe note: Add extra basil');
    });
  });

  // 5. POS Order Repository Implementation
  describe('5. POS Order Repository Implementation (bun-sqlite pattern)', () => {
    it('performs CRUD operations using prepared statements', () => {
      const repo = new PosOrderSqliteRepository(db);

      // 1. Create
      const created = repo.create({
        id: 'ord_pos_001',
        storeId: 'store_central',
        tableNo: 4,
        status: 'PENDING',
        totalAmount: 180,
        customerName: 'Khun Somchai',
      });
      expect(created.id).toBe('ord_pos_001');

      // 2. Find By Id
      const found = repo.findById('ord_pos_001');
      expect(found).toBeDefined();
      expect(found?.tableNo).toBe(4);
      expect(found?.totalAmount).toBe(180);

      // 3. Update Status
      const updated = repo.updateStatus('ord_pos_001', 'SERVED');
      expect(updated).toBe(true);
      const afterUpdate = repo.findById('ord_pos_001');
      expect(afterUpdate?.status).toBe('SERVED');

      // 4. List All
      const allOrders = repo.listAll();
      expect(allOrders.length).toBe(1);

      // 5. Delete
      const deleted = repo.delete('ord_pos_001');
      expect(deleted).toBe(true);
      expect(repo.findById('ord_pos_001')).toBeNull();
    });

    it('batch inserts multiple orders inside an atomic transaction', () => {
      const repo = new PosOrderSqliteRepository(db);

      const ordersToInsert = [
        { id: 'b_1', storeId: 'store_1', tableNo: 1, status: 'COOKING', totalAmount: 70 },
        { id: 'b_2', storeId: 'store_1', tableNo: 2, status: 'COOKING', totalAmount: 150 },
        { id: 'b_3', storeId: 'store_1', tableNo: 3, status: 'READY', totalAmount: 220 },
      ];

      const insertedCount = repo.createMany(ordersToInsert);
      expect(insertedCount).toBe(3);

      const all = repo.listAll();
      expect(all.length).toBe(3);
    });
  });
});
