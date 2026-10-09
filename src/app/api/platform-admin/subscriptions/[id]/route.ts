import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin(request);

    const subscription = await prisma.subscriptionHistory.findUnique({
      where: { id: params.id },
      include: {
        store: true,
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'ไม่พบรายการแจ้งชำระเงินนี้' }, { status: 404 });
    }

    return NextResponse.json({ subscription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();
    const { action, note } = body; // action: 'APPROVE' | 'REJECT'
    const id = params.id;

    if (!action) {
      return NextResponse.json({ error: 'กรุณาระบุ action (APPROVE หรือ REJECT)' }, { status: 400 });
    }

    const sub = await prisma.subscriptionHistory.findUnique({
      where: { id },
      include: { plan: true, store: true },
    });

    if (!sub) {
      return NextResponse.json({ error: 'ไม่พบรายการนี้' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // Atomic guard against race conditions: only update if status is still PENDING
      const updateResult = await prisma.subscriptionHistory.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: admin.name,
          note: note || sub.note,
        },
      });

      if (updateResult.count === 0) {
        return NextResponse.json(
          { error: 'รายการนี้ถูกดำเนินการไปแล้ว (อนุมัติ/ปฏิเสธ ไปก่อนหน้านี้)' },
          { status: 400 }
        );
      }

      // Re-read store subscriptionEnd to guarantee fresh baseDate
      const currentStore = await prisma.store.findUnique({ where: { id: sub.storeId } });
      const currentEnd = currentStore?.subscriptionEnd ? new Date(currentStore.subscriptionEnd) : new Date();
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      baseDate.setDate(baseDate.getDate() + sub.plan.durationDays);

      await prisma.store.update({
        where: { id: sub.storeId },
        data: {
          status: 'ACTIVE',
          subscriptionEnd: baseDate,
          planId: sub.planId,
        },
      });

      return NextResponse.json({
        success: true,
        message: `อนุมัติและขยายวันใช้งานของร้าน ${sub.store.name} เพิ่ม ${sub.plan.durationDays} วัน เรียบร้อยแล้ว`,
      });
    } else if (action === 'REJECT') {
      const updateResult = await prisma.subscriptionHistory.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          note: note || 'สลิปไม่ถูกต้อง หรือยอดเงินไม่ตรง',
        },
      });

      if (updateResult.count === 0) {
        return NextResponse.json(
          { error: 'รายการนี้ถูกดำเนินการไปแล้ว (อนุมัติ/ปฏิเสธ ไปก่อนหน้านี้)' },
          { status: 400 }
        );
      }

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
