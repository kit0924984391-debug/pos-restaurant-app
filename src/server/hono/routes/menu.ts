/**
 * Hono Routes - Menu Sub-App
 * 
 * Demonstrates:
 * - Query & Param validation with zValidator
 * - JSON body validation with zValidator
 * - Typed data access via c.req.valid('param'), c.req.valid('query'), c.req.valid('json')
 * - Protected route with requireAuthMiddleware
 * - HTTPException for not found and authorization errors
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { HonoEnv } from '../types';
import { prisma } from '@/lib/prisma';
import { getStoreBySlug } from '@/lib/storeCache';
import { requireAuthMiddleware } from '../middleware/auth';

export const menuRouter = new Hono<HonoEnv>();

const listMenuQuerySchema = z.object({
  slug: z.string().min(1, 'ต้องระบุ store slug'),
  category: z.string().optional(),
  search: z.string().optional(),
  isAvailable: z.coerce.boolean().optional(),
});

const menuItemParamSchema = z.object({
  id: z.string().min(1, 'ต้องระบุ menu item id'),
});

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

/**
 * GET /: List menu items for a store
 */
menuRouter.get('/', zValidator('query', listMenuQuerySchema), async (c) => {
  const { slug, category, search, isAvailable } = c.req.valid('query');
  const store = await getStoreBySlug(slug);

  if (!store) {
    throw new HTTPException(404, { message: 'ไม่พบร้านค้าที่ระบุ' });
  }

  const where: any = { storeId: store.id };

  if (category) {
    where.category = { name: category };
  }

  if (search) {
    where.name = { contains: search };
  }

  if (isAvailable !== undefined) {
    where.isAvailable = isAvailable;
  }

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    include: {
      category: true,
      options: true,
    },
  });

  return c.json({
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      basePrice: item.basePrice,
      isAvailable: item.isAvailable,
      category: item.category?.name || 'ทั่วไป',
      imageUrl: item.imageUrl || null,
      optionsCount: item.options?.length || 0,
    })),
  });
});

/**
 * GET /:id: Get single menu item by ID
 */
menuRouter.get('/:id', zValidator('param', menuItemParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: true,
      options: true,
    },
  });

  if (!item) {
    throw new HTTPException(404, { message: `ไม่พบเมนูอาหาร (ID: ${id})` });
  }

  return c.json({
    item: {
      id: item.id,
      name: item.name,
      basePrice: item.basePrice,
      isAvailable: item.isAvailable,
      category: item.category?.name || 'ทั่วไป',
      imageUrl: item.imageUrl || null,
      options: item.options || [],
    },
  });
});

/**
 * PATCH /:id/availability: Toggle menu item availability (Protected)
 */
menuRouter.patch(
  '/:id/availability',
  requireAuthMiddleware,
  zValidator('param', menuItemParamSchema),
  zValidator('json', updateAvailabilitySchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { isAvailable } = c.req.valid('json');

    const existing = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new HTTPException(404, { message: 'ไม่พบเมนูอาหารที่ต้องการแก้ไข' });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable },
    });

    return c.json({
      success: true,
      item: {
        id: updated.id,
        name: updated.name,
        isAvailable: updated.isAvailable,
      },
    });
  }
);
