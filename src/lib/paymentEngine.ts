import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export interface SettleOrderParams {
  storeId: string;
  slug: string;
  orderIds: string[];
  paymentMethod: 'CASH' | 'PROMPTPAY';
  cashReceived?: number | null;
  changeAmount?: number | null;
  slipUrl?: string | null;
  slipRef?: string | null;
  slipAmount?: number | null;
  slipVerifiedBy?: 'AUTO' | 'MANUAL';
  slipRawData?: string | null;
  memberPhone?: string | null;
  customerName?: string | null;
  pointsRedeemed?: number;
  promoCode?: string | null;
  discountAmount?: number;
  note?: string;
}

export interface SettleResult {
  success: boolean;
  orders: any[];
  totalNetAmount: number;
  pointsEarned: number;
  tableCleared: boolean;
  error?: string;
}

/**
 * Unified Payment Engine
 * Deep Module encapsulating all business logic for settling order and table payments:
 * - Duplicate payment prevention
 * - Multi-order proportional discount distribution
 * - Promo code usage tracking
 * - Loyalty points accumulation and redemption
 * - Automatic table clearance when all active orders are settled
 * - SSE realtime broadcast
 */
export async function settlePayment(params: SettleOrderParams): Promise<SettleResult> {
  const {
    storeId,
    slug,
    orderIds,
    paymentMethod,
    cashReceived,
    changeAmount,
    slipUrl,
    slipRef,
    slipAmount,
    slipVerifiedBy,
    slipRawData,
    memberPhone,
    customerName,
    pointsRedeemed = 0,
    promoCode,
    discountAmount = 0,
    note,
  } = params;

  if (!orderIds || orderIds.length === 0) {
    return { success: false, orders: [], totalNetAmount: 0, pointsEarned: 0, tableCleared: false, error: 'No order IDs provided' };
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, pointsRate: true, pointValue: true },
  });

  if (!store) {
    return { success: false, orders: [], totalNetAmount: 0, pointsEarned: 0, tableCleared: false, error: 'Store not found' };
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, storeId },
    include: { table: true, items: true },
    orderBy: { createdAt: 'asc' },
  });

  if (orders.length === 0) {
    return { success: false, orders: [], totalNetAmount: 0, pointsEarned: 0, tableCleared: false, error: 'Orders not found' };
  }

  // Double payment check: filter out already paid orders
  const unpaidOrders = orders.filter((o) => o.paymentStatus !== 'PAID');
  if (unpaidOrders.length === 0) {
    return {
      success: false,
      orders,
      totalNetAmount: 0,
      pointsEarned: 0,
      tableCleared: false,
      error: 'ออเดอร์นี้ได้รับการชำระเงินเรียบร้อยแล้ว',
    };
  }

  const normalizedPhone = memberPhone ? memberPhone.replace(/\D/g, '') : null;
  const trimmedName = customerName?.trim() || undefined;

  // Validate points redemption balance if requested
  if (normalizedPhone && pointsRedeemed > 0) {
    const member = await prisma.customerMember.findUnique({
      where: { storeId_phone: { storeId, phone: normalizedPhone } },
    });
    if (!member || member.points < pointsRedeemed) {
      return {
        success: false,
        orders,
        totalNetAmount: 0,
        pointsEarned: 0,
        tableCleared: false,
        error: `แต้มสะสมไม่เพียงพอ (มีแต้มคงเหลือ ${member?.points || 0} แต้ม แต่ขอใช้ ${pointsRedeemed} แต้ม)`,
      };
    }
  }

  // Atomically debit redeemed points (guarded so concurrent redemptions can
  // never drive the balance negative). If the race loses, skip the redemption.
  let appliedRedemption = pointsRedeemed;
  if (normalizedPhone && pointsRedeemed > 0) {
    const debited = await prisma.customerMember.updateMany({
      where: {
        storeId,
        phone: normalizedPhone,
        points: { gte: pointsRedeemed },
      },
      data: { points: { decrement: pointsRedeemed } },
    });
    if (debited.count === 0) {
      appliedRedemption = 0;
    }
  }

  // Distribute total discount across unpaid orders
  let remainingDiscount = Math.max(0, Number(discountAmount) || 0);
  const updatedOrders: any[] = [];
  const now = new Date();

  for (let i = 0; i < unpaidOrders.length; i++) {
    const order = unpaidOrders[i];
    const isFirst = i === 0;
    const currentOrderRemaining = Math.max(0, order.totalAmount - (order.discountAmount || 0));
    const orderDiscount = Math.min(currentOrderRemaining, remainingDiscount);
    remainingDiscount -= orderDiscount;

    const newDiscount = (order.discountAmount || 0) + orderDiscount;
    const newNetAmount = Math.max(0, order.totalAmount - newDiscount);

    // Guarded update: if a concurrent settlement already marked this order
    // PAID between our read and write, Prisma throws P2025 and we skip it —
    // the order is never paid twice.
    let updated: any;
    try {
      updated = await prisma.order.update({
        where: { id: order.id, paymentStatus: { not: 'PAID' } },
        data: {
          paymentMethod,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          cashReceived: paymentMethod === 'CASH' && isFirst ? cashReceived || null : null,
          changeAmount: paymentMethod === 'CASH' && isFirst ? Math.max(0, changeAmount || 0) : 0,
          discountAmount: newDiscount,
          netAmount: newNetAmount,
          slipUrl: slipUrl || order.slipUrl,
          slipRef: slipRef ? `${slipRef}${unpaidOrders.length > 1 ? `_${i + 1}` : ''}` : order.slipRef,
          slipAmount: unpaidOrders.length === 1 ? (slipAmount || newNetAmount) : newNetAmount,
          slipVerifiedAt: slipUrl || slipRef ? now : order.slipVerifiedAt,
          slipVerifiedBy: slipVerifiedBy || order.slipVerifiedBy,
          slipRawData: slipRawData || order.slipRawData,
          memberPhone: normalizedPhone || order.memberPhone,
          customerName: trimmedName || order.customerName,
          pointsRedeemed: isFirst && appliedRedemption > 0 ? appliedRedemption : 0,
          promoCode: isFirst && promoCode ? promoCode.toUpperCase().trim() : null,
          paidAt: now,
          note: note ? (order.note ? `${order.note} | ${note}` : note) : order.note,
        },
        include: { table: true, items: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        // Lost the race: another settlement already paid this order.
        continue;
      }
      throw e;
    }
    updatedOrders.push(updated);
  }

  // Increment promotion usage if applied
  if (promoCode) {
    await prisma.promotion.updateMany({
      where: { storeId, code: promoCode.toUpperCase().trim() },
      data: { usageCount: { increment: 1 } },
    }).catch(() => {});
  }

  // Settle loyalty member points
  // (redeemed points were already debited atomically above — here we only
  // credit earnings via increment, which is race-safe)
  const totalPaidNet = updatedOrders.reduce((sum, o) => sum + (o.netAmount || 0), 0);
  const targetPhone = normalizedPhone || updatedOrders.find((o) => o.memberPhone)?.memberPhone;
  let pointsEarned = 0;

  if (targetPhone && store.pointsRate > 0) {
    pointsEarned = Math.floor(totalPaidNet / store.pointsRate);

    await prisma.customerMember.upsert({
      where: { storeId_phone: { storeId, phone: targetPhone } },
      update: {
        points: { increment: pointsEarned },
        totalSpent: { increment: totalPaidNet },
        visitCount: { increment: 1 },
        ...(trimmedName ? { name: trimmedName } : {}),
      },
      create: {
        storeId,
        phone: targetPhone,
        name: trimmedName || updatedOrders[0]?.customerName || 'สมาชิก',
        points: pointsEarned,
        totalSpent: totalPaidNet,
        visitCount: 1,
      },
    }).catch((err) => console.error('Error updating loyalty member:', err));
  }

  // Check if table can be cleared to AVAILABLE
  let tableCleared = false;
  const primaryTableId = updatedOrders[0]?.tableId;
  if (primaryTableId) {
    const remainingUnpaid = await prisma.order.count({
      where: {
        tableId: primaryTableId,
        paymentStatus: { not: 'PAID' },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
    });

    if (remainingUnpaid === 0) {
      await prisma.table.update({
        where: { id: primaryTableId },
        data: {
          status: 'AVAILABLE',
          currentSessionId: null,
        },
      });
      tableCleared = true;

      broadcastEvent(
        'TABLE_UPDATED',
        { tableId: primaryTableId, status: 'AVAILABLE' },
        storeId
      );
    }
  }

  // Broadcast realtime events for each paid order
  for (const o of updatedOrders) {
    broadcastEvent(
      'PAYMENT_RECEIVED',
      {
        orderId: o.id,
        tableNo: o.tableNo,
        tableName: o.table?.name || (o.tableNo ? `โต๊ะ ${o.tableNo}` : 'ออเดอร์'),
        netAmount: o.netAmount,
        paymentMethod: o.paymentMethod,
        slipAmount: o.slipAmount,
      },
      storeId
    );
    broadcastEvent(
      'ORDER_UPDATED',
      { orderId: o.id, status: o.status, paymentStatus: o.paymentStatus },
      storeId
    );
  }

  return {
    success: true,
    orders: updatedOrders,
    totalNetAmount: totalPaidNet,
    pointsEarned,
    tableCleared,
  };
}
