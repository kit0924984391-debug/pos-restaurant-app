import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const subscriptions = await prisma.subscriptionHistory.findMany({
      where,
      include: {
        store: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { id, action, note } = body; // action: 'APPROVE' | 'REJECT'

    if (!id || !action) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const sub = await prisma.subscriptionHistory.findUnique({
      where: { id },
      include: { plan: true, store: true },
    });

    if (!sub) {
      return NextResponse.json({ error: 'ไม่พบรายการนี้' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // Guard against double approval (double-click / retry): extending the
      // subscription twice for one payment would hand out free days.
      if (sub.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'รายการนี้ถูกดำเนินการไปแล้ว (อนุมัติ/ปฏิเสธ ไปก่อนหน้านี้)' },
          { status: 400 }
        );
      }

      const currentEnd = new Date(sub.store.subscriptionEnd);
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      baseDate.setDate(baseDate.getDate() + sub.plan.durationDays);

      await prisma.$transaction([
        prisma.subscriptionHistory.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: admin.name,
            note: note || sub.note,
          },
        }),
        prisma.store.update({
          where: { id: sub.storeId },
          data: {
            status: 'ACTIVE',
            subscriptionEnd: baseDate,
            planId: sub.planId,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `อนุมัติและขยายวันใช้งานของร้าน ${sub.store.name} เพิ่ม ${sub.plan.durationDays} วัน เรียบร้อยแล้ว`,
      });
    } else if (action === 'REJECT') {
      await prisma.subscriptionHistory.update({
        where: { id },
        data: {
          status: 'REJECTED',
          note: note || 'สลิปไม่ถูกต้อง หรือยอดเงินไม่ตรง',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'ปฏิเสธรายการแจ้งชำระเงินเรียบร้อยแล้ว',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
