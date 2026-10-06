import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);

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
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);
    const body = await request.json();
    const { planId, amount, slipUrl, note } = body;

    if (!planId || !amount) {
      return NextResponse.json({ error: 'กรุณาเลือกแพ็กเกจและระบุยอดเงิน' }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: 'ไม่พบแพ็กเกจที่เลือก' }, { status: 404 });

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
