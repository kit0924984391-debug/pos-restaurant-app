import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanPhoneNumber, isValidThaiMobile, sendSmsOtp } from '@/lib/sms';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, purpose = 'REGISTER' } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'กรุณากรอกเบอร์โทรศัพท์มือถือ' },
        { status: 400 }
      );
    }

    const clean = cleanPhoneNumber(phone);
    if (!isValidThaiMobile(clean)) {
      return NextResponse.json(
        { error: 'เบอร์โทรศัพท์มือถือไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก (เช่น 0812345678)' },
        { status: 400 }
      );
    }

    // If purpose is REGISTER, check if this phone number is already registered in User table
    if (purpose === 'REGISTER') {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: clean },
            { phone: phone },
          ],
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบด้วยเบอร์นี้หรือใช้เบอร์อื่น' },
          { status: 400 }
        );
      }
    }

    const result = await sendSmsOtp(clean);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending SMS OTP:', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถส่งรหัส OTP ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' },
      { status: 400 }
    );
  }
}
