import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  cleanBankAccount,
  isValidThaiBankAccount,
  checkRegistrationEligibility,
  THAI_BANKS,
} from '@/lib/bank-validation';
import { cleanPhoneNumber } from '@/lib/sms';

describe('Bank Account Validation & Anti-Abuse Free Trial Prevention', () => {
  const testPhoneA = '0821112233';
  const testPhoneB = '0829998877';
  const testBankAccA = '1234567890';
  const testBankAccB = '9876543210';

  beforeAll(async () => {
    // Clean any previous test artifacts
    await (prisma as any).storeTrialAudit?.deleteMany({
      where: { OR: [{ phone: testPhoneA }, { phone: testPhoneB }, { bankAccountNo: testBankAccA }, { bankAccountNo: testBankAccB }] },
    }).catch(() => {});
    await prisma.smsOtp.deleteMany({
      where: { OR: [{ phone: testPhoneA }, { phone: testPhoneB }] },
    }).catch(() => {});
    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone: testPhoneA }, { phone: testPhoneB }] },
    });
    if (existing?.storeId) {
      await prisma.store.delete({ where: { id: existing.storeId } }).catch(() => {});
    }
  });

  afterAll(async () => {
    await (prisma as any).storeTrialAudit?.deleteMany({
      where: { OR: [{ phone: testPhoneA }, { phone: testPhoneB }, { bankAccountNo: testBankAccA }, { bankAccountNo: testBankAccB }] },
    }).catch(() => {});
    await prisma.smsOtp.deleteMany({
      where: { OR: [{ phone: testPhoneA }, { phone: testPhoneB }] },
    }).catch(() => {});
    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone: testPhoneA }, { phone: testPhoneB }] },
    });
    if (existing?.storeId) {
      await prisma.store.delete({ where: { id: existing.storeId } }).catch(() => {});
    }
  });

  it('1. Correctly sanitizes and validates Thai bank accounts', () => {
    expect(cleanBankAccount('123-4-56789-0')).toBe('1234567890');
    expect(cleanBankAccount(' 123 456 7890 ')).toBe('1234567890');
    expect(isValidThaiBankAccount('1234567890')).toBe(true);
    expect(isValidThaiBankAccount('123-4-56789-0')).toBe(true);
    expect(isValidThaiBankAccount('12345')).toBe(false); // too short
    expect(isValidThaiBankAccount('123456789012345')).toBe(false); // too long
    expect(isValidThaiBankAccount('abcdefghij')).toBe(false); // non-digits
  });

  it('2. THAI_BANKS contains all standard banks', () => {
    const bankCodes = THAI_BANKS.map((b) => b.code);
    expect(bankCodes).toContain('KBANK');
    expect(bankCodes).toContain('SCB');
    expect(bankCodes).toContain('BBL');
    expect(bankCodes).toContain('KTB');
    expect(bankCodes).toContain('BAY');
    expect(bankCodes).toContain('TTB');
    expect(bankCodes).toContain('GSB');
  });

  it('3. Fresh phone and fresh bank account are eligible to register', async () => {
    const res = await checkRegistrationEligibility(testPhoneA, testBankAccA);
    expect(res.eligible).toBe(true);
  });

  it('4. Rejects registration if phone already registered in User table', async () => {
    // Create dummy store and user with testPhoneA
    const store = await prisma.store.create({
      data: {
        slug: `test-antiabuse-${Date.now()}`,
        name: 'ร้านทดสอบ ก',
        phone: testPhoneA,
        bankName: 'KBANK',
        bankAccountNo: testBankAccA,
        bankAccountName: 'นายทดสอบ ก',
        trialEndsAt: new Date(),
        subscriptionEnd: new Date(),
      },
    });

    await prisma.user.create({
      data: {
        email: `${testPhoneA}@test.com`,
        passwordHash: 'dummy',
        name: 'นายทดสอบ ก',
        phone: testPhoneA,
        role: 'STORE_OWNER',
        storeId: store.id,
      },
    });

    // Also record into StoreTrialAudit
    await (prisma as any).storeTrialAudit.create({
      data: {
        phone: testPhoneA,
        bankAccountNo: testBankAccA,
        bankName: 'KBANK',
        bankAccountName: 'นายทดสอบ ก',
        storeName: 'ร้านทดสอบ ก',
        storeId: store.id,
      },
    });

    // Attempting to register again with same phone
    const resPhone = await checkRegistrationEligibility(testPhoneA, testBankAccB);
    expect(resPhone.eligible).toBe(false);
    expect(resPhone.code).toBe('phone_taken');
  });

  it('5. Rejects registration if bank account is already registered even with different phone', async () => {
    // Different phone (testPhoneB) but same bank account (testBankAccA)
    const resBank = await checkRegistrationEligibility(testPhoneB, testBankAccA);
    expect(resBank.eligible).toBe(false);
    expect(resBank.code).toBe('bank_taken');
    expect(resBank.message).toContain('เลขที่บัญชีธนาคาร');
  });

  it('6. Permanent Anti-Abuse: Rejects re-registration even after store is deleted', async () => {
    // Delete the store
    const user = await prisma.user.findFirst({ where: { phone: testPhoneA } });
    if (user?.storeId) {
      await prisma.store.delete({ where: { id: user.storeId } });
    }

    // Verify store and user are gone
    const deletedStore = await prisma.store.findFirst({ where: { phone: testPhoneA } });
    expect(deletedStore).toBeNull();

    // But StoreTrialAudit still holds the permanent identity
    const auditRecord = await (prisma as any).storeTrialAudit.findFirst({
      where: { phone: testPhoneA },
    });
    expect(auditRecord).toBeDefined();

    // Trying to register with deleted store's phone
    const retryPhone = await checkRegistrationEligibility(testPhoneA, '9999999999');
    expect(retryPhone.eligible).toBe(false);
    expect(retryPhone.code).toBe('phone_taken');

    // Trying to register with deleted store's bank account
    const retryBank = await checkRegistrationEligibility('0839991122', testBankAccA);
    expect(retryBank.eligible).toBe(false);
    expect(retryBank.code).toBe('bank_taken');
  });

  it('7. PromptPay ID validation correctly verifies 10-digit mobile and 13-digit citizen/tax IDs', async () => {
    const { cleanPromptPayId, isValidThaiPromptPay } = await import('@/lib/bank-validation');
    expect(cleanPromptPayId('081-234-5678')).toBe('0812345678');
    expect(isValidThaiPromptPay('0812345678')).toBe(true);
    expect(isValidThaiPromptPay('1234567890123')).toBe(true);
    expect(isValidThaiPromptPay('12345')).toBe(false);
    expect(isValidThaiPromptPay('abc0812345678')).toBe(true); // cleaned to 10 digits starting with 0
  });

  it('8. Rejects registration when PromptPay ID is already registered to another store', async () => {
    // Create dummy store with a promptpay
    const promptPayStore = await prisma.store.create({
      data: {
        slug: `test-promptpay-${Date.now()}`,
        name: 'ร้านทดสอบพร้อมเพย์',
        phone: '0855554433',
        promptPayId: '0855554433',
        status: 'TRIAL',
        trialEndsAt: new Date(),
        subscriptionEnd: new Date(),
      },
    });

    const checkRes = await checkRegistrationEligibility('0866667788', '5555555555', 'testpp@example.com', '0855554433');
    expect(checkRes.eligible).toBe(false);
    expect(checkRes.code).toBe('promptpay_taken');
    expect(checkRes.message).toContain('หมายเลขพร้อมเพย์นี้ถูกใช้งานในระบบแล้ว');

    // Clean up
    await prisma.store.delete({ where: { id: promptPayStore.id } });
  });
});
