import { NextResponse } from 'next/server';
import { cleanPhoneNumber, verifySmsOtp } from '@/lib/sms';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, otp, refCode } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'กรุณากรอกเบอร์โทรศัพท์และรหัส OTP' },
        { status: 400 }
      );
    }

    const clean = cleanPhoneNumber(phone);
    const result = await verifySmsOtp(clean, otp, refCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'รหัส OTP ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'ยืนยันรหัส OTP สำเร็จ',
    });
  } catch (error: any) {
    console.error('Error verifying SMS OTP:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบ OTP' },
      { status: 500 }
    );
  }
}
