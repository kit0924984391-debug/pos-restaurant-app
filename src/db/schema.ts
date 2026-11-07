import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * Stores Table (Tenant)
 */
export const stores = sqliteTable(
  'Store',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('TRIAL'),
    trialEndsAt: integer('trialEndsAt', { mode: 'timestamp' }).notNull(),
    subscriptionEnd: integer('subscriptionEnd', { mode: 'timestamp' }).notNull(),
    planId: text('planId'),
    promptPayId: text('promptPayId').default(''),
    promptPayName: text('promptPayName').default(''),
    bankName: text('bankName').default(''),
    bankAccountNo: text('bankAccountNo').default(''),
    bankAccountName: text('bankAccountName').default(''),
    phone: text('phone'),
    address: text('address'),
    receiptFooter: text('receiptFooter').default('ขอบคุณที่อุดหนุนครับ/ค่ะ โอกาสหน้าเชิญใหม่'),
    tableCount: integer('tableCount').default(10),
    pointsRate: real('pointsRate').default(25),
    pointValue: real('pointValue').default(1),
    linemanGp: real('linemanGp').default(30),
    grabGp: real('grabGp').default(30),
    shopeeGp: real('shopeeGp').default(30),
    robinhoodGp: real('robinhoodGp').default(20),
    createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('Store_slug_key').on(table.slug),
  ]
);

/**
 * Users Table
 */
export const users = sqliteTable(
  'User',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('passwordHash').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    role: text('role').notNull().default('STORE_OWNER'),
    storeId: text('storeId').references(() => stores.id, { onDelete: 'cascade' }),
    createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('User_email_key').on(table.email),
    index('User_storeId_idx').on(table.storeId),
  ]
);

/**
 * Categories Table
 */
export const categories = sqliteTable(
  'Category',
  {
    id: text('id').primaryKey(),
    storeId: text('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sortOrder').default(0),
  },
  (table) => [
    index('Category_storeId_idx').on(table.storeId),
  ]
);

/**
 * Menu Items Table
 */
export const menuItems = sqliteTable(
  'MenuItem',
  {
    id: text('id').primaryKey(),
    storeId: text('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
    categoryId: text('categoryId').notNull().references(() => categories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    basePrice: real('basePrice').notNull().default(50),
    imageUrl: text('imageUrl'),
    isAvailable: integer('isAvailable', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sortOrder').default(0),
  },
  (table) => [
    index('MenuItem_storeId_idx').on(table.storeId),
    index('MenuItem_categoryId_idx').on(table.categoryId),
  ]
);

/**
 * Tables Table
 */
export const tables = sqliteTable(
  'Table',
  {
    id: text('id').primaryKey(),
    storeId: text('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
    tableNo: integer('tableNo').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('AVAILABLE'),
    currentSessionId: text('currentSessionId'),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('Table_storeId_tableNo_key').on(table.storeId, table.tableNo),
  ]
);

/**
 * Orders Table
 */
export const orders = sqliteTable(
  'Order',
  {
    id: text('id').primaryKey(),
    storeId: text('storeId').notNull().references(() => stores.id, { onDelete: 'cascade' }),
    tableId: text('tableId').references(() => tables.id, { onDelete: 'set null' }),
    tableNo: integer('tableNo').notNull().default(1),
    status: text('status').notNull().default('PENDING'),
    orderType: text('orderType').notNull().default('DINE_IN'),
    orderChannel: text('orderChannel').notNull().default('DINE_IN'),
    deliveryOrderId: text('deliveryOrderId'),
    riderName: text('riderName'),
    riderPhone: text('riderPhone'),
    totalAmount: real('totalAmount').notNull().default(0),
    discountAmount: real('discountAmount').notNull().default(0),
    netAmount: real('netAmount').notNull().default(0),
    gpPercent: real('gpPercent').default(0),
    gpAmount: real('gpAmount').default(0),
    netRevenue: real('netRevenue').default(0),
    paymentMethod: text('paymentMethod'),
    paymentStatus: text('paymentStatus').notNull().default('UNPAID'),
    slipUrl: text('slipUrl'),
    slipRef: text('slipRef'),
    slipAmount: real('slipAmount'),
    customerName: text('customerName'),
    note: text('note'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    paidAt: integer('paidAt', { mode: 'timestamp' }),
  },
  (table) => [
    index('Order_storeId_idx').on(table.storeId),
    index('Order_tableId_idx').on(table.tableId),
    index('Order_status_idx').on(table.status),
    index('Order_createdAt_idx').on(table.createdAt),
  ]
);

/**
 * Order Items Table
 */
export const orderItems = sqliteTable(
  'OrderItem',
  {
    id: text('id').primaryKey(),
    orderId: text('orderId').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: text('menuItemId').references(() => menuItems.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    price: real('price').notNull(),
    quantity: integer('quantity').notNull().default(1),
    selectedOptions: text('selectedOptions'),
    specialNote: text('specialNote'),
    status: text('status').notNull().default('PENDING'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  },
  (table) => [
    index('OrderItem_orderId_idx').on(table.orderId),
  ]
);

/**
 * Idempotency Keys Table for D1
 */
export const idempotencyKeys = sqliteTable(
  'IdempotencyKey',
  {
    key: text('key').primaryKey(),
    statusCode: integer('statusCode').notNull(),
    responseBody: text('responseBody').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('IdempotencyKey_expiresAt_idx').on(table.expiresAt),
  ]
);

// ----------------------------------------------------
// Drizzle Relations
// ----------------------------------------------------

export const storesRelations = relations(stores, ({ many }) => ({
  users: many(users),
  categories: many(categories),
  menuItems: many(menuItems),
  tables: many(tables),
  orders: many(orders),
}));

export const usersRelations = relations(users, ({ one }) => ({
  store: one(stores, {
    fields: [users.storeId],
    references: [stores.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  store: one(stores, {
    fields: [categories.storeId],
    references: [stores.id],
  }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  store: one(stores, {
    fields: [menuItems.storeId],
    references: [stores.id],
  }),
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  store: one(stores, {
    fields: [tables.storeId],
    references: [stores.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

// ----------------------------------------------------
// Type Inference Models
// ----------------------------------------------------

export type Store = InferSelectModel<typeof stores>;
export type NewStore = InferInsertModel<typeof stores>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type MenuItem = InferSelectModel<typeof menuItems>;
export type NewMenuItem = InferInsertModel<typeof menuItems>;

export type Table = InferSelectModel<typeof tables>;
export type NewTable = InferInsertModel<typeof tables>;

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

export type OrderItem = InferSelectModel<typeof orderItems>;
export type NewOrderItem = InferInsertModel<typeof orderItems>;

export type IdempotencyRecord = InferSelectModel<typeof idempotencyKeys>;
export type NewIdempotencyRecord = InferInsertModel<typeof idempotencyKeys>;
