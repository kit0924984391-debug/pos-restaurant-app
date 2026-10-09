import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveSlipImage } from '@/lib/google-drive-storage';
import { requireStoreAccess } from '@/lib/auth';
import { settlePayment } from '@/lib/paymentEngine';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// In-memory idempotency cache for order payments (TTL: 24h)
interface CachedPaymentResponse {
  status: number;
  body: any;
  hash: string;
  expiresAt: number;
}

const paymentIdempotencyCache = new Map<string, CachedPaymentResponse>();

function cleanupPaymentCache() {
  const now = Date.now();
  paymentIdempotencyCache.forEach((value, key) => {
    if (value.expiresAt <= now) {
      paymentIdempotencyCache.delete(key);
    }
  });
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  let idemKey: string | null = null;
  try {
    try {
      await requireStoreAccess(params.slug, request);
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
    const rawIdemKey =
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key') ||
      body.clientRequestId;
    idemKey = rawIdemKey ? `${store.id}:${params.id}:${rawIdemKey}` : null;

    if (idemKey) {
      cleanupPaymentCache();
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
      const cached = paymentIdempotencyCache.get(idemKey);

      if (cached) {
        if (cached.hash !== payloadHash) {
          return NextResponse.json(
            { error: 'Idempotency key reused with different payment payload', code: 'idempotency_key_reused' },
            { status: 409 }
          );
        }
        if (cached.status === 102) {
          return NextResponse.json(
            { error: 'Payment is already processing - please wait', code: 'payment_in_flight' },
            { status: 409 }
          );
        }
        return NextResponse.json(cached.body, {
          status: cached.status,
          headers: { 'X-Idempotent-Replay': 'true' },
        });
      }

      // Reserve key in-flight
      paymentIdempotencyCache.set(idemKey, {
        status: 102,
        body: null,
        hash: payloadHash,
        expiresAt: Date.now() + 60 * 1000,
      });
    }

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
      if (idemKey) paymentIdempotencyCache.delete(idemKey);
      return NextResponse.json({ error: 'ไม่พบออเดอร์ในร้านค้านี้' }, { status: 404 });
    }

    // Idempotent behavior: if already paid, return existing paid order with 200 OK
    if (order.paymentStatus === 'PAID') {
      const respBody = order;
      if (idemKey) {
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
        paymentIdempotencyCache.set(idemKey, {
          status: 200,
          body: respBody,
          hash: payloadHash,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });
      }
      return NextResponse.json(respBody, {
        status: 200,
        headers: { 'X-Idempotent-Replay': 'true' },
      });
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
      // Check if settled concurrently
      const refreshed = await prisma.order.findUnique({
        where: { id: params.id },
        include: { table: true },
      });
      if (refreshed?.paymentStatus === 'PAID') {
        if (idemKey) {
          const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
          paymentIdempotencyCache.set(idemKey, {
            status: 200,
            body: refreshed,
            hash: payloadHash,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          });
        }
        return NextResponse.json(refreshed, {
          status: 200,
          headers: { 'X-Idempotent-Replay': 'true' },
        });
      }

      if (idemKey) paymentIdempotencyCache.delete(idemKey);
      return NextResponse.json({ error: result.error || 'Failed to settle payment' }, { status: 400 });
    }

    const paidOrder =
      result.orders[0] ||
      (await prisma.order.findUnique({
        where: { id: params.id },
        include: { table: true },
      }));

    if (idemKey) {
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
      paymentIdempotencyCache.set(idemKey, {
        status: 200,
        body: paidOrder,
        hash: payloadHash,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }

    return NextResponse.json(paidOrder);
  } catch (error: any) {
    if (idemKey) paymentIdempotencyCache.delete(idemKey);
    console.error('Error paying order:', error);
    return NextResponse.json({ error: error.message || 'Failed to process payment' }, { status: 500 });
  }
}
