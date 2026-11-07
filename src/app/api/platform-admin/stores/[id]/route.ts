import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, verifyPassword } from '@/lib/auth';
import { cleanPhoneNumber, isValidThaiMobile } from '@/lib/sms';
import { isValidEmail, sendStoreSecurityEditEmail } from '@/lib/email';
import { isValidThaiPromptPay } from '@/lib/bank-validation';

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
    const {
      action,
      status,
      daysToAdd,
      planId,
      name,
      phone,
      promptPayId,
      promptPayName,
      bankName,
      bankAccountNo,
      bankAccountName,
      ownerEmail,
      adminPassword,
      storeName,
    } = body;

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

    // 2.5 Action: SEND_SECURITY_EDIT_LINK
    // Security Directive: Admin cannot modify payout accounts directly (to prevent self-dealing/hijacking).
    // Admin triggers a one-time secure link to the store owner's email so the customer verifies and edits themselves.
    if (action === 'SEND_SECURITY_EDIT_LINK') {
      const ownerUser = await prisma.user.findFirst({
        where: { storeId: store.id, role: 'STORE_OWNER' },
      });

      const targetEmail = (ownerEmail?.trim() || ownerUser?.email || (store as any).email || '').toLowerCase().trim();
      if (!targetEmail || !isValidEmail(targetEmail)) {
        return NextResponse.json(
          { error: 'ไม่พบอีเมลของเจ้าของร้าน หรือรูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบข้อมูล' },
          { status: 400 }
        );
      }

      // Generate a one-time secure cryptographic token (24-hour expiration)
      const token = `sec_edit_${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: store.id, // Store ID is linked as the resource
          email: targetEmail,
          expiresAt,
        },
      });

      const origin = new URL(request.url).origin;
      const editUrl = `${origin}/store/security-edit?token=${token}`;

      const emailResult = await sendStoreSecurityEditEmail({
        to: targetEmail,
        editUrl,
        userName: ownerUser?.name || store.name,
        storeName: store.name,
      });

      return NextResponse.json({
        success: true,
        message: `ส่งลิงก์แก้ไขข้อมูลร้านค้าไปยังอีเมล ${targetEmail} เรียบร้อยแล้ว (ลิงก์มีอายุ 24 ชั่วโมง)`,
        targetEmail,
        devLink: emailResult.devLink,
        expiresAt: expiresAt.toISOString(),
      });
    }

    // 3. Regular Store Updates & Security Details Updates
    const updateData: any = {};
    let cleanPhoneSync: string | null = null;
    let cleanEmailSync: string | null = null;

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

    if (name) updateData.name = name.trim();

    // Phone Update & Duplicate Check
    if (phone !== undefined) {
      const cleanPhone = cleanPhoneNumber(phone);
      if (cleanPhone) {
        if (!isValidThaiMobile(cleanPhone)) {
          return NextResponse.json({ error: 'เบอร์โทรศัพท์มือถือไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก' }, { status: 400 });
        }
        const dupStorePhone = await prisma.store.findFirst({
          where: { phone: cleanPhone, id: { not: store.id } },
        });
        if (dupStorePhone) {
          return NextResponse.json(
            { error: `เบอร์โทรศัพท์ ${cleanPhone} ถูกใช้งานโดยร้านอื่นแล้ว ("${dupStorePhone.name}")` },
            { status: 409 }
          );
        }
        updateData.phone = cleanPhone;
        cleanPhoneSync = cleanPhone;
      } else {
        updateData.phone = null;
      }
    }

    // PromptPay ID & Name Update & Duplicate Check
    if (promptPayId !== undefined) {
      const cleanPromptPay = String(promptPayId).replace(/\D/g, '');
      if (cleanPromptPay) {
        if (!isValidThaiPromptPay(cleanPromptPay)) {
          return NextResponse.json({ error: 'หมายเลขพร้อมเพย์ไม่ถูกต้อง (ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก)' }, { status: 400 });
        }
        const dupPromptPay = await prisma.store.findFirst({
          where: { promptPayId: cleanPromptPay, id: { not: store.id } },
        });
        if (dupPromptPay) {
          return NextResponse.json(
            { error: `หมายเลขพร้อมเพย์ ${cleanPromptPay} ถูกใช้งานโดยร้านอื่นแล้ว ("${dupPromptPay.name}")` },
            { status: 409 }
          );
        }
        updateData.promptPayId = cleanPromptPay;
      } else {
        updateData.promptPayId = '';
      }
    }

    if (promptPayName !== undefined) {
      updateData.promptPayName = String(promptPayName).trim();
    }

    // Bank Account Update & Duplicate Check
    if (bankAccountNo !== undefined) {
      const cleanAccount = String(bankAccountNo).replace(/\D/g, '');
      if (cleanAccount) {
        if (cleanAccount.length < 10 || cleanAccount.length > 12) {
          return NextResponse.json({ error: 'เลขที่บัญชีธนาคารไม่ถูกต้อง กรุณากรอกตัวเลข 10-12 หลัก' }, { status: 400 });
        }
        const dupBank = await prisma.store.findFirst({
          where: { bankAccountNo: cleanAccount, id: { not: store.id } },
        });
        if (dupBank) {
          return NextResponse.json(
            { error: `เลขที่บัญชีธนาคาร ${cleanAccount} ถูกใช้งานโดยร้านอื่นแล้ว ("${dupBank.name}")` },
            { status: 409 }
          );
        }
        updateData.bankAccountNo = cleanAccount;
      } else {
        updateData.bankAccountNo = '';
      }
    }

    if (bankName !== undefined) {
      updateData.bankName = String(bankName).trim();
    }

    if (bankAccountName !== undefined) {
      updateData.bankAccountName = String(bankAccountName).trim();
    }

    // Owner Email Update & Duplicate Check
    if (ownerEmail !== undefined) {
      const cleanEmail = String(ownerEmail).trim().toLowerCase();
      if (cleanEmail) {
        if (!isValidEmail(cleanEmail)) {
          return NextResponse.json({ error: 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' }, { status: 400 });
        }
        const dupUserEmail = await prisma.user.findFirst({
          where: {
            email: cleanEmail,
            OR: [{ storeId: { not: store.id } }, { storeId: null }],
          },
        });
        if (dupUserEmail) {
          return NextResponse.json(
            { error: `อีเมล ${cleanEmail} ถูกใช้งานโดยบัญชีผู้ใช้อื่นแล้ว` },
            { status: 409 }
          );
        }
        cleanEmailSync = cleanEmail;
      }
    }

    const updated = await prisma.store.update({
      where: { id: params.id },
      data: updateData,
      include: { plan: true, users: true },
    });

    // Synchronize owner User record with updated phone/email
    if (cleanPhoneSync || cleanEmailSync) {
      const ownerUser = await prisma.user.findFirst({
        where: { storeId: store.id, role: 'STORE_OWNER' },
      });
      if (ownerUser) {
        await prisma.user.update({
          where: { id: ownerUser.id },
          data: {
            ...(cleanPhoneSync ? { phone: cleanPhoneSync } : {}),
            ...(cleanEmailSync ? { email: cleanEmailSync } : {}),
          },
        });
      }
    }

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
