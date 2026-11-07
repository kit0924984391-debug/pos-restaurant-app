/**
 * Hono Routes - Orders Sub-App
 * 
 * Demonstrates:
 * - Request validation with zValidator
 * - Typed data access via c.req.valid('json') and c.req.valid('query')
 * - Sub-app composition via app.route()
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { HonoEnv } from '../types';
import { prisma } from '@/lib/prisma';
import { getStoreBySlug } from '@/lib/storeCache';
import { createOrderBoundarySchema } from '@/lib/validations/boundary';

export const ordersRouter = new Hono<HonoEnv>();

const listOrdersQuerySchema = z.object({
  slug: z.string().min(1, 'ต้องระบุ store slug'),
  tableId: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

/**
 * GET /orders: List store orders with query validation
 */
ordersRouter.get('/', zValidator('query', listOrdersQuerySchema), async (c) => {
  const { slug, tableId, status, page, limit } = c.req.valid('query');
  const store = await getStoreBySlug(slug);

  if (!store) {
    throw new HTTPException(404, { message: 'ไม่พบร้านค้าที่ระบุ' });
  }

  const where: any = { storeId: store.id };
  if (tableId) {
    const tNo = parseInt(tableId);
    where.OR = [
      { tableId },
      { tableNo: isNaN(tNo) ? undefined : tNo },
    ];
  }

  if (status) {
    where.status = status;
  } else {
    where.status = { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] };
  }

  const skip = (page - 1) * limit;
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    }),
  ]);

  return c.json({
    items: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
});

/**
 * GET /orders/:id: Get single order details
 */
ordersRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  if (!order) {
    throw new HTTPException(404, { message: `ไม่พบออเดอร์รหัส ${id}` });
  }

  return c.json({ order });
});
