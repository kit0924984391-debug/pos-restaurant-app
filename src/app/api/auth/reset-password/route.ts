import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { maskEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET: Validate token status before rendering or submitting
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'ไม่พบรหัสโทเค็นสำหรับกู้คืนรหัสผ่าน' },
        { status: 400 }
      );
    }

    const resetRecord = await (prisma as any).passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { valid: false, error: 'ลิงก์กู้คืนรหัสผ่านไม่ถูกต้อง หรือไม่พบในระบบ' },
        { status: 404 }
      );
    }

    if (resetRecord.usedAt) {
      return NextResponse.json(
        { valid: false, error: 'ลิงก์นี้ถูกใช้งานเพื่อเปลี่ยนรหัสผ่านไปแล้ว' },
        { status: 410 }
      );
    }

    if (new Date() > new Date(resetRecord.expiresAt)) {
      return NextResponse.json(
        { valid: false, error: 'ลิงก์นี้หมดอายุแล้ว (มีอายุ 30 นาที) กรุณาทำรายการขอใหม่อีกครั้ง' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: maskEmail(resetRecord.email),
    });
  } catch (error: any) {
    console.error('Error validating reset token:', error);
    return NextResponse.json(
      { valid: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบลิงก์' },
      { status: 500 }
    );
  }
}

// POST: Execute the password update
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'ไม่พบโทเค็นสำหรับเปลี่ยนรหัสผ่าน' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const resetRecord = await (prisma as any).passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'ลิงก์กู้คืนรหัสผ่านไม่ถูกต้อง หรือไม่พบในระบบ' },
        { status: 404 }
      );
    }

    if (resetRecord.usedAt) {
      return NextResponse.json(
        { error: 'ลิงก์นี้ถูกใช้งานเปลี่ยนรหัสผ่านไปแล้ว กรุณาขอลิงก์ใหม่' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(resetRecord.expiresAt)) {
      return NextResponse.json(
        { error: 'ลิงก์นี้หมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง' },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await (prisma as any).passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Clear any brute-force login attempts lockout for this user
    await prisma.$executeRaw`
      DELETE FROM LoginAttempt WHERE key LIKE ${'%' + resetRecord.email + '%'}
    `.catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที',
    });
  } catch (error: any) {
    console.error('Error in reset-password API:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
