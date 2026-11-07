import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as checkAvailabilityPost, GET as checkAvailabilityGet } from '@/app/api/auth/check-availability/route';
import { POST as sendOtpPost } from '@/app/api/auth/otp/send/route';

describe('Real-Time Availability & Duplicate Prevention Verification', () => {
  const existingPhone = '0881112233';
  const existingEmail = 'store-exist@example.com';
  const existingBank = '1234567890';
  const existingPromptPay = '0881112233';

  const newPhone = '0895556677';
  const newEmail = 'brand-new-store@example.com';
  const newBank = '9876543210';
  const newPromptPay = '0895556677';

  let testStoreId: string = '';
  let testUserId: string = '';

  beforeAll(async () => {
    // Clean up any lingering test records
    await prisma.storeTrialAudit.deleteMany({
      where: {
        OR: [
          { phone: existingPhone },
          { bankAccountNo: existingBank },
          { email: existingEmail },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { phone: existingPhone },
          { email: existingEmail },
        ],
      },
    });

    await prisma.store.deleteMany({
      where: {
        OR: [
          { slug: 'realtime-test-store' },
          { phone: existingPhone },
          { promptPayId: existingPromptPay },
          { bankAccountNo: existingBank },
        ],
      },
    });

    // Create an existing store and user
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 90);

    const store = await prisma.store.create({
      data: {
        slug: 'realtime-test-store',
        name: 'ร้านทดสอบเรียลไทม์',
        phone: existingPhone,
        promptPayId: existingPromptPay,
        promptPayName: 'ร้านทดสอบเรียลไทม์',
        bankName: 'KBANK',
        bankAccountNo: existingBank,
        bankAccountName: 'นายทดสอบ บัญชีเดิม',
        status: 'TRIAL',
        trialEndsAt: trialEnd,
        subscriptionEnd: trialEnd,
      },
    });
    testStoreId = store.id;

    const user = await prisma.user.create({
      data: {
        email: existingEmail,
        passwordHash: 'dummyhash',
        name: 'เจ้าของร้านเดิม',
        phone: existingPhone,
        role: 'STORE_OWNER',
        storeId: store.id,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testStoreId) {
      await prisma.user.deleteMany({ where: { storeId: testStoreId } });
      await prisma.store.deleteMany({ where: { id: testStoreId } });
    }
  });

  it('1. Phone Check: detects existing phone in real-time and returns available=false with red alert text "มีในระบบแล้ว"', async () => {
    // A. Existing phone
    const reqTaken = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'phone', value: existingPhone }),
    });
    const resTaken = await checkAvailabilityPost(reqTaken);
    const dataTaken = await resTaken.json();

    expect(resTaken.status).toBe(200);
    expect(dataTaken.available).toBe(false);
    expect(dataTaken.code).toBe('phone_taken');
    expect(dataTaken.message).toContain('มีในระบบแล้ว');

    // B. New phone
    const reqAvail = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'phone', value: newPhone }),
    });
    const resAvail = await checkAvailabilityPost(reqAvail);
    const dataAvail = await resAvail.json();

    expect(resAvail.status).toBe(200);
    expect(dataAvail.available).toBe(true);
  });

  it('2. Email Check: detects existing owner email and returns available=false with "มีในระบบแล้ว"', async () => {
    // A. Existing email
    const reqTaken = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'email', value: existingEmail }),
    });
    const resTaken = await checkAvailabilityPost(reqTaken);
    const dataTaken = await resTaken.json();

    expect(dataTaken.available).toBe(false);
    expect(dataTaken.code).toBe('email_taken');
    expect(dataTaken.message).toContain('มีในระบบแล้ว');

    // B. New email
    const reqAvail = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'email', value: newEmail }),
    });
    const resAvail = await checkAvailabilityPost(reqAvail);
    const dataAvail = await resAvail.json();

    expect(dataAvail.available).toBe(true);
  });

  it('3. Bank Account Check: detects existing bank account and returns available=false with "มีในระบบแล้ว"', async () => {
    // A. Existing bank account
    const reqTaken = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'bankAccountNo', value: existingBank, bankName: 'KBANK' }),
    });
    const resTaken = await checkAvailabilityPost(reqTaken);
    const dataTaken = await resTaken.json();

    expect(dataTaken.available).toBe(false);
    expect(dataTaken.code).toBe('bank_taken');
    expect(dataTaken.message).toContain('มีในระบบแล้ว');

    // B. New bank account
    const reqAvail = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'bankAccountNo', value: newBank, bankName: 'SCB' }),
    });
    const resAvail = await checkAvailabilityPost(reqAvail);
    const dataAvail = await resAvail.json();

    expect(dataAvail.available).toBe(true);
  });

  it('4. PromptPay Check: detects existing PromptPay ID and returns available=false with "มีในระบบแล้ว"', async () => {
    // A. Existing PromptPay
    const reqTaken = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'promptPayId', value: existingPromptPay }),
    });
    const resTaken = await checkAvailabilityPost(reqTaken);
    const dataTaken = await resTaken.json();

    expect(dataTaken.available).toBe(false);
    expect(dataTaken.code).toBe('promptpay_taken');
    expect(dataTaken.message).toContain('มีในระบบแล้ว');

    // B. New PromptPay
    const reqAvail = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'promptPayId', value: newPromptPay }),
    });
    const resAvail = await checkAvailabilityPost(reqAvail);
    const dataAvail = await resAvail.json();

    expect(dataAvail.available).toBe(true);
  });

  it('5. Batch Check: validates multiple fields in a single POST request', async () => {
    const req = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: existingPhone,
        email: newEmail,
        bankAccountNo: existingBank,
        promptPayId: newPromptPay,
      }),
    });
    const res = await checkAvailabilityPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results.phone.available).toBe(false);
    expect(data.results.phone.message).toContain('มีในระบบแล้ว');

    expect(data.results.email.available).toBe(true);

    expect(data.results.bankAccountNo.available).toBe(false);
    expect(data.results.bankAccountNo.message).toContain('มีในระบบแล้ว');

    expect(data.results.promptPayId.available).toBe(true);
  });

  it('6. GET query param check: supports ?field=phone&value=... real-time lookup', async () => {
    const req = new Request(`http://localhost:3000/api/auth/check-availability?field=phone&value=${existingPhone}`);
    const res = await checkAvailabilityGet(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.available).toBe(false);
    expect(data.message).toContain('มีในระบบแล้ว');
  });

  it('7. SMS OTP Request blocks request when phone/bank/email/promptpay is duplicate', async () => {
    // Attempt OTP with duplicate phone
    const reqPhone = new Request('http://localhost:3000/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: existingPhone,
        bankAccountNo: newBank,
        email: newEmail,
        purpose: 'REGISTER',
      }),
    });
    const resPhone = await sendOtpPost(reqPhone);
    const dataPhone = await resPhone.json();

    expect(resPhone.status).toBe(400);
    expect(dataPhone.code).toBe('phone_taken');
    expect(dataPhone.error).toContain('มีในระบบแล้ว');

    // Attempt OTP with duplicate bank account
    const reqBank = new Request('http://localhost:3000/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: newPhone,
        bankAccountNo: existingBank,
        email: newEmail,
        purpose: 'REGISTER',
      }),
    });
    const resBank = await sendOtpPost(reqBank);
    const dataBank = await resBank.json();

    expect(resBank.status).toBe(400);
    expect(dataBank.code).toBe('bank_taken');
    expect(dataBank.error).toContain('มีในระบบแล้ว');
  });
});
