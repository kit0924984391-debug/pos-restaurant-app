/**
 * Hono Routes - Tables Sub-App
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { HonoEnv } from '../types';
import { prisma } from '@/lib/prisma';
import { getStoreBySlug } from '@/lib/storeCache';

export const tablesRouter = new Hono<HonoEnv>();

const storeQuerySchema = z.object({
  slug: z.string().min(1, 'ต้องระบุ store slug'),
});

tablesRouter.get('/', zValidator('query', storeQuerySchema), async (c) => {
  const { slug } = c.req.valid('query');
  const store = await getStoreBySlug(slug);

  if (!store) {
    throw new HTTPException(404, { message: 'ไม่พบร้านค้า' });
  }

  const tables = await prisma.table.findMany({
    where: { storeId: store.id },
    orderBy: { tableNo: 'asc' },
    include: {
      orders: {
        where: {
          status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
          paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return c.json({
    tables: tables.map((t) => ({
      id: t.id,
      tableNo: t.tableNo,
      name: t.name,
      status: t.status,
      activeOrdersCount: t.orders?.length || 0,
      totalAmount: (t.orders || []).reduce((sum, o) => sum + o.netAmount, 0),
    })),
  });
});
