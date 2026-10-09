import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { stores: true },
        },
      },
    });

    return NextResponse.json({ plans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin(request);
    const body = await request.json();
    const { name, price, durationDays, maxTables, description, sortOrder } = body;

    if (!name || price === undefined || !durationDays) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลแพ็กเกจให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        price: Number(price),
        durationDays: Number(durationDays),
        maxTables: Number(maxTables || 15),
        description: description || null,
        sortOrder: Number(sortOrder || 0),
      },
    });

    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireSuperAdmin(request);
    const body = await request.json();
    const { id, name, price, durationDays, maxTables, description, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID แพ็กเกจ' }, { status: 400 });
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        price: Number(price),
        durationDays: Number(durationDays),
        maxTables: Number(maxTables),
        description,
        isActive,
        sortOrder: Number(sortOrder),
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const PATCH = PUT;

