import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanPhoneNumber, isValidThaiMobile, verifySmsOtp } from '@/lib/sms';
import { isValidEmail } from '@/lib/email';
import { cleanBankAccount, isValidThaiBankAccount, cleanPromptPayId, isValidThaiPromptPay } from '@/lib/bank-validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/store/security-edit?token=...
 * Validates the one-time security edit token sent by Admin and returns current store details.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'ไม่พบโทเค็นสำหรับการแก้ไขข้อมูล' }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'ลิงก์แก้ไขข้อมูลไม่ถูกต้องหรือไม่มีอยู่ในระบบ' }, { status: 404 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json(
        {
          error: 'ลิงก์นี้ถูกใช้งานไปแล้ว หากต้องการแก้ไขข้อมูลใหม่ กรุณาติดต่อ Platform Admin เพื่อขอรับลิงก์ใหม่',
          code: 'TOKEN_ALREADY_USED',
        },
        { status: 410 }
      );
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        {
          error: 'ลิงก์นี้หมดอายุแล้ว (อายุใช้งาน 24 ชั่วโมง) กรุณาติดต่อ Platform Admin เพื่อขอรับลิงก์ใหม่',
          code: 'TOKEN_EXPIRED',
        },
        { status: 410 }
      );
    }

    // Find store by resetToken.userId (stored as store.id)
    const store = await prisma.store.findUnique({
      where: { id: resetToken.userId },
      include: {
        users: {
          where: { role: 'STORE_OWNER' },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลร้านค้าที่เชื่อมโยงกับลิงก์นี้' }, { status: 404 });
    }

    const ownerUser = store.users[0];

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        phone: store.phone || '',
        ownerName: ownerUser?.name || '',
        ownerEmail: ownerUser?.email || resetToken.email,
        bankName: store.bankName || 'KBANK',
        bankAccountNo: store.bankAccountNo || '',
        bankAccountName: store.bankAccountName || '',
        promptPayId: store.promptPayId || '',
        promptPayName: store.promptPayName || '',
      },
    });
  } catch (error: any) {
    console.error('Error fetching security edit store:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/store/security-edit
 * Allows merchant to securely update phone (with OTP if changed), email, bank, and promptpay.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      token,
      name,
      phone,
      email,
      bankName,
      bankAccountNo,
      bankAccountName,
      promptPayId,
      promptPayName,
      otp,
      refCode,
    } = body;

    if (!token) {
      return NextResponse.json({ error: 'ไม่พบโทเค็นสำหรับการแก้ไขข้อมูล' }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'ลิงก์แก้ไขข้อมูลไม่ถูกต้องหรือไม่มีอยู่ในระบบ' }, { status: 404 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: 'ลิงก์นี้ถูกใช้งานไปแล้ว หากต้องการแก้ไขข้อมูลใหม่ กรุณาติดต่อ Platform Admin เพื่อขอรับลิงก์ใหม่' },
        { status: 410 }
      );
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: 'ลิงก์นี้หมดอายุแล้ว (อายุใช้งาน 24 ชั่วโมง) กรุณาติดต่อ Platform Admin เพื่อขอรับลิงก์ใหม่' },
        { status: 410 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: resetToken.userId },
      include: {
        users: { where: { role: 'STORE_OWNER' } },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลร้านค้า' }, { status: 404 });
    }

    const ownerUser = store.users[0];

    // 1. Validate and clean inputs
    const cleanPhone = cleanPhoneNumber(phone || store.phone || '');
    if (!cleanPhone || !isValidThaiMobile(cleanPhone)) {
      return NextResponse.json(
        { error: 'เบอร์โทรศัพท์มือถือไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก (เช่น 0812345678)' },
        { status: 400 }
      );
    }

    const cleanEmail = (email || ownerUser?.email || resetToken.email).trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 400 }
      );
    }

    const cleanAccount = cleanBankAccount(bankAccountNo || store.bankAccountNo || '');
    if (!cleanAccount || !isValidThaiBankAccount(cleanAccount)) {
      return NextResponse.json(
        { error: 'เลขที่บัญชีธนาคารไม่ถูกต้อง กรุณากรอกตัวเลข 10-12 หลัก' },
        { status: 400 }
      );
    }

    const cleanPromptPay = cleanPromptPayId(promptPayId || store.promptPayId || cleanPhone);
    if (!cleanPromptPay || !isValidThaiPromptPay(cleanPromptPay)) {
      return NextResponse.json(
        { error: 'หมายเลขพร้อมเพย์ไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก' },
        { status: 400 }
      );
    }

    // 2. If phone has changed, verify SMS OTP
    const currentStorePhone = cleanPhoneNumber(store.phone || '');
    if (cleanPhone !== currentStorePhone) {
      if (!otp) {
        return NextResponse.json(
          { error: 'มีการเปลี่ยนแปลงเบอร์โทรศัพท์ กรุณายืนยันรหัส OTP เพื่อความปลอดภัย' },
          { status: 400 }
        );
      }
      const otpRes = await verifySmsOtp(cleanPhone, otp, refCode);
      if (!otpRes.success) {
        return NextResponse.json(
          { error: otpRes.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' },
          { status: 400 }
        );
      }
    }

    // 3. Check uniqueness across OTHER stores & users
    const [dupStorePhone, dupUserPhone, dupUserEmail, dupStoreBank, dupPromptPay] = await Promise.all([
      // Phone in Store
      prisma.store.findFirst({
        where: { phone: cleanPhone, id: { not: store.id } },
      }),
      // Phone in User
      prisma.user.findFirst({
        where: {
          phone: cleanPhone,
          OR: [{ storeId: { not: store.id } }, { storeId: null }],
        },
      }),
      // Email in User
      prisma.user.findFirst({
        where: {
          email: cleanEmail,
          OR: [{ storeId: { not: store.id } }, { storeId: null }],
        },
      }),
      // Bank Account in Store
      prisma.store.findFirst({
        where: { bankAccountNo: cleanAccount, id: { not: store.id } },
      }),
      // PromptPay in Store
      prisma.store.findFirst({
        where: { promptPayId: cleanPromptPay, id: { not: store.id } },
      }),
    ]);

    if (dupStorePhone || dupUserPhone) {
      return NextResponse.json(
        { error: 'เบอร์โทรศัพท์นี้มีในระบบแล้ว (ถูกใช้งานโดยบัญชีอื่น)', code: 'phone_taken' },
        { status: 409 }
      );
    }

    if (dupUserEmail) {
      return NextResponse.json(
        { error: 'อีเมลนี้มีในระบบแล้ว (ถูกใช้งานโดยบัญชีอื่น)', code: 'email_taken' },
        { status: 409 }
      );
    }

    if (dupStoreBank) {
      return NextResponse.json(
        { error: 'เลขที่บัญชีธนาคารนี้มีในระบบแล้ว (ถูกใช้งานโดยร้านอื่น)', code: 'bank_taken' },
        { status: 409 }
      );
    }

    if (dupPromptPay) {
      return NextResponse.json(
        { error: 'หมายเลขพร้อมเพย์นี้มีในระบบแล้ว (ถูกใช้งานโดยร้านอื่น)', code: 'promptpay_taken' },
        { status: 409 }
      );
    }

    // 4. Update Store
    await prisma.store.update({
      where: { id: store.id },
      data: {
        phone: cleanPhone,
        promptPayId: cleanPromptPay,
        promptPayName: promptPayName?.trim() || store.promptPayName || store.name,
        bankName: bankName || store.bankName || 'KBANK',
        bankAccountNo: cleanAccount,
        bankAccountName: bankAccountName?.trim() || store.bankAccountName || store.name,
      },
    });

    // 5. Synchronize Store Owner User
    if (ownerUser) {
      await prisma.user.update({
        where: { id: ownerUser.id },
        data: {
          phone: cleanPhone,
          email: cleanEmail,
          name: (name?.trim()) || ownerUser.name,
        },
      });
    }

    // 6. Update Permanent Anti-Abuse Audit record if exists
    await (prisma as any).storeTrialAudit.updateMany({
      where: { storeId: store.id },
      data: {
        phone: cleanPhone,
        bankAccountNo: cleanAccount,
        bankName: bankName || store.bankName,
        bankAccountName: bankAccountName?.trim() || store.bankAccountName,
        email: cleanEmail,
      },
    });

    // 7. Mark Token as used
    await prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกและอัปเดตข้อมูลความปลอดภัยของร้านค้าเรียบร้อยแล้ว',
      storeSlug: store.slug,
    });
  } catch (error: any) {
    console.error('Error updating store security details:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}
