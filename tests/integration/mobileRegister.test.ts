import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { sendSmsOtp, verifySmsOtp, cleanPhoneNumber, isValidThaiMobile } from '@/lib/sms';
import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Mobile Registration & SMS OTP End-to-End Flow', () => {
  const testPhone = '0899998877';
  const testPassword = 'testpassword123';
  const testStoreName = 'ร้านทดสอบระบบมือถือ';
  const testUserName = 'คุณทดสอบ สมัครผ่านมือถือ';

  beforeAll(async () => {
    // Cleanup prior test artifacts
    await prisma.smsOtp.deleteMany({ where: { phone: testPhone } }).catch(() => {});
    await prisma.$executeRaw`DELETE FROM LoginAttempt WHERE key LIKE ${'%:' + testPhone}`.catch(() => {});
    const existing = await prisma.user.findFirst({ where: { phone: testPhone } });
    if (existing?.storeId) {
      await prisma.store.delete({ where: { id: existing.storeId } }).catch(() => {});
    }
  });

  afterAll(async () => {
    // Cleanup after test
    await prisma.smsOtp.deleteMany({ where: { phone: testPhone } }).catch(() => {});
    await prisma.$executeRaw`DELETE FROM LoginAttempt WHERE key LIKE ${'%:' + testPhone}`.catch(() => {});
    const existing = await prisma.user.findFirst({ where: { phone: testPhone } });
    if (existing?.storeId) {
      await prisma.store.delete({ where: { id: existing.storeId } }).catch(() => {});
    }
  });

  it('Step 1: Validates Thai mobile phone format', () => {
    expect(isValidThaiMobile(testPhone)).toBe(true);
    expect(cleanPhoneNumber('089-999-8877')).toBe(testPhone);
  });

  it('Step 2: Sends SMS OTP and receives 6-digit OTP + 4-char refCode in dev mode', async () => {
    const sendResult = await sendSmsOtp(testPhone);

    expect(sendResult.success).toBe(true);
    expect(sendResult.refCode).toBeDefined();
    expect(sendResult.refCode?.length).toBe(4);
    expect(sendResult.devOtp).toBeDefined();
    expect(sendResult.devOtp?.length).toBe(6);

    // Verify OTP record in database
    const otpRecord = await prisma.smsOtp.findFirst({
      where: { phone: testPhone, refCode: sendResult.refCode },
    });
    expect(otpRecord).toBeDefined();
    expect(otpRecord?.otpCode).toBe(sendResult.devOtp);
    expect(otpRecord?.verified).toBe(false);
  });

  it('Step 3: Rejects incorrect OTP code', async () => {
    const wrongResult = await verifySmsOtp(testPhone, '000000');
    expect(wrongResult.success).toBe(false);
    expect(wrongResult.error).toContain('ไม่ถูกต้อง');
  });

  it('Step 4: Verifies correct OTP code and marks it verified', async () => {
    const otpRecord = await prisma.smsOtp.findFirst({
      where: { phone: testPhone },
      orderBy: { createdAt: 'desc' },
    });
    expect(otpRecord).toBeDefined();

    const verifyResult = await verifySmsOtp(testPhone, otpRecord!.otpCode, otpRecord!.refCode);
    expect(verifyResult.success).toBe(true);

    const updatedRecord = await prisma.smsOtp.findUnique({
      where: { id: otpRecord!.id },
    });
    expect(updatedRecord?.verified).toBe(true);
  });

  it('Step 5: Completes registration creating Store and User', async () => {
    const passwordHash = await hashPassword(testPassword);
    const slug = `test-store-${Date.now()}`;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 90);

    const store = await prisma.store.create({
      data: {
        slug,
        name: testStoreName,
        phone: testPhone,
        status: 'TRIAL',
        trialEndsAt: trialEnd,
        subscriptionEnd: trialEnd,
      },
    });
    expect(store.id).toBeDefined();
    expect(store.name).toBe(testStoreName);

    const user = await prisma.user.create({
      data: {
        name: testUserName,
        email: `${testPhone}@ordeopos.com`,
        phone: testPhone,
        passwordHash,
        role: 'STORE_OWNER',
        storeId: store.id,
      },
    });
    expect(user.id).toBeDefined();
    expect(user.phone).toBe(testPhone);
    expect(user.role).toBe('STORE_OWNER');
  });

  it('Step 6: Prevents duplicate registration with the same mobile number', async () => {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ phone: testPhone }, { phone: cleanPhoneNumber(testPhone) }],
      },
    });
    expect(existing).not.toBeNull();
  });

  it('Step 7: Successfully logs in using the registered mobile phone number', async () => {
    const foundUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone: testPhone }, { email: `${testPhone}@ordeopos.com` }],
      },
    });
    expect(foundUser).toBeDefined();

    const isPasswordValid = await verifyPassword(testPassword, foundUser!.passwordHash);
    expect(isPasswordValid).toBe(true);
  });
});

