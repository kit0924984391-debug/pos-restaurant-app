import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const body = await request.json();
    const { tableId, tableNo, amount, orderIds, memberPhone, customerName, pointsRedeemed, discountAmount } = body;

    const parsedTableNo = tableNo !== undefined && tableNo !== null && !isNaN(parseInt(String(tableNo), 10))
      ? parseInt(String(tableNo), 10)
      : (tableId && !isNaN(parseInt(String(tableId), 10)) ? parseInt(String(tableId), 10) : undefined);

    // Find table if exists
    let table = null;
    if (tableId || parsedTableNo !== undefined) {
      table = await prisma.table.findFirst({
        where: {
          storeId: store.id,
          OR: [
            { id: tableId ? String(tableId) : undefined },
            { tableNo: parsedTableNo },
          ],
        },
      });
    }

    // Find active unpaid orders for this table
    const orders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        OR: [
          ...(table ? [{ tableId: table.id }] : []),
          ...(parsedTableNo !== undefined ? [{ tableNo: parsedTableNo }] : []),
          ...(orderIds && Array.isArray(orderIds) && orderIds.length > 0 ? [{ id: { in: orderIds } }] : []),
        ],
        paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
        status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
      },
      include: { items: true },
    });

    // Calculate total amount if not passed or ensure positive number
    const calculatedAmount = orders.reduce((sum, o) => sum + (o.netAmount || o.totalAmount || 0), 0);
    const finalAmount = amount && Number(amount) > 0 ? Number(amount) : calculatedAmount;

    // Update table status to PAYMENT_PENDING if table exists
    if (table) {
      await prisma.table.update({
        where: { id: table.id },
        data: { status: 'PAYMENT_PENDING' },
      });
    }

    const cleanPhone = memberPhone ? String(memberPhone).replace(/\D/g, '') : undefined;
    const cleanName = customerName && typeof customerName === 'string' && customerName.trim() ? customerName.trim() : undefined;

    // Update orders paymentStatus to PENDING_CONFIRMATION so staff knows they are in review
    if (orders.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: {
          paymentStatus: 'PENDING_CONFIRMATION',
          ...(cleanPhone ? { memberPhone: cleanPhone } : {}),
          ...(cleanName ? { customerName: cleanName } : {}),
          ...(discountAmount && Number(discountAmount) > 0 ? { discountAmount: Number(discountAmount) } : {}),
        },
      });
    }

    const effectiveTableNo = parsedTableNo ?? table?.tableNo ?? 1;
    const tableName = table?.name || `โต๊ะ ${effectiveTableNo}`;
    const activeOrderIds = orders.map((o) => o.id);

    // Broadcast SSE to POS cashier
    broadcastEvent(
      'CUSTOMER_PAYMENT_NOTIFIED',
      {
        tableId: table?.id || String(effectiveTableNo),
        tableNo: effectiveTableNo,
        tableName,
        amount: finalAmount,
        orderIds: activeOrderIds,
        memberPhone: cleanPhone,
        customerName: cleanName,
        pointsRedeemed: Number(pointsRedeemed) || 0,
        discountAmount: Number(discountAmount) || 0,
        timestamp: Date.now(),
      },
      store.id
    );

    broadcastEvent(
      'TABLE_UPDATED',
      {
        tableNo: effectiveTableNo,
        status: 'PAYMENT_PENDING',
      },
      store.id
    );

    return NextResponse.json({
      success: true,
      tableNo: effectiveTableNo,
      tableName,
      amount: finalAmount,
      orderCount: orders.length,
      message: 'แจ้งโอนเงินเรียบร้อยแล้ว แคชเชียร์กำลังตรวจสอบยอดเงิน',
    });
  } catch (error: any) {
    console.error('Error in notify-transfer route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
