import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@/db';
import {
  stores,
  users,
  categories,
  menuItems,
  tables,
  orders,
  orderItems,
  idempotencyKeys,
  storesRelations,
  ordersRelations,
  menuItemsRelations,
  getDrizzleDb,
  executeD1Batch,
  queryHelpers,
  type Store,
  type Order,
  type MenuItem,
  type User,
} from '@/db';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import drizzleConfig from '../../drizzle.config';

describe('Drizzle ORM for Cloudflare D1 Suite', () => {
  // 1. Schema Definitions & Type Inference
  describe('1. Schema Definitions & Type Inference', () => {
    it('defines Store table schema with proper column types and defaults', () => {
      expect(stores.id).toBeDefined();
      expect(stores.slug).toBeDefined();
      expect(stores.name).toBeDefined();
      expect(stores.status).toBeDefined();
      expect(stores.tableCount).toBeDefined();
      expect(stores.createdAt).toBeDefined();

      const sampleStore: Store = {
        id: 'store_123',
        slug: 'somjai-pos',
        name: 'ร้านอาหารป้าสมใจ',
        description: 'อาหารตามสั่งรสเด็ด',
        status: 'ACTIVE',
        trialEndsAt: new Date(),
        subscriptionEnd: new Date(),
        planId: 'plan_pro',
        promptPayId: '0812345678',
        promptPayName: 'สมใจ',
        bankName: 'KBANK',
        bankAccountNo: '1234567890',
        bankAccountName: 'สมใจ ใจดี',
        phone: '0891234567',
        address: 'Bangkok',
        receiptFooter: 'ขอบคุณครับ',
        tableCount: 15,
        pointsRate: 25,
        pointValue: 1,
        linemanGp: 30,
        grabGp: 30,
        shopeeGp: 30,
        robinhoodGp: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(sampleStore.slug).toBe('somjai-pos');
      expect(sampleStore.tableCount).toBe(15);
    });

    it('defines Order and OrderItem schemas with foreign keys and relations', () => {
      expect(orders.storeId).toBeDefined();
      expect(orders.totalAmount).toBeDefined();
      expect(orders.status).toBeDefined();
      expect(orders.slipUrl).toBeDefined();

      expect(orderItems.orderId).toBeDefined();
      expect(orderItems.menuItemId).toBeDefined();
      expect(orderItems.quantity).toBeDefined();

      // Verify Drizzle relations configurations exist
      expect(ordersRelations).toBeDefined();
      expect(storesRelations).toBeDefined();
      expect(menuItemsRelations).toBeDefined();
    });

    it('defines IdempotencyKey schema for D1 cache & deduplication', () => {
      expect(idempotencyKeys.key).toBeDefined();
      expect(idempotencyKeys.statusCode).toBeDefined();
      expect(idempotencyKeys.responseBody).toBeDefined();
      expect(idempotencyKeys.expiresAt).toBeDefined();
    });
  });

  // 2. Drizzle SQL Query Builder & Syntax Generation
  describe('2. Drizzle SQL Query Builder & D1 Parameterization', () => {
    it('generates parameterized SQL for filtering orders by store and status', () => {
      const mockD1 = {
        prepare: vi.fn(),
        batch: vi.fn(),
        dump: vi.fn(),
        exec: vi.fn(),
      } as unknown as D1Database;

      const db = getDrizzleDb(mockD1);

      const query = db
        .select()
        .from(orders)
        .where(and(eq(orders.storeId, 'store_abc'), eq(orders.status, 'COOKING')))
        .orderBy(desc(orders.createdAt));

      const generatedSql = query.toSQL();

      expect(generatedSql.sql).toContain('select');
      expect(generatedSql.sql).toContain('"Order"');
      expect(generatedSql.sql).toContain('"storeId" = ?');
      expect(generatedSql.sql).toContain('"status" = ?');
      expect(generatedSql.params).toEqual(['store_abc', 'COOKING']);
    });

    it('generates relational join SQL between Order and OrderItem', () => {
      const mockD1 = {
        prepare: vi.fn(),
        batch: vi.fn(),
      } as unknown as D1Database;

      const db = getDrizzleDb(mockD1);

      const joinQuery = db
        .select({
          orderId: orders.id,
          tableNo: orders.tableNo,
          itemName: orderItems.name,
          itemPrice: orderItems.price,
        })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .where(eq(orders.storeId, 'store_xyz'));

      const sqlObj = joinQuery.toSQL();

      expect(sqlObj.sql).toContain('join "OrderItem" on "Order"."id" = "OrderItem"."orderId"');
      expect(sqlObj.params).toEqual(['store_xyz']);
    });

    it('generates prepared statement with placeholders for hot-path queries', () => {
      const mockD1 = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      } as unknown as D1Database;

      const db = getDrizzleDb(mockD1);

      const preparedStatement = db
        .select()
        .from(menuItems)
        .where(eq(menuItems.storeId, sql.placeholder('storeId')))
        .prepare();

      expect(preparedStatement).toBeDefined();
    });
  });

  // 3. D1 Native Batch API (Transactions without SQL BEGIN)
  describe('3. D1 Native Batch API (Transactions without SQL BEGIN)', () => {
    it('executes atomic multi-statement operations via db.batch() avoiding D1_ERROR', async () => {
      const batchSpy = vi.fn().mockResolvedValue([
        { results: [{ id: 'order_100' }], success: true },
        { results: [{ id: 'item_101' }], success: true },
      ]);
      const prepareSpy = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
      });

      const mockD1 = {
        prepare: prepareSpy,
        batch: batchSpy,
      } as unknown as D1Database;

      const db = getDrizzleDb(mockD1);

      const insertOrder = db.insert(orders).values({
        id: 'order_100',
        storeId: 'store_1',
        totalAmount: 120,
        status: 'PENDING',
      });

      const insertItem = db.insert(orderItems).values({
        id: 'item_101',
        orderId: 'order_100',
        name: 'ข้าวผัดหมู',
        price: 60,
        quantity: 2,
      });

      const results = await executeD1Batch(db, [insertOrder, insertItem]);

      expect(batchSpy).toHaveBeenCalled();
      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
    });
  });

  // 4. Configuration & Best Practices Compliance
  describe('4. Drizzle Configuration & Migration Rules', () => {
    it('drizzle.config.ts conforms strictly to SQLite dialect and D1 HTTP driver', () => {
      expect(drizzleConfig.dialect).toBe('sqlite');
      expect((drizzleConfig as any).driver).toBe('d1-http');
      expect(drizzleConfig.schema).toBe('./src/db/schema.ts');
      expect(drizzleConfig.out).toBe('./drizzle/migrations');
      expect((drizzleConfig as any).dbCredentials).toBeDefined();
      expect((drizzleConfig as any).dbCredentials.databaseId).toBeDefined();
    });

    it('queryHelpers formats Date instances to Unix timestamps', () => {
      const testDate = new Date('2026-10-16T12:00:00Z');
      const timestamp = queryHelpers.toTimestamp(testDate);
      expect(timestamp).toBe(Math.floor(testDate.getTime() / 1000));
    });
  });
});
