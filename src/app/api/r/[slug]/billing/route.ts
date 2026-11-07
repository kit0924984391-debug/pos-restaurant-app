import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug, request);

    const [plans, platformSetting, history] = await Promise.all([
      prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.platformSetting.findUnique({
        where: { id: 'default' },
      }),
      prisma.subscriptionHistory.findMany({
        where: { storeId: store.id },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const fullStore = await prisma.store.findUnique({
      where: { id: store.id },
      include: { plan: true },
    });

    return NextResponse.json({
      store: fullStore,
      plans,
      platformSetting,
      history,
    });
  } catch (error: any) {
    console.error('[billing GET] error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({ error: isDev ? error.message : 'โหลดข้อมูลบิลลิ่งไม่สำเร็จ' }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug, request);
    const body = await request.json();
    const { planId, amount, slipUrl, note } = body;

    if (!planId || !amount) {
      return NextResponse.json({ error: 'กรุณาเลือกแพ็กเกจและระบุยอดเงิน' }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: 'ไม่พบแพ็กเกจที่เลือก' }, { status: 404 });

    // Validate amount against plan price (behavior-preserving: previously any
    // amount was accepted, allowing underpayment). Reject only clear underpayment.
    const paidAmount = Number(amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return NextResponse.json({ error: 'ยอดเงินไม่ถูกต้อง' }, { status: 400 });
    }
    if (Number.isFinite(plan.price) && plan.price > 0 && paidAmount < plan.price - 0.01) {
      return NextResponse.json(
        { error: `ยอดเงินไม่ครบตามราคาแพ็กเกจ (฿${plan.price.toLocaleString()}) กรุณาชำระให้ครบก่อนส่งหลักฐาน` },
        { status: 400 }
      );
    }

    // Idempotency: Prevent duplicate rapid submissions if user clicked multiple times
    const existingPending = await prisma.subscriptionHistory.findFirst({
      where: {
        storeId: store.id,
        planId,
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (existingPending) {
      return NextResponse.json({
        success: true,
        message: 'มีรายการแจ้งชำระเงินแพ็กเกจนี้ที่เพิ่งส่งไปแล้ว กำลังรอผู้ดูแลระบบตรวจสอบ',
        submission: existingPending,
        isDuplicate: true,
      });
    }

    const submission = await prisma.subscriptionHistory.create({
      data: {
        storeId: store.id,
        planId,
        amount: parseFloat(amount),
        slipUrl: slipUrl || null,
        note: note || null,
        status: 'PENDING',
      },
      include: { plan: true },
    });

    return NextResponse.json({
      success: true,
      message: 'ส่งหลักฐานแจ้งชำระเงินเรียบร้อยแล้ว รอผู้ดูแลระบบตรวจสอบและอนุมัติ',
      submission,
    });
  } catch (error: any) {
    console.error('[billing POST] error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({ error: isDev ? error.message : 'ส่งหลักฐานไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }
}
