import { prisma } from './prisma';
import { cleanPhoneNumber, formatPhoneNumber, isValidThaiMobile } from './sms';
export { THAI_BANKS, cleanBankAccount, isValidThaiBankAccount, type ThaiBankInfo } from './bank-constants';
import { cleanBankAccount, isValidThaiBankAccount } from './bank-constants';

export interface EligibilityResult {
  eligible: boolean;
  code?: 'phone_taken' | 'bank_taken' | 'invalid_phone' | 'invalid_bank';
  message?: string;
}

/**
 * Checks whether the phone and bank account are eligible for a new store registration.
 * Rejects if either phone or bank account has already been registered in the system
 * (including active users, active stores, or permanent StoreTrialAudit history).
 */
export async function checkRegistrationEligibility(
  phone: string,
  bankAccountNo?: string
): Promise<EligibilityResult> {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || !isValidThaiMobile(cleanPhone)) {
    return {
      eligible: false,
      code: 'invalid_phone',
      message: 'เบอร์โทรศัพท์มือถือไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก (เช่น 0812345678)',
    };
  }

  const formattedPhone = formatPhoneNumber(cleanPhone);
  const phoneVariations = Array.from(new Set([cleanPhone, formattedPhone, phone].filter(Boolean)));

  // 1. Check phone in User table
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: phoneVariations.map(p => ({ phone: p })),
    },
  });

  if (existingUser) {
    return {
      eligible: false,
      code: 'phone_taken',
      message: 'เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบด้วยเบอร์นี้หรือใช้เบอร์อื่น',
    };
  }

  // 2. Check phone in Store table
  const existingStorePhone = await prisma.store.findFirst({
    where: {
      OR: phoneVariations.map(p => ({ phone: p })),
    },
  });

  if (existingStorePhone) {
    return {
      eligible: false,
      code: 'phone_taken',
      message: 'เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบด้วยเบอร์นี้หรือใช้เบอร์อื่น',
    };
  }

  // 3. Check phone in permanent StoreTrialAudit (prevents re-registration even after store delete)
  const auditPhone = await (prisma as any).storeTrialAudit.findFirst({
    where: {
      OR: phoneVariations.map(p => ({ phone: p })),
    },
  });

  if (auditPhone) {
    return {
      eligible: false,
      code: 'phone_taken',
      message: 'เบอร์โทรศัพท์นี้ถูกใช้งานและเคยรับสิทธิ์ทดลองใช้แล้ว กรุณาเข้าสู่ระบบเดิมเพื่อต่ออายุ',
    };
  }

  // If bankAccountNo is provided, validate and check uniqueness
  if (bankAccountNo !== undefined && bankAccountNo !== null) {
    const cleanAccount = cleanBankAccount(bankAccountNo);

    if (cleanAccount && !isValidThaiBankAccount(cleanAccount)) {
      return {
        eligible: false,
        code: 'invalid_bank',
        message: 'เลขที่บัญชีธนาคารไม่ถูกต้อง กรุณากรอกตัวเลข 10-12 หลัก',
      };
    }

      const bankVariations = Array.from(new Set([cleanAccount, bankAccountNo].filter(Boolean)));

      // 4. Check bank account in Store table
      const existingStoreBank = await prisma.store.findFirst({
        where: {
          OR: bankVariations.map(b => ({ bankAccountNo: b })),
        },
      });

      if (existingStoreBank) {
        return {
          eligible: false,
          code: 'bank_taken',
          message: 'เลขที่บัญชีธนาคารนี้ถูกใช้งานในระบบแล้ว ไม่สามารถรับสิทธิ์ฟรีซ้ำได้ กรุณาเข้าสู่ระบบบัญชีเดิม',
        };
      }

      // 5. Check bank account in permanent StoreTrialAudit
      const auditBank = await (prisma as any).storeTrialAudit.findFirst({
        where: {
          OR: bankVariations.map(b => ({ bankAccountNo: b })),
        },
      });

      if (auditBank) {
        return {
          eligible: false,
          code: 'bank_taken',
          message: 'เลขที่บัญชีธนาคารนี้ถูกใช้งานและเคยรับสิทธิ์ทดลองใช้แล้ว ไม่สามารถรับสิทธิ์ฟรีซ้ำได้ กรุณาเข้าสู่ระบบบัญชีเดิม',
        };
      }
  }

  return { eligible: true };
}
