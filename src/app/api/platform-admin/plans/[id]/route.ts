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

    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { stores: true },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'ไม่พบแพ็กเกจนี้' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin(request);
    const body = await request.json();
    const { name, price, durationDays, maxTables, description, isActive, sortOrder } = body;

    const existing = await prisma.plan.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบแพ็กเกจนี้' }, { status: 404 });
    }

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: Number(price) }),
        ...(durationDays !== undefined && { durationDays: Number(durationDays) }),
        ...(maxTables !== undefined && { maxTables: Number(maxTables) }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin(request);

    const existing = await prisma.plan.findUnique({
      where: { id: params.id },
      include: { _count: { select: { stores: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบแพ็กเกจนี้' }, { status: 404 });
    }

    // If stores are currently linked to this plan, safely deactivate rather than hard-deleting
    if (existing._count.stores > 0) {
      const plan = await prisma.plan.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: 'มีร้านค้าใช้งานแพ็กเกจนี้อยู่ จึงเปลี่ยนสถานะเป็นปิดใช้งานแทนการลบถาวร',
        plan,
      });
    }

    await prisma.plan.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'ลบแพ็กเกจเรียบร้อยแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
