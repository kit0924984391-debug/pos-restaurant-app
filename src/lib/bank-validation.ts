import { prisma } from './prisma';
import { cleanPhoneNumber, formatPhoneNumber, isValidThaiMobile } from './sms';
import { isValidEmail } from './email';
export { THAI_BANKS, cleanBankAccount, isValidThaiBankAccount, type ThaiBankInfo } from './bank-constants';
import { cleanBankAccount, isValidThaiBankAccount } from './bank-constants';

export interface EligibilityResult {
  eligible: boolean;
  code?: 'phone_taken' | 'bank_taken' | 'email_taken' | 'invalid_phone' | 'invalid_bank' | 'invalid_email' | 'invalid_promptpay' | 'promptpay_taken';
  message?: string;
}

export function cleanPromptPayId(id: string): string {
  if (!id) return '';
  return id.replace(/\D/g, '');
}

export function isValidThaiPromptPay(id: string): boolean {
  const clean = cleanPromptPayId(id);
  if (clean.length === 10) {
    return clean.startsWith('0');
  }
  if (clean.length === 13 || clean.length === 15) {
    return true;
  }
  return false;
}

/**
 * Checks whether the phone, bank account, email, and promptpay are eligible for a new store registration.
 * Rejects if phone, bank account, email, or promptpay has already been registered in the system
 * (including active users, active stores, or permanent StoreTrialAudit history).
 */
export async function checkRegistrationEligibility(
  phone: string,
  bankAccountNo?: string,
  email?: string,
  promptPayId?: string
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
      message: 'เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว (มีในระบบแล้ว) กรุณาเข้าสู่ระบบด้วยเบอร์นี้หรือใช้เบอร์อื่น',
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
      message: 'เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว (มีในระบบแล้ว) กรุณาเข้าสู่ระบบด้วยเบอร์นี้หรือใช้เบอร์อื่น',
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
      message: 'เบอร์โทรศัพท์นี้ถูกใช้งานและเคยรับสิทธิ์ทดลองใช้แล้ว (มีในระบบแล้ว) กรุณาเข้าสู่ระบบเดิมเพื่อต่ออายุ',
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
          message: 'เลขที่บัญชีธนาคารนี้ถูกใช้งานในระบบแล้ว (มีในระบบแล้ว) ไม่สามารถรับสิทธิ์ฟรีซ้ำได้ กรุณาเข้าสู่ระบบบัญชีเดิม',
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
          message: 'เลขที่บัญชีธนาคารนี้ถูกใช้งานและเคยรับสิทธิ์ทดลองใช้แล้ว (มีในระบบแล้ว) ไม่สามารถรับสิทธิ์ฟรีซ้ำได้ กรุณาเข้าสู่ระบบบัญชีเดิม',
        };
      }
  }

  // 6. Check email uniqueness in User and StoreTrialAudit
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return {
        eligible: false,
        code: 'invalid_email',
        message: 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
      };
    }

    const existingEmailUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingEmailUser) {
      return {
        eligible: false,
        code: 'email_taken',
        message: 'อีเมลนี้ถูกใช้งานในระบบแล้ว (มีในระบบแล้ว) กรุณาเข้าสู่ระบบด้วยอีเมลนี้หรือใช้อีเมลอื่น',
      };
    }

    const auditEmail = await (prisma as any).storeTrialAudit.findFirst({
      where: { email: cleanEmail },
    });

    if (auditEmail) {
      return {
        eligible: false,
        code: 'email_taken',
        message: 'อีเมลนี้ถูกใช้งานและเคยรับสิทธิ์ทดลองใช้แล้ว (มีในระบบแล้ว) ไม่สามารถรับสิทธิ์ฟรีซ้ำได้ กรุณาเข้าสู่ระบบเดิม',
      };
    }
  }

  // 7. Check promptPayId uniqueness in Store table
  if (promptPayId !== undefined && promptPayId !== null && String(promptPayId).trim()) {
    const cleanPromptPay = cleanPromptPayId(String(promptPayId));
    if (!cleanPromptPay || !isValidThaiPromptPay(cleanPromptPay)) {
      return {
        eligible: false,
        code: 'invalid_promptpay',
        message: 'หมายเลขพร้อมเพย์ไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก',
      };
    }

    const existingPromptPayStore = await prisma.store.findFirst({
      where: { promptPayId: cleanPromptPay },
    });
    if (existingPromptPayStore) {
      return {
        eligible: false,
        code: 'promptpay_taken',
        message: 'หมายเลขพร้อมเพย์นี้ถูกใช้งานในระบบแล้ว มีในระบบแล้ว ไม่สามารถรับสิทธิ์ฟรีซ้ำได้',
      };
    }
  }

  return { eligible: true };
}

