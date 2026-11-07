import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { requireStoreAccess } from '@/lib/auth';
import { getStoreBySlug } from '@/lib/storeCache';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await getStoreBySlug(params.slug);

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const tableIdParam = searchParams.get('tableId');
    const statusParam = searchParams.get('status');

    const where: any = { storeId: store.id };

    if (tableIdParam) {
      const tNo = parseInt(tableIdParam);
      where.OR = [
        { tableId: tableIdParam },
        { tableNo: isNaN(tNo) ? undefined : tNo },
      ];
    }

    if (statusParam) {
      where.status = statusParam;
    } else {
      where.status = {
        in: ['PENDING', 'COOKING', 'READY', 'SERVED'],
      };
    }

    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20') || 20));
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
      return NextResponse.json({
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  let idemKey: string | null = null;
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        pointsRate: true,
        linemanGp: true,
        grabGp: true,
        shopeeGp: true,
        robinhoodGp: true,
      },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const body = await request.json();
    const {
      tableId,
      items,
      orderType = 'DINE_IN',
      orderChannel = 'DINE_IN',
      deliveryOrderId,
      riderName,
      riderPhone,
      gpPercent: customGpPercent,
      note,
      customerName,
      customerLineId,
      memberPhone,
      promoCode,
      discountAmount = 0,
      pointsRedeemed = 0,
      clientRequestId,
    } = body;

    // BUG-002 Guard: Reject empty orders
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    // Idempotency: a client may retry the same submission (double tap, flaky
    // network). When Idempotency-Key header or clientRequestId is provided, replay the stored response
    // for 24h instead of creating a duplicate order. Fail-open if the
    // IdempotencyKey table has not been provisioned yet.
    const rawIdemKey =
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key') ||
      (typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim() : null);

    let idemHash = '';
    if (rawIdemKey && typeof rawIdemKey === 'string' && rawIdemKey.trim()) {
      idemKey = `${store.id}:${rawIdemKey.trim()}`;
      try {
        const { createHash } = require('crypto');
        idemHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
      } catch {
        idemHash = '';
      }
      try {
        const rows: any = await prisma.$queryRaw`
          SELECT "payloadHash" AS h, "status" AS s, "body" AS b, "createdAt" AS t
          FROM "IdempotencyKey" WHERE "key" = ${idemKey}
        `;
        const row = rows?.[0];
        if (row && Number(row.t) > Date.now() - 24 * 60 * 60 * 1000) {
          if (row.h === idemHash) {
            // If already completed, replay response
            if (Number(row.s) >= 200 && Number(row.s) < 300) {
              return NextResponse.json(JSON.parse(row.b), { status: Number(row.s) });
            }
            // If in-flight / processing within the last 30s, reject concurrent race
            if ((Number(row.s) === 102 || String(row.b) === 'PROCESSING') && Number(row.t) > Date.now() - 30 * 1000) {
              return NextResponse.json(
                { error: 'คำขอนี้กำลังอยู่ระหว่างการประมวลผล กรุณารอสักครู่ (request already in-flight)', code: 'concurrent_request' },
                { status: 409 }
              );
            }
          } else {
            return NextResponse.json(
              { error: 'รหัสคำขอซ้ำถูกใช้กับข้อมูลอื่น (idempotency key reused)', code: 'idempotency_key_reused' },
              { status: 409 }
            );
          }
        }

        // Pre-reserve key with in-flight/processing status to guard against concurrent duplicate submissions
        await prisma.$executeRaw`
          INSERT INTO "IdempotencyKey" ("key", "storeId", "payloadHash", "status", "body", "createdAt")
          VALUES (${idemKey}, ${store.id}, ${idemHash}, 102, 'PROCESSING', ${Date.now()})
          ON CONFLICT("key") DO UPDATE SET
            "payloadHash" = ${idemHash}, "status" = 102, "body" = 'PROCESSING', "createdAt" = ${Date.now()}
        `.catch(() => {});
      } catch {
        // Table not provisioned yet — proceed without idempotency.
        idemKey = null;
      }
    }

    const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel);
    const isDineIn = orderChannel === 'DINE_IN';
    const parsedTableNo = parseInt(String(tableId ?? ''), 10);

    // Dine-in orders must state their table — no silent fallback to table 1.
    if (isDineIn && !(parsedTableNo > 0)) {
      return NextResponse.json(
        { error: 'กรุณาระบุเลขโต๊ะสำหรับออเดอร์ทานที่ร้าน' },
        { status: 400 }
      );
    }

    // Upsert table for this store if dine-in
    let table: any = null;
    if (isDineIn) {
      table = await prisma.table.upsert({
        where: {
          storeId_tableNo: {
            storeId: store.id,
            tableNo: parsedTableNo,
          },
        },
        update: {
          status: 'OCCUPIED',
        },
        create: {
          storeId: store.id,
          tableNo: parsedTableNo,
          name: `โต๊ะ ${parsedTableNo}`,
          status: 'OCCUPIED',
        },
      });
    }

    // 1. Calculate total amount & order items with server-side price verification
    const menuItemIds = items.map((i: any) => i.menuItemId).filter(Boolean);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, storeId: store.id },
      include: {
        options: {
          include: {
            choices: true,
          },
        },
      },
    });
    const dbMenuItemMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    // Custom-priced items (no valid menuItemId) may only be added by staff —
    // the public QR-ordering endpoint must not accept client-set prices.
    const hasCustomItems = items.some(
      (item: any) => !item.menuItemId || !dbMenuItemMap.has(item.menuItemId)
    );
    let isStaffCaller = false;
    if (hasCustomItems) {
      try {
        await requireStoreAccess(params.slug, request);
        isStaffCaller = true;
      } catch {
        return NextResponse.json(
          { error: 'พบรายการที่ไม่อยู่ในเมนูของร้าน กรุณาสั่งจากเมนูที่แสดง' },
          { status: 400 }
        );
      }
    }

    let totalAmount = 0;
    const orderItemsData = items.map((item: any) => {
      const dbItem = item.menuItemId ? dbMenuItemMap.get(item.menuItemId) : null;
      let extraPrice = 0;

      // Build lookup of available choices for this menu item
      const validChoiceMap = new Map<string, number>();
      if (dbItem?.options) {
        for (const group of dbItem.options) {
          for (const choice of group.choices) {
            validChoiceMap.set(choice.name.trim().toLowerCase(), choice.extraPrice);
            validChoiceMap.set(choice.id, choice.extraPrice);
          }
        }
      }

      if (Array.isArray(item.selectedOptions)) {
        for (const opt of item.selectedOptions) {
          const choiceName = (opt?.choice || opt?.name || '').trim().toLowerCase();
          const choiceId = opt?.choiceId || opt?.id;
          if (choiceId && validChoiceMap.has(choiceId)) {
            extraPrice += validChoiceMap.get(choiceId)!;
          } else if (choiceName && validChoiceMap.has(choiceName)) {
            extraPrice += validChoiceMap.get(choiceName)!;
          } else {
            const optExtra = typeof opt?.extra === 'number'
              ? opt.extra
              : (typeof opt?.extraPrice === 'number' ? opt.extraPrice : 0);
            if (optExtra > 0) {
              extraPrice += optExtra;
            }
          }
        }
      }

      const verifiedUnitPrice = dbItem ? (dbItem.basePrice + extraPrice) : (Number(item.price) || 0);
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const itemTotal = verifiedUnitPrice * quantity;
      totalAmount += itemTotal;

      return {
        menuItemId: item.menuItemId || null,
        name: dbItem ? dbItem.name : (item.name || 'รายการอาหาร'),
        price: verifiedUnitPrice,
        quantity: quantity,
        selectedOptions: item.selectedOptions ? JSON.stringify(item.selectedOptions) : null,
        specialNote: item.specialNote || null,
        status: 'PENDING',
      };
    });

    // Server-side discount & promoCode verification
    let verifiedDiscount = 0;
    let verifiedPromoCode: string | null = null;

    if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
      const cleanCode = promoCode.trim().toUpperCase();
      const promo = await prisma.promotion.findFirst({
        where: {
          storeId: store.id,
          code: cleanCode,
          isActive: true,
        },
      });

      if (!promo) {
        return NextResponse.json(
          { error: `โค้ดส่วนลด "${cleanCode}" ไม่ถูกต้องหรือถูกปิดใช้งานแล้ว` },
          { status: 400 }
        );
      }

      if (promo.expiryDate && new Date() > promo.expiryDate) {
        return NextResponse.json(
          { error: `โค้ดส่วนลด "${cleanCode}" หมดอายุแล้ว` },
          { status: 400 }
        );
      }

      if (promo.minSpend > 0 && totalAmount < promo.minSpend) {
        return NextResponse.json(
          { error: `โค้ด "${cleanCode}" ใช้ได้เมื่อมียอดสั่งซื้อขั้นต่ำ ฿${promo.minSpend.toLocaleString()} ขึ้นไป` },
          { status: 400 }
        );
      }

      if (promo.discountType === 'PERCENT') {
        verifiedDiscount = (totalAmount * promo.discountValue) / 100;
      } else {
        verifiedDiscount = promo.discountValue;
      }
      verifiedDiscount = Math.min(totalAmount, Math.max(0, verifiedDiscount));
      verifiedPromoCode = cleanCode;
    } else if (discountAmount && Number(discountAmount) > 0) {
      let isStaff = false;
      try {
        await requireStoreAccess(params.slug, request);
        isStaff = true;
      } catch {
        isStaff = false;
      }

      if (isStaff) {
        verifiedDiscount = Math.min(totalAmount, Math.max(0, Number(discountAmount)));
      } else {
        verifiedDiscount = 0;
      }
    }

    const netAmount = Math.max(0, totalAmount - verifiedDiscount);

    // Guard: Prevent negative loyalty points on redemption
    const cleanMemberPhone = memberPhone ? memberPhone.replace(/\D/g, '') : null;
    const requestedPoints = Number(pointsRedeemed) || 0;

    if (cleanMemberPhone && requestedPoints > 0) {
      const member = await prisma.customerMember.findUnique({
        where: {
          storeId_phone: {
            storeId: store.id,
            phone: cleanMemberPhone,
          },
        },
      });

      if (!member || member.points < requestedPoints) {
        return NextResponse.json(
          {
            error: `แต้มสะสมไม่เพียงพอ (มีแต้มคงเหลือ ${member?.points || 0} แต้ม แต่ขอใช้ ${requestedPoints} แต้ม)`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate GP% and Net Revenue for Delivery Channels
    // (a custom GP% may only be set by staff; public callers get store defaults)
    let gpPercent = 0;
    let customGpApplied = false;
    if (customGpPercent !== undefined && !isNaN(Number(customGpPercent))) {
      let gpIsStaff = isStaffCaller;
      if (!gpIsStaff) {
        try {
          await requireStoreAccess(params.slug, request);
          gpIsStaff = true;
        } catch {
          gpIsStaff = false;
        }
      }
      if (gpIsStaff) {
        gpPercent = Number(customGpPercent);
        customGpApplied = true;
      }
    }
    if (!customGpApplied) {
      if (orderChannel === 'LINEMAN') {
        gpPercent = store.linemanGp ?? 30;
      } else if (orderChannel === 'GRAB') {
        gpPercent = store.grabGp ?? 30;
      } else if (orderChannel === 'SHOPEE_FOOD') {
        gpPercent = store.shopeeGp ?? 30;
      } else if (orderChannel === 'ROBINHOOD') {
        gpPercent = store.robinhoodGp ?? 20;
      }
    }

    const gpAmount = isDelivery ? (netAmount * gpPercent) / 100 : 0;
    const netRevenue = isDelivery ? netAmount - gpAmount : netAmount;

    // 2. Enterprise Recipe BOM & Real-time Stock Deduction (Tenant-scoped)
    const recipes = await prisma.menuItemRecipe.findMany({
      where: {
        menuItemId: { in: menuItemIds },
        menuItem: { storeId: store.id },
        ingredient: { storeId: store.id },
      },
      include: { ingredient: true },
    });

    let totalCost = 0;
    const stockDeductions: { ingredientId: string; qty: number; cost: number }[] = [];

    for (const orderItem of items) {
      const itemRecipes = recipes.filter((r) => r.menuItemId === orderItem.menuItemId);
      for (const r of itemRecipes) {
        const deductQty = r.quantity * (orderItem.quantity || 1);
        const cost = deductQty * (r.ingredient?.costPerUnit || 0);
        totalCost += cost;
        stockDeductions.push({ ingredientId: r.ingredientId, qty: deductQty, cost });
      }
    }

    // 3. Create Order
    const newOrder = await prisma.order.create({
      data: {
        storeId: store.id,
        tableId: table?.id || null,
        tableNo: table?.tableNo || 0,
        orderType: orderType || (isDelivery ? 'TAKEAWAY' : 'DINE_IN'),
        orderChannel: orderChannel || 'DINE_IN',
        deliveryOrderId: deliveryOrderId || null,
        riderName: riderName || null,
        riderPhone: riderPhone || null,
        totalAmount,
        discountAmount: verifiedDiscount,
        netAmount,
        gpPercent,
        gpAmount,
        netRevenue,
        costAmount: totalCost,
        memberPhone: cleanMemberPhone,
        promoCode: verifiedPromoCode,
        pointsRedeemed: requestedPoints,
        note,
        customerName,
        customerLineId,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        table: true,
        items: true,
      },
    });

    // 4. Execute Real-time Stock Deductions & Depletion Triggers
    // On Cloudflare Workers, work that outlives the response must be registered
    // with ctx.waitUntil — a bare fire-and-forget promise can be killed once
    // the response is sent, silently skipping stock deduction.
    const runStockDeductions = async () => {
      try {
        for (const ded of stockDeductions) {
          const updatedIng = await prisma.ingredient.update({
            where: { id: ded.ingredientId },
            data: { currentStock: { decrement: ded.qty } },
          });

          await prisma.stockLog.create({
            data: {
              storeId: store.id,
              ingredientId: ded.ingredientId,
              changeQty: -ded.qty,
              reason: 'ORDER',
              note: table
                ? `ตัดสต็อกออเดอร์โต๊ะ ${table.tableNo} (#${newOrder.id.slice(-4)})`
                : `ตัดสต็อกออเดอร์เดลิเวอรี/สั่งกลับบ้าน (#${newOrder.id.slice(-4)})`,
              cost: ded.cost,
            },
          });

          // Auto-disable dish if ingredient is completely out of stock
          if (updatedIng.currentStock <= 0) {
            const affectedItemIds = recipes
              .filter((r) => r.ingredientId === ded.ingredientId)
              .map((r) => r.menuItemId);

            if (affectedItemIds.length > 0) {
              await prisma.menuItem.updateMany({
                where: { id: { in: affectedItemIds } },
                data: { isAvailable: false },
              });
              broadcastEvent('MENU_UPDATED', { affectedItemIds, isAvailable: false }, store.id);
            }
          }
        }
      } catch (stockErr) {
        console.error('Error executing stock deduction:', stockErr);
      }
    };

    let stockTaskRegistered = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getCloudflareContext } = require('@opennextjs/cloudflare');
      const cfCtx: any = getCloudflareContext();
      if (cfCtx?.ctx?.waitUntil) {
        cfCtx.ctx.waitUntil(runStockDeductions());
        stockTaskRegistered = true;
      }
    } catch {
      stockTaskRegistered = false;
    }
    if (!stockTaskRegistered) {
      // Plain Node runtime: just await it.
      await runStockDeductions();
    }

    // Broadcast SSE realtime events
    broadcastEvent('ORDER_CREATED', newOrder, store.id);
    if (table) {
      broadcastEvent('TABLE_UPDATED', { tableNo: table.tableNo, status: 'OCCUPIED' }, store.id);
    }

    // Remember this request so a retry with the same clientRequestId replays
    // this exact response instead of creating a duplicate order.
    if (idemKey) {
      try {
        const responseJson = JSON.stringify(newOrder);
        await prisma.$executeRaw`
          INSERT INTO "IdempotencyKey" ("key", "storeId", "payloadHash", "status", "body", "createdAt")
          VALUES (${idemKey}, ${store.id}, ${idemHash}, 201, ${responseJson}, ${Date.now()})
          ON CONFLICT("key") DO UPDATE SET
            "payloadHash" = ${idemHash}, "status" = 201, "body" = ${responseJson}, "createdAt" = ${Date.now()}
        `;
        // Opportunistic cleanup of expired entries (24h TTL).
        await prisma
          .$executeRaw`DELETE FROM "IdempotencyKey" WHERE "createdAt" < ${Date.now() - 24 * 60 * 60 * 1000}`
          .catch(() => {});
      } catch {
        // Best-effort: never fail order creation because of the idempotency store.
      }
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    if (idemKey) {
      await prisma.$executeRaw`DELETE FROM "IdempotencyKey" WHERE "key" = ${idemKey} AND "status" = 102`.catch(() => {});
    }
    console.error('Error creating order:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({ error: isDev ? (error.message || 'Failed to create order') : 'สร้างออเดอร์ไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }
}
