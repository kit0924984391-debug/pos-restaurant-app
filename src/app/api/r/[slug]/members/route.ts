import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, pointsRate: true, pointValue: true },
    });

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const rewards = await prisma.loyaltyReward.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { pointsRequired: 'asc' },
    });

    // Lookup specific member by phone
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const member = await prisma.customerMember.findUnique({
        where: {
          storeId_phone: {
            storeId: store.id,
            phone: cleanPhone,
          },
        },
      });

      return NextResponse.json({
        member: member || null,
        pointsRate: store.pointsRate,
        pointValue: store.pointValue,
        rewards,
      });
    }

    // List all members for store admin (Bug #7: Protected to prevent customer PII leakage)
    try {
      await requireStoreAccess(params.slug);
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized: เฉพาะเจ้าของร้านหรือพนักงานเท่านั้นที่สามารถดูรายชื่อสมาชิกทั้งหมดได้' },
        { status: 401 }
      );
    }

    const members = await prisma.customerMember.findMany({
      where: { storeId: store.id },
      orderBy: { points: 'desc' },
      take: 100,
    });

    return NextResponse.json({ members, pointsRate: store.pointsRate, pointValue: store.pointValue, rewards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { phone, name, action, pointsDelta, points, pointsRate, pointValue } = body;

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // Update store points rate settings
    if (action === 'UPDATE_SETTINGS' && (pointsRate !== undefined || pointValue !== undefined)) {
      try {
        await requireStoreAccess(params.slug);
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const updatedStore = await prisma.store.update({
        where: { id: store.id },
        data: {
          ...(pointsRate !== undefined && { pointsRate: parseFloat(pointsRate) || 25 }),
          ...(pointValue !== undefined && { pointValue: parseFloat(pointValue) || 1 }),
        },
      });
      return NextResponse.json({ success: true, pointsRate: updatedStore.pointsRate, pointValue: updatedStore.pointValue });
    }

    if (!phone) return NextResponse.json({ error: 'กรุณาระบุเบอร์โทรศัพท์' }, { status: 400 });

    const cleanPhone = phone.replace(/\D/g, '');

    // Create new member manually from Admin
    if (action === 'CREATE_MEMBER') {
      try {
        await requireStoreAccess(params.slug);
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const existing = await prisma.customerMember.findUnique({
        where: {
          storeId_phone: {
            storeId: store.id,
            phone: cleanPhone,
          },
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'เบอร์โทรศัพท์นี้มีในระบบแล้ว' }, { status: 400 });
      }

      const member = await prisma.customerMember.create({
        data: {
          storeId: store.id,
          phone: cleanPhone,
          name: name ? name.trim() : 'ลูกค้าทั่วไป',
          points: Math.max(0, parseInt(points) || 0),
        },
      });

      return NextResponse.json({ success: true, member });
    }

    // Adjust points manually
    if (action === 'ADJUST_POINTS' && pointsDelta !== undefined) {
      try {
        await requireStoreAccess(params.slug);
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const delta = parseInt(pointsDelta) || 0;

      // Negative adjustments are guarded so the balance can never go below
      // zero (same clamp as every other points path). A decrement that would
      // overshoot simply clamps the balance to 0.
      if (delta < 0) {
        const debited = await prisma.customerMember.updateMany({
          where: {
            storeId: store.id,
            phone: cleanPhone,
            points: { gte: -delta },
          },
          data: { points: { increment: delta } },
        });
        if (debited.count === 0) {
          await prisma.customerMember.updateMany({
            where: { storeId: store.id, phone: cleanPhone },
            data: { points: 0 },
          });
        }
      } else {
        const member = await prisma.customerMember.upsert({
          where: {
            storeId_phone: {
              storeId: store.id,
              phone: cleanPhone,
            },
          },
          update: {
            points: { increment: delta },
          },
          create: {
            storeId: store.id,
            phone: cleanPhone,
            name: name ? name.trim() : 'ลูกค้าทั่วไป',
            points: delta,
          },
        });
        return NextResponse.json({ success: true, member });
      }

      const member = await prisma.customerMember.findUnique({
        where: { storeId_phone: { storeId: store.id, phone: cleanPhone } },
      });
      return NextResponse.json({ success: true, member });
    }

    // Standard Upsert Member
    const member = await prisma.customerMember.upsert({
      where: {
        storeId_phone: {
          storeId: store.id,
          phone: cleanPhone,
        },
      },
      update: {
        name: name ? name.trim() : undefined,
      },
      create: {
        storeId: store.id,
        phone: cleanPhone,
        name: name ? name.trim() : 'ลูกค้าใหม่',
        points: 0,
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    try {
      await requireStoreAccess(params.slug);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await request.json();
    const { id, phone, name, points } = body;

    if (!id && !phone) {
      return NextResponse.json({ error: 'Missing member id or phone' }, { status: 400 });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : undefined;

    // If changing phone, verify it doesn't conflict with another member in the same store
    if (id && cleanPhone) {
      const conflict = await prisma.customerMember.findFirst({
        where: {
          storeId: store.id,
          phone: cleanPhone,
          id: { not: id },
        },
      });
      if (conflict) {
        return NextResponse.json({ error: 'เบอร์โทรศัพท์นี้ถูกใช้งานโดยสมาชิกท่านอื่นแล้ว' }, { status: 400 });
      }
    }

    const member = await prisma.customerMember.update({
      where: id ? { id } : { storeId_phone: { storeId: store.id, phone: cleanPhone! } },
      data: {
        ...(name !== undefined && { name: name.trim() || 'ลูกค้าทั่วไป' }),
        ...(cleanPhone !== undefined && { phone: cleanPhone }),
        ...(points !== undefined && { points: Math.max(0, parseInt(points) || 0) }),
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: error.message || 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    try {
      await requireStoreAccess(params.slug);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const phone = searchParams.get('phone');

    if (!id && !phone) {
      return NextResponse.json({ error: 'Missing member id or phone' }, { status: 400 });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : undefined;

    const deleteResult = await prisma.customerMember.deleteMany({
      where: {
        storeId: store.id,
        ...(id ? { id } : { phone: cleanPhone }),
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'ไม่พบสมาชิกที่ต้องการลบ' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting member:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete member' }, { status: 500 });
  }
}