export type AvailabilityField = 'phone' | 'email' | 'bankAccountNo' | 'promptPayId';

export interface FieldAvailabilityResult {
  available: boolean;
  field: AvailabilityField;
  code?: 'phone_taken' | 'email_taken' | 'bank_taken' | 'promptpay_taken' | 'invalid_format';
  message?: string;
}

/**
 * Real-time field availability checker for registration form.
 * Returns { available: false, message: 'มีในระบบแล้ว' } if duplicate is detected in the system.
 */
export async function checkSingleFieldAvailability(
  field: AvailabilityField,
  value: string,
  extra?: { bankName?: string; phoneForPromptPay?: string; excludeStoreId?: string; excludeUserId?: string }
): Promise<FieldAvailabilityResult> {
  if (!value || !String(value).trim()) {
    return { available: true, field };
  }

  const storeFilter = extra?.excludeStoreId ? { id: { not: extra.excludeStoreId } } : {};
  const notCurrentStoreCondition = extra?.excludeStoreId
    ? {
        OR: [
          { storeId: { not: extra.excludeStoreId } },
          { storeId: null },
        ],
      }
    : null;

  if (field === 'phone') {
    const clean = cleanPhoneNumber(value);
    if (clean.length < 10) {
      return { available: true, field: 'phone' };
    }
    if (!isValidThaiMobile(clean)) {
      return {
        available: false,
        field: 'phone',
        code: 'invalid_format',
        message: 'เบอร์มือถือไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 10 หลัก)',
      };
    }
    const formatted = formatPhoneNumber(clean);
    const variations = Array.from(new Set([clean, formatted, value].filter(Boolean)));

    const userPhoneWhere: any = {
      OR: variations.map((p) => ({ phone: p })),
    };
    if (notCurrentStoreCondition) {
      userPhoneWhere.AND = [notCurrentStoreCondition];
    }

    const auditPhoneWhere: any = {
      OR: variations.map((p) => ({ phone: p })),
    };
    if (notCurrentStoreCondition) {
      auditPhoneWhere.AND = [notCurrentStoreCondition];
    }

    const [existingUser, existingStore, auditPhone] = await Promise.all([
      prisma.user.findFirst({ where: userPhoneWhere }),
      prisma.store.findFirst({ where: { ...storeFilter, OR: variations.map((p) => ({ phone: p })) } }),
      (prisma as any).storeTrialAudit.findFirst({ where: auditPhoneWhere }),
    ]);

    if (existingUser || existingStore || auditPhone) {
      return {
        available: false,
        field: 'phone',
        code: 'phone_taken',
        message: 'มีในระบบแล้ว',
      };
    }
    return { available: true, field: 'phone' };
  }

  if (field === 'email') {
    const cleanEmail = value.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { available: true, field: 'email' };
    }
    if (!isValidEmail(cleanEmail)) {
      return {
        available: false,
        field: 'email',
        code: 'invalid_format',
        message: 'รูปแบบอีเมลไม่ถูกต้อง',
      };
    }

    const userEmailWhere: any = { email: cleanEmail };
    if (notCurrentStoreCondition) {
      userEmailWhere.AND = [notCurrentStoreCondition];
    }

    const auditEmailWhere: any = { email: cleanEmail };
    if (notCurrentStoreCondition) {
      auditEmailWhere.AND = [notCurrentStoreCondition];
    }

    const [existingEmailUser, auditEmail] = await Promise.all([
      prisma.user.findFirst({ where: userEmailWhere }),
      (prisma as any).storeTrialAudit.findFirst({ where: auditEmailWhere }),
    ]);

    if (existingEmailUser || auditEmail) {
      return {
        available: false,
        field: 'email',
        code: 'email_taken',
        message: 'มีในระบบแล้ว',
      };
    }
    return { available: true, field: 'email' };
  }

  if (field === 'bankAccountNo') {
    const cleanAccount = cleanBankAccount(value);
    if (cleanAccount.length < 10) {
      return { available: true, field: 'bankAccountNo' };
    }
    if (!isValidThaiBankAccount(cleanAccount)) {
      return {
        available: false,
        field: 'bankAccountNo',
        code: 'invalid_format',
        message: 'เลขที่บัญชีต้องมี 10-12 หลัก',
      };
    }

    const variations = Array.from(new Set([cleanAccount, value].filter(Boolean)));
    const auditBankWhere: any = {
      OR: variations.map(b => ({ bankAccountNo: b })),
    };
    if (notCurrentStoreCondition) {
      auditBankWhere.AND = [notCurrentStoreCondition];
    }

    const [existingStoreBank, auditBank] = await Promise.all([
      prisma.store.findFirst({ where: { ...storeFilter, OR: variations.map(b => ({ bankAccountNo: b })) } }),
      (prisma as any).storeTrialAudit.findFirst({ where: auditBankWhere }),
    ]);

    if (existingStoreBank || auditBank) {
      return {
        available: false,
        field: 'bankAccountNo',
        code: 'bank_taken',
        message: 'มีในระบบแล้ว',
      };
    }
    return { available: true, field: 'bankAccountNo' };
  }

  if (field === 'promptPayId') {
    const cleanPromptPay = cleanPromptPayId(value);
    if (cleanPromptPay.length < 10) {
      return { available: true, field: 'promptPayId' };
    }
    if (!isValidThaiPromptPay(cleanPromptPay)) {
      return {
        available: false,
        field: 'promptPayId',
        code: 'invalid_format',
        message: 'หมายเลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก',
      };
    }

    const existingPromptPayStore = await prisma.store.findFirst({
      where: { ...storeFilter, promptPayId: cleanPromptPay },
    });
    if (existingPromptPayStore) {
      return {
        available: false,
        field: 'promptPayId',
        code: 'promptpay_taken',
        message: 'มีในระบบแล้ว',
      };
    }

    if (cleanPromptPay.length === 10 && cleanPromptPay.startsWith('0')) {
      const phoneVariations = [cleanPromptPay, formatPhoneNumber(cleanPromptPay)];
      const userPromptPayWhere: any = {
        OR: phoneVariations.map(p => ({ phone: p })),
      };
      if (notCurrentStoreCondition) {
        userPromptPayWhere.AND = [notCurrentStoreCondition];
      }

      const [existingUserPhone, existingStorePhone] = await Promise.all([
        prisma.user.findFirst({ where: userPromptPayWhere }),
        prisma.store.findFirst({ where: { ...storeFilter, OR: phoneVariations.map(p => ({ phone: p })) } }),
      ]);
      if (existingUserPhone || existingStorePhone) {
        const cleanUserPhone = cleanPhoneNumber(extra?.phoneForPromptPay || '');
        if (cleanUserPhone !== cleanPromptPay) {
          return {
            available: false,
            field: 'promptPayId',
            code: 'promptpay_taken',
            message: 'มีในระบบแล้ว',
          };
        }
      }
    }

    return { available: true, field: 'promptPayId' };
  }

  return { available: true, field };
}
