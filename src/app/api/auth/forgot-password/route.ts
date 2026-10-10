import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanPhoneNumber, formatPhoneNumber } from '@/lib/sms';
import { isValidEmail, maskEmail, sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier } = body;

    const input = String(identifier || '').trim();
    if (!input) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์มือถือ' },
        { status: 400 }
      );
    }

    let searchConditions: any[] = [];
    const isEmailInput = input.includes('@');

    if (isEmailInput) {
      if (!isValidEmail(input)) {
        return NextResponse.json(
          { error: 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
          { status: 400 }
        );
      }
      searchConditions.push({ email: input.toLowerCase() });
    } else {
      const cleanPhone = cleanPhoneNumber(input);
      const formattedPhone = cleanPhone ? formatPhoneNumber(cleanPhone) : '';
      if (cleanPhone) {
        searchConditions.push({ phone: cleanPhone });
        searchConditions.push({ phone: formattedPhone });
        searchConditions.push({ phone: input });
      }
      searchConditions.push({ email: input.toLowerCase() });
    }

    // Find matching user
    const user = await prisma.user.findFirst({
      where: {
        OR: searchConditions,
      },
      include: {
        store: true,
      },
    });

    // If user not found, return friendly message without leaking user existence
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'หากข้อมูลตรงกับในระบบ เราได้ส่งลิงก์กู้คืนรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว',
      });
    }

    // Check if the user has a valid real email or auto-generated dummy email
    const userEmail = (user.email || '').trim().toLowerCase();
    const isDummyEmail = userEmail.endsWith('@ordeopos.com');

    if (!userEmail || isDummyEmail) {
      return NextResponse.json(
        {
          error: 'บัญชีนี้ยังไม่ได้ผูกอีเมลสำหรับกู้รหัสผ่าน กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งรหัสผ่านใหม่',
          code: 'no_email_registered',
        },
        { status: 400 }
      );
    }

    // Generate secure random reset token
    const randomHex = crypto.randomUUID().replace(/-/g, '');
    const timestampPart = Date.now().toString(36);
    const token = `${randomHex}${timestampPart}`;

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes validity

    // Delete existing unused reset tokens for this user
    await (prisma as any).passwordResetToken.deleteMany({
      where: { userId: user.id },
    }).catch(() => {});

    // Save token to database
    await (prisma as any).passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        email: userEmail,
        expiresAt,
      },
    });

    // Determine application origin URL
    const url = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const protocol = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https';
    const origin = `${protocol}://${host}`;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Send email
    const emailResult = await sendPasswordResetEmail({
      to: userEmail,
      resetUrl,
      userName: user.name,
      storeName: user.store?.name,
    });

    return NextResponse.json({
      success: true,
      maskedEmail: maskEmail(userEmail),
      message: `ระบบได้ส่งลิงก์กู้คืนรหัสผ่านไปยังอีเมล ${maskEmail(userEmail)} เรียบร้อยแล้ว (ลิงก์มีอายุ 30 นาที)`,
      devLink: emailResult.devLink,
    });
  } catch (error: any) {
    console.error('Error in forgot-password API:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งลิงก์กู้คืนรหัสผ่าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
