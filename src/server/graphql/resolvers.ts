/**
 * GraphQL Implementation - Resolvers
 * 
 * Provides Type, Query, and Mutation resolvers with DataLoader integration
 * and RFC-compliant GraphQLError handling.
 */

import { GraphQLError } from 'graphql';
import { prisma } from '@/lib/prisma';
import { getStoreBySlug } from '@/lib/storeCache';
import { broadcastEvent } from '@/lib/events';
import { GraphQLContext } from './context';

export const resolvers = {
  Query: {
    // 1. Store
    store: async (_: unknown, { slug }: { slug: string }) => {
      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError(`ไม่พบร้านค้าที่ระบุ (Slug: ${slug})`, {
          extensions: { code: 'NOT_FOUND', argumentName: 'slug' },
        });
      }
      return store;
    },

    // 2. Menu
    menu: async (_: unknown, { slug, category }: { slug: string; category?: string }) => {
      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError('ไม่พบร้านค้า', { extensions: { code: 'NOT_FOUND' } });
      }

      const where: any = { storeId: store.id };
      if (category) where.category = { name: category };

      return await prisma.menuItem.findMany({
        where,
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }] as any,
      });
    },

    // 3. Tables
    tables: async (_: unknown, { slug }: { slug: string }) => {
      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError('ไม่พบร้านค้า', { extensions: { code: 'NOT_FOUND' } });
      }

      return await prisma.table.findMany({
        where: { storeId: store.id },
        orderBy: { tableNo: 'asc' },
      });
    },

    table: async (_: unknown, { slug, tableNo }: { slug: string; tableNo: number }) => {
      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError('ไม่พบร้านค้า', { extensions: { code: 'NOT_FOUND' } });
      }

      const table = await prisma.table.findUnique({
        where: {
          storeId_tableNo: {
            storeId: store.id,
            tableNo,
          },
        },
      });

      if (!table) {
        throw new GraphQLError(`ไม่พบโต๊ะหมายเลข ${tableNo}`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return table;
    },

    // 4. Orders
    orders: async (
      _: unknown,
      { slug, status, page = 1, limit = 20 }: { slug: string; status?: string; page?: number; limit?: number }
    ) => {
      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError('ไม่พบร้านค้า', { extensions: { code: 'NOT_FOUND' } });
      }

      const safePage = Math.max(1, page);
      const safeLimit = Math.min(100, Math.max(1, limit));
      const skip = (safePage - 1) * safeLimit;

      const where: any = { storeId: store.id };
      if (status) {
        where.status = status;
      }

      const [total, items] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: safeLimit,
        }),
      ]);

      const totalPages = Math.ceil(total / safeLimit) || 1;

      return {
        items,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages,
          hasNext: safePage < totalPages,
          hasPrev: safePage > 1,
        },
      };
    },

    order: async (_: unknown, { id }: { id: string }) => {
      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new GraphQLError(`ไม่พบออเดอร์รหัส ${id}`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return order;
    },

    // 5. Promotions
    promotions: async (_: unknown, { slug }: { slug: string }) => {
      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError('ไม่พบร้านค้า', { extensions: { code: 'NOT_FOUND' } });
      }

      return await prisma.promotion.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    // 6. Members
    members: async (_: unknown, { slug, search }: { slug: string; search?: string }) => {
      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError('ไม่พบร้านค้า', { extensions: { code: 'NOT_FOUND' } });
      }

      const where: any = { storeId: store.id };
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { phone: { contains: search } },
        ];
      }

      return await prisma.customerMember.findMany({
        where,
        orderBy: { totalSpent: 'desc' },
      });
    },
  },

  Mutation: {
    // 1. Create Order
    createOrder: async (
      _: unknown,
      { slug, input }: { slug: string; input: any },
      context: GraphQLContext
    ) => {
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new GraphQLError('กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError('ไม่พบร้านค้า', { extensions: { code: 'NOT_FOUND' } });
      }

      let targetTableId = input.tableId || null;
      let targetTableNo = input.tableNo || null;

      if (targetTableNo && !targetTableId) {
        const tbl = await prisma.table.findUnique({
          where: {
            storeId_tableNo: { storeId: store.id, tableNo: targetTableNo },
          },
        });
        if (tbl) targetTableId = tbl.id;
      }

      // Compute total
      let totalAmount = 0;
      for (const item of input.items) {
        const price = item.price || 0;
        totalAmount += price * item.quantity;
      }

      const discount = Math.max(0, Number(input.discountAmount) || 0);
      const netAmount = Math.max(0, totalAmount - discount);

      // Next order number (derived from count; Order model has no orderNumber column)
      const orderCount = await prisma.order.count({
        where: { storeId: store.id },
      });
      const orderNumber = orderCount + 1;

      const createdOrder = await prisma.order.create({
        data: {
          storeId: store.id,
          tableId: targetTableId,
          tableNo: targetTableNo,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          orderType: input.orderType || 'DINE_IN',
          orderChannel: input.orderChannel || 'DINE_IN',
          customerName: input.customerName || null,
          totalAmount,
          discountAmount: discount,
          netAmount,
          note: `Order #${orderNumber}`,
          items: {
            create: input.items.map((i: any) => ({
              menuItemId: i.menuItemId,
              name: i.name || 'รายการอาหาร',
              price: i.price || 0,
              quantity: i.quantity,
              specialNote: i.notes || null,
            })),
          },
        },
      });

      broadcastEvent('ORDER_CREATED', { orderId: createdOrder.id }, store.id);

      return {
        success: true,
        message: 'สร้างออเดอร์สำเร็จ',
        order: createdOrder,
      };
    },

    // 2. Update Order Status
    updateOrderStatus: async (
      _: unknown,
      { orderId, status }: { orderId: string; status: string }
    ) => {
      const existing = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!existing) {
        throw new GraphQLError(`ไม่พบออเดอร์ ${orderId}`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });

      broadcastEvent('ORDER_UPDATED', { orderId, status }, existing.storeId);

      return {
        success: true,
        message: `ปรับสถานะออเดอร์เป็น ${status} สำเร็จ`,
        order: updated,
      };
    },

    // 3. Clear Table
    clearTable: async (
      _: unknown,
      { slug, tableNo }: { slug: string; tableNo: number }
    ) => {
      const store = await getStoreBySlug(slug);
      if (!store) {
        throw new GraphQLError('ไม่พบร้านค้า', { extensions: { code: 'NOT_FOUND' } });
      }

      const table = await prisma.table.findUnique({
        where: { storeId_tableNo: { storeId: store.id, tableNo } },
      });

      if (!table) {
        throw new GraphQLError(`ไม่พบโต๊ะหมายเลข ${tableNo}`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const updated = await prisma.table.update({
        where: { id: table.id },
        data: { status: 'AVAILABLE', currentSessionId: null },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'clear', tableNo }, store.id);

      return {
        success: true,
        message: `เคลียร์โต๊ะหมายเลข ${tableNo} เรียบร้อยแล้ว`,
        table: updated,
      };
    },
  },

  // Field Resolvers with DataLoader Pattern (N+1 Prevention)
  Store: {
    tables: async (store: any) => {
      return await prisma.table.findMany({
        where: { storeId: store.id },
        orderBy: { tableNo: 'asc' },
      });
    },
    menuItems: async (store: any, { category }: { category?: string }) => {
      const where: any = { storeId: store.id };
      if (category) where.category = category;
      return await prisma.menuItem.findMany({ where, orderBy: { name: 'asc' } });
    },
    activeOrders: async (store: any) => {
      return await prisma.order.findMany({
        where: {
          storeId: store.id,
          status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Table: {
    orders: async (table: any, _: unknown, context: GraphQLContext) => {
      return await context.loaders.tableOrdersLoader(table.id);
    },
    activeOrdersCount: async (table: any, _: unknown, context: GraphQLContext) => {
      const orders = await context.loaders.tableOrdersLoader(table.id);
      return orders.length;
    },
    totalAmount: async (table: any, _: unknown, context: GraphQLContext) => {
      const orders = await context.loaders.tableOrdersLoader(table.id);
      return orders.reduce((sum, o) => sum + (o.netAmount || 0), 0);
    },
  },

  Order: {
    items: async (order: any, _: unknown, context: GraphQLContext) => {
      return await context.loaders.orderItemsLoader(order.id);
    },
  },

  OrderItem: {
    menuItem: async (orderItem: any, _: unknown, context: GraphQLContext) => {
      if (!orderItem.menuItemId) return null;
      return await context.loaders.menuItemLoader(orderItem.menuItemId);
    },
  },
};