describe('Next.js API Route Handlers Integration (/api/auth)', () => {
  const apiPhone = '0871112233';
  const apiPassword = 'password888';
  let receivedOtp = '';
  let receivedRef = '';

  beforeAll(async () => {
    await prisma.smsOtp.deleteMany({ where: { phone: apiPhone } }).catch(() => {});
    await prisma.$executeRaw`DELETE FROM LoginAttempt WHERE key LIKE ${'%:' + apiPhone}`.catch(() => {});
    const existing = await prisma.user.findFirst({ where: { phone: apiPhone } });
    if (existing?.storeId) {
      await prisma.store.delete({ where: { id: existing.storeId } }).catch(() => {});
    }
  });

  afterAll(async () => {
    await prisma.smsOtp.deleteMany({ where: { phone: apiPhone } }).catch(() => {});
    await prisma.$executeRaw`DELETE FROM LoginAttempt WHERE key LIKE ${'%:' + apiPhone}`.catch(() => {});
    const existing = await prisma.user.findFirst({ where: { phone: apiPhone } });
    if (existing?.storeId) {
      await prisma.store.delete({ where: { id: existing.storeId } }).catch(() => {});
    }
  });

  it('POST /api/auth/otp/send generates OTP via API', async () => {
    const { POST: sendOtp } = await import('@/app/api/auth/otp/send/route');
    const req = new Request('http://localhost:3000/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '087-111-2233' }),
    });

    const res = await sendOtp(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.refCode).toBeDefined();
    expect(data.devOtp).toBeDefined();
    receivedOtp = data.devOtp;
    receivedRef = data.refCode;
  });

  it('POST /api/auth/register creates account and returns 200 with session cookie', async () => {
    const { POST: register } = await import('@/app/api/auth/register/route');
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'เจ้าของร้านผ่าน API',
        storeName: 'ครัวแซ่บออร์เดียโอ',
        phone: '087-111-2233',
        password: apiPassword,
        otp: receivedOtp,
        refCode: receivedRef,
      }),
    });

    const res = await register(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.phone).toBe(apiPhone);
    expect(data.user.role).toBe('STORE_OWNER');
    expect(res.headers.get('set-cookie')).toContain('pos_auth_token');
  });

  it('POST /api/auth/register rejects duplicate registration with same phone', async () => {
    const { POST: register } = await import('@/app/api/auth/register/route');
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'พยายามสมัครซ้ำ',
        storeName: 'ครัวซ้ำ',
        phone: '0871112233',
        password: apiPassword,
        otp: '123456',
      }),
    });

    const res = await register(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('ถูกใช้งาน');
  });

  it('POST /api/auth/login logs in with phone number (with dashes) and password', async () => {
    const { POST: login } = await import('@/app/api/auth/login/route');
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '087-111-2233',
        password: apiPassword,
      }),
    });

    const res = await login(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.phone).toBe(apiPhone);
    expect(data.user.role).toBe('STORE_OWNER');
    expect(res.headers.get('set-cookie')).toContain('pos_auth_token');
  });
});

