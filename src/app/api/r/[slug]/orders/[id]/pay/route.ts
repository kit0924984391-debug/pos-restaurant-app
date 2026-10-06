import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveSlipImage } from '@/lib/google-drive-storage';
import { requireStoreAccess } from '@/lib/auth';
import { settlePayment } from '@/lib/paymentEngine';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    try {
      await requireStoreAccess(params.slug);
    } catch (authErr) {
      return NextResponse.json({ error: 'Unauthorized: Staff access required to settle payments' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        pointsRate: true,
        pointValue: true,
        googleDriveFolderId: true,
        googleDriveWebhookUrl: true,
      },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const body = await request.json();
    const {
      paymentMethod = 'CASH',
      cashReceived,
      changeAmount,
      slipUrl,
      memberPhone,
      customerName,
      pointsRedeemed,
      promoCode,
      discountAmount,
      note,
    } = body;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { table: true },
    });

    if (!order || order.storeId !== store.id) {
      return NextResponse.json({ error: 'ไม่พบออเดอร์ในร้านค้านี้' }, { status: 404 });
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'ออเดอร์นี้ได้รับการชำระเงินเรียบร้อยแล้ว' }, { status: 400 });
    }

    let finalSlipUrl = slipUrl || null;
    if (slipUrl && typeof slipUrl === 'string' && (slipUrl.startsWith('data:image/') || slipUrl.length > 500)) {
      finalSlipUrl = await saveSlipImage(slipUrl, {
        slug: params.slug,
        orderId: order.id,
        tableNo: order.tableNo,
        folderId: store.googleDriveFolderId,
        webhookUrl: store.googleDriveWebhookUrl,
      });
    }

    const result = await settlePayment({
      storeId: store.id,
      slug: params.slug,
      orderIds: [order.id],
      paymentMethod,
      cashReceived: cashReceived ? parseFloat(cashReceived) : null,
      changeAmount: changeAmount ? parseFloat(changeAmount) : null,
      slipUrl: finalSlipUrl,
      memberPhone,
      customerName,
      pointsRedeemed: Number(pointsRedeemed) || 0,
      promoCode,
      discountAmount: Number(discountAmount) || 0,
      note,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to settle payment' }, { status: 400 });
    }

    return NextResponse.json(result.orders[0]);
  } catch (error: any) {
    console.error('Error paying order:', error);
    return NextResponse.json({ error: error.message || 'Failed to process payment' }, { status: 500 });
  }
}
