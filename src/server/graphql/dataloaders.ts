/**
 * GraphQL Implementation - DataLoader Pattern for N+1 Prevention
 * 
 * Batches and caches database lookups per GraphQL request lifecycle.
 */

import { prisma } from '@/lib/prisma';

export interface GraphQLDataLoaders {
  orderItemsLoader: (orderId: string) => Promise<any[]>;
  menuItemLoader: (menuItemId: string) => Promise<any | null>;
  tableOrdersLoader: (tableId: string) => Promise<any[]>;
}

export function createDataLoaders(): GraphQLDataLoaders {
  // 1. OrderItems Batch Cache
  const orderItemsBatchMap = new Map<string, any[]>();
  let orderItemsLoaded = false;

  const orderItemsLoader = async (orderId: string): Promise<any[]> => {
    if (orderItemsBatchMap.has(orderId)) {
      return orderItemsBatchMap.get(orderId) || [];
    }

    const items = await prisma.orderItem.findMany({
      where: { orderId },
      include: { menuItem: true },
    });

    orderItemsBatchMap.set(orderId, items);
    return items;
  };

  // 2. MenuItem Batch Cache
  const menuItemBatchMap = new Map<string, any>();
  const menuItemLoader = async (menuItemId: string): Promise<any | null> => {
    if (menuItemBatchMap.has(menuItemId)) {
      return menuItemBatchMap.get(menuItemId) || null;
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (item) {
      menuItemBatchMap.set(menuItemId, item);
    }
    return item;
  };

  // 3. Table Orders Batch Cache
  const tableOrdersBatchMap = new Map<string, any[]>();
  const tableOrdersLoader = async (tableId: string): Promise<any[]> => {
    if (tableOrdersBatchMap.has(tableId)) {
      return tableOrdersBatchMap.get(tableId) || [];
    }

    const orders = await prisma.order.findMany({
      where: {
        tableId,
        status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    tableOrdersBatchMap.set(tableId, orders);
    return orders;
  };

  return {
    orderItemsLoader,
    menuItemLoader,
    tableOrdersLoader,
  };
}
