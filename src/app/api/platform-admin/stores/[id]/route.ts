import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin(request);

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
    const sessionAdmin = await requireSuperAdmin(request);
    const body = await request.json();
    const { action, status, daysToAdd, planId, name, phone, promptPayId, adminPassword, storeName } = body;

    const store = await prisma.store.findUnique({
      where: { id: params.id },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    // 1. Action: CANCEL_DELETE (ยกเลิกการลบ และคืนค่าร้านค้ากลับมาใช้งาน)
    if (action === 'CANCEL_DELETE') {
      const updated = await prisma.store.update({
        where: { id: params.id },
        data: {
          status: 'ACTIVE',
          scheduledDeleteAt: null,
          deletedAt: null,
        },
        include: { plan: true },
      });
      return NextResponse.json({
        success: true,
        message: `ยกเลิกการลบร้าน "${store.name}" เรียบร้อยแล้ว ร้านค้ากลับมาเปิดใช้งานตามปกติ`,
        store: updated,
      });
    }

    // 2. Action: SCHEDULE_DELETE (ขอลบร้านค้า - ยืนยันชื่อร้าน + รหัสผ่าน Super Admin + รอ 30 วัน)
    if (action === 'SCHEDULE_DELETE') {
      if (!adminPassword) {
        return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านผู้ดูแลระบบสูงสุด (Super Admin)' }, { status: 400 });
      }
      const adminUser = await prisma.user.findUnique({ where: { id: sessionAdmin.id } });
      if (!adminUser) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลบัญชีผู้ดูแลระบบ' }, { status: 401 });
      }
      const isPasswordValid = await verifyPassword(adminPassword, adminUser.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'รหัสผ่านผู้ดูแลระบบสูงสุดไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' }, { status: 401 });
      }

      if (!storeName || storeName.trim() !== store.name.trim()) {
        return NextResponse.json({ error: `ชื่อร้านที่กรอกไม่ตรงกับข้อมูลในระบบ ("${store.name}")` }, { status: 400 });
      }

      const now = new Date();
      const scheduledDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 วัน

      const updated = await prisma.store.update({
        where: { id: params.id },
        data: {
          status: 'PENDING_DELETE',
          scheduledDeleteAt: scheduledDate,
          deletedAt: now,
        },
        include: { plan: true },
      });

      return NextResponse.json({
        success: true,
        message: `ตั้งเวลาลบร้าน "${store.name}" เรียบร้อยแล้ว (มีเวลา 30 วันในการกดยกเลิก)`,
        store: updated,
      });
    }

    // 3. Regular Store Updates
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
    const sessionAdmin = await requireSuperAdmin(request);

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body may be empty if called without json
    }

    const { storeName, adminPassword, forcePermanent } = body;

    const store = await prisma.store.findUnique({
      where: { id: params.id },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้านี้ในระบบ' }, { status: 404 });
    }

    // Verification 1: Require Super Admin password
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสผ่านผู้ดูแลระบบสูงสุด (Super Admin)' },
        { status: 400 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: sessionAdmin.id },
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลบัญชีผู้ดูแลระบบ' }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(adminPassword, adminUser.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'รหัสผ่านผู้ดูแลระบบสูงสุดไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    // Verification 2: Require exact store name match
    if (!storeName || storeName.trim() !== store.name.trim()) {
      return NextResponse.json(
        { error: `ชื่อร้านที่กรอกไม่ตรงกับชื่อร้านในระบบ ("${store.name}")` },
        { status: 400 }
      );
    }

    // Permanent delete if explicitly requested (e.g. after grace period)
    if (forcePermanent) {
      await prisma.store.delete({
        where: { id: params.id },
      });
      return NextResponse.json({
        success: true,
        message: `ลบร้านค้า "${store.name}" และข้อมูลทั้งหมดอย่างถาวรเรียบร้อยแล้ว`,
      });
    }

    // Default: Soft Delete with 30-day grace period
    const now = new Date();
    const scheduledDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.store.update({
      where: { id: params.id },
      data: {
        status: 'PENDING_DELETE',
        scheduledDeleteAt: scheduledDate,
        deletedAt: now,
      },
      include: { plan: true },
    });

    return NextResponse.json({
      success: true,
      message: `ตั้งเวลาลบร้าน "${store.name}" เรียบร้อยแล้ว (มีเวลา 30 วันในการกดยกเลิก)`,
      store: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
