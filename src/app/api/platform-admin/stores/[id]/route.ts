import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const store = await prisma.store.findUnique({
      where: { id: params.id },
      include: {
        plan: true,
        users: true,
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { tables: true, orders: true, menuItems: true },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้านี้' }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const { action, status, daysToAdd, planId, name, phone, promptPayId } = body;

    const store = await prisma.store.findUnique({
      where: { id: params.id },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const updateData: any = {};

    if (action === 'CHANGE_STATUS' && status) {
      updateData.status = status;
    }

    if (action === 'EXTEND_DAYS' && daysToAdd) {
      const currentEnd = new Date(store.subscriptionEnd);
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      baseDate.setDate(baseDate.getDate() + Number(daysToAdd));
      updateData.subscriptionEnd = baseDate;
      updateData.status = 'ACTIVE';
    }

    if (planId) {
      updateData.planId = planId;
    }

    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (promptPayId !== undefined) updateData.promptPayId = promptPayId;

    const updated = await prisma.store.update({
      where: { id: params.id },
      data: updateData,
      include: { plan: true },
    });

    return NextResponse.json({ success: true, store: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    await prisma.store.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'ลบร้านค้าเรียบร้อยแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
