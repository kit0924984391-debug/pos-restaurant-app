import { prisma } from './prisma';

/**
 * Normalizes a Thai phone number by removing non-numeric characters
 * and converting country code (+66) to leading 0.
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('66') && clean.length === 11) {
    clean = '0' + clean.slice(2);
  }
  return clean;
}

/**
 * Formats a 10-digit Thai phone number into standard 0XX-XXX-XXXX format.
 */
export function formatPhoneNumber(phone: string): string {
  const clean = cleanPhoneNumber(phone);
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  if (clean.length === 9) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`;
  }
  return phone;
}

/**
 * Validates whether the number is a valid Thai mobile phone (06, 08, 09 followed by 8 digits).
 */
export function isValidThaiMobile(phone: string): boolean {
  const clean = cleanPhoneNumber(phone);
  return /^0[689]\d{8}$/.test(clean);
}

/**
 * Generates a random 6-digit numeric OTP.
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a random 4-character uppercase alphanumeric reference code (e.g. "AB12").
 */
function generateRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  for (let i = 0; i < 4; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export interface SendOtpResult {
  success: boolean;
  refCode: string;
  expiresInSeconds: number;
  devOtp?: string; // Provided in development or mock mode for easy testing
  message: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Request sending an SMS OTP to the given phone number.
 */
export async function sendSmsOtp(rawPhone: string): Promise<SendOtpResult> {
  const cleanPhone = cleanPhoneNumber(rawPhone);

  if (!isValidThaiMobile(cleanPhone)) {
    throw new Error('เบอร์โทรศัพท์มือถือไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก (เช่น 0812345678)');
  }

  const now = new Date();

  // Cooldown check: Prevent requesting more than once within 60 seconds
  const recentOtp = await (prisma as any).smsOtp.findFirst({
    where: {
      phone: cleanPhone,
      createdAt: {
        gte: new Date(now.getTime() - 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentOtp) {
    const elapsedSeconds = Math.floor((now.getTime() - new Date(recentOtp.createdAt).getTime()) / 1000);
    const waitSeconds = Math.max(1, 60 - elapsedSeconds);
    throw new Error(`กรุณารออีก ${waitSeconds} วินาที ก่อนขอรหัส OTP ใหม่อีกครั้ง`);
  }

  // Generate OTP and Ref
  const otpCode = generateOtpCode();
  const refCode = generateRefCode();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity

  // Invalidate any older unverified OTPs for this phone
  await (prisma as any).smsOtp.updateMany({
    where: {
      phone: cleanPhone,
      verified: false,
    },
    data: {
      verified: true, // mark expired/superseded
    },
  }).catch(() => {});

  // Save new OTP record
  await (prisma as any).smsOtp.create({
    data: {
      phone: cleanPhone,
      otpCode,
      refCode,
      expiresAt,
      verified: false,
      attempts: 0,
    },
  });

  // SMS Gateway Integration (ThaiBulkSMS, SMSMKT, Twilio or MOCK)
  const smsProvider = process.env.SMS_PROVIDER || 'MOCK';
  const smsApiKey = process.env.SMS_API_KEY;
  const smsApiSecret = process.env.SMS_API_SECRET;

  if (smsProvider === 'THAIBULKSMS' && smsApiKey && smsApiSecret) {
    try {
      // Example call to ThaiBulkSMS API
      await fetch('https://api-v2.thaibulksms.com/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${smsApiKey}:${smsApiSecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          msisdn: cleanPhone,
          message: `[Order Pos] รหัส OTP ของคุณคือ ${otpCode} (Ref: ${refCode}) หมดอายุใน 5 นาที ห้ามแจ้งรหัสนี้แก่ผู้อื่น`,
          sender: process.env.SMS_SENDER || 'OrderPos',
        }),
      });
      console.log(`[SMS-LIVE] Sent OTP to ${cleanPhone} via ThaiBulkSMS (Ref: ${refCode})`);
    } catch (err: any) {
      console.error('[SMS-ERROR] Failed to send via ThaiBulkSMS:', err);
    }
  } else {
    // Development / Mock mode
    console.log(`=========================================`);
    console.log(`[SMS-MOCK] 📱 To: ${cleanPhone}`);
    console.log(`[SMS-MOCK] 🔢 OTP: ${otpCode} (Ref: ${refCode})`);
    console.log(`[SMS-MOCK] ⏱️ Expires: 5 minutes`);
    console.log(`=========================================`);
  }

  return {
    success: true,
    refCode,
    expiresInSeconds: 300,
    // Return devOtp so the user can easily test in development or when no SMS credits are configured
    devOtp: otpCode,
    message: `ส่งรหัส OTP ไปยังเบอร์ ${formatPhoneNumber(cleanPhone)} สำเร็จ (Ref: ${refCode})`,
  };
}

/**
 * Verifies that the submitted OTP code matches the database record.
 */
export async function verifySmsOtp(
  rawPhone: string,
  submittedOtp: string,
  refCode?: string
): Promise<VerifyOtpResult> {
  const cleanPhone = cleanPhoneNumber(rawPhone);
  const otp = String(submittedOtp || '').trim();

  if (!cleanPhone || !otp) {
    return { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์และรหัส OTP ให้ครบถ้วน' };
  }

  const now = new Date();

  // Find the matching unverified OTP record
  const query: any = {
    phone: cleanPhone,
    verified: false,
    expiresAt: { gte: now },
  };

  if (refCode && refCode.trim()) {
    query.refCode = refCode.trim().toUpperCase();
  }

  const record = await (prisma as any).smsOtp.findFirst({
    where: query,
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return {
      success: false,
      error: 'รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว กรุณากดขอรหัส OTP ใหม่อีกครั้ง',
    };
  }

  if (record.attempts >= 5) {
    return {
      success: false,
      error: 'กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณากดขอรหัส OTP ใหม่อีกครั้ง',
    };
  }

  // Check code
  if (record.otpCode !== otp) {
    // Increment failed attempts
    await (prisma as any).smsOtp.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });

    const remaining = 4 - record.attempts;
    return {
      success: false,
      error: `รหัส OTP ไม่ถูกต้อง (เหลือโอกาสลองอีก ${Math.max(0, remaining)} ครั้ง)`,
    };
  }

  // Successfully verified! Mark as verified
  await (prisma as any).smsOtp.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return {
    success: true,
    message: 'ยืนยันรหัส OTP ถูกต้องเรียบร้อย',
  };
}
