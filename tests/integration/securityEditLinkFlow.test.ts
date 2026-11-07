import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { sendSmsOtp } from '@/lib/sms';

describe('Admin Security Edit Link Dispatch & Merchant Self-Edit Flow', () => {
  const timestamp = Date.now();
  const storeASlug = `test-link-store-a-${timestamp}`;
  const storeBSlug = `test-link-store-b-${timestamp}`;

  let storeA: any;
  let storeB: any;
  let userA: any;
  let userB: any;
  let superAdminUser: any;
  let superAdminToken: string;
  let securityToken: string;

  beforeAll(async () => {
    // 1. Create Super Admin
    superAdminUser = await prisma.user.create({
      data: {
        name: 'Super Admin Test',
        email: `superadmin-${timestamp}@example.com`,
        phone: '0800000001',
        passwordHash: 'dummyhash',
        role: 'SUPER_ADMIN',
      },
    });
    superAdminToken = await createSessionToken({
      id: superAdminUser.id,
      email: superAdminUser.email,
      name: superAdminUser.name,
      role: superAdminUser.role,
    });

    // 2. Create Store A (target store for security edit)
    storeA = await prisma.store.create({
      data: {
        slug: storeASlug,
        name: 'ร้านทดสอบลิงก์แก้ไข A',
        phone: '0812340001',
        promptPayId: '0812340001',
        promptPayName: 'ร้านทดสอบลิงก์แก้ไข A',
        bankName: 'KBANK',
        bankAccountNo: '1234567891',
        bankAccountName: 'เจ้าของร้าน A',
        status: 'ACTIVE',
        trialEndsAt: new Date(Date.now() + 86400000),
        subscriptionEnd: new Date(Date.now() + 86400000),
      },
    });

    userA = await prisma.user.create({
      data: {
        name: 'เจ้าของร้าน A',
        email: `ownera-${timestamp}@example.com`,
        phone: '0812340001',
        passwordHash: 'dummyhash',
        role: 'STORE_OWNER',
        storeId: storeA.id,
      },
    });

    // 3. Create Store B (to test duplicate conflicts)
    storeB = await prisma.store.create({
      data: {
        slug: storeBSlug,
        name: 'ร้านเปรียบเทียบ B',
        phone: '0898760002',
        promptPayId: '0898760002',
        promptPayName: 'ร้านเปรียบเทียบ B',
        bankName: 'SCB',
        bankAccountNo: '9876543210',
        bankAccountName: 'เจ้าของร้าน B',
        status: 'ACTIVE',
        trialEndsAt: new Date(Date.now() + 86400000),
        subscriptionEnd: new Date(Date.now() + 86400000),
      },
    });

    userB = await prisma.user.create({
      data: {
        name: 'เจ้าของร้าน B',
        email: `ownerb-${timestamp}@example.com`,
        phone: '0898760002',
        passwordHash: 'dummyhash',
        role: 'STORE_OWNER',
        storeId: storeB.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.passwordResetToken.deleteMany({
      where: { email: { in: [`ownera-${timestamp}@example.com`, `new-owner-${timestamp}@example.com`] } },
    }).catch(() => {});
    await (prisma as any).smsOtp?.deleteMany({
      where: { phone: { in: ['0812340001', '0898760002', '0865551234'] } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminUser.id, userA.id, userB.id] } },
    }).catch(() => {});
    await prisma.store.deleteMany({
      where: { id: { in: [storeA.id, storeB.id] } },
    }).catch(() => {});
  });

  it('1. Admin dispatches security edit link to store owner email', async () => {
    const { PATCH: patchStore } = await import('@/app/api/platform-admin/stores/[id]/route');

    const req = new Request(`http://localhost:3000/api/platform-admin/stores/${storeA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${superAdminToken}`,
      },
      body: JSON.stringify({
        action: 'SEND_SECURITY_EDIT_LINK',
        ownerEmail: `ownera-${timestamp}@example.com`,
      }),
    });

    const res = await patchStore(req, { params: { id: storeA.id } });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.targetEmail).toBe(`ownera-${timestamp}@example.com`);
    expect(data.message).toContain('ส่งลิงก์แก้ไขข้อมูลร้านค้าไปยังอีเมล');

    // Verify token was created in DB
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: storeA.id,
        email: `ownera-${timestamp}@example.com`,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(tokenRecord).toBeTruthy();
    expect(tokenRecord!.token).toContain('sec_edit_');
    expect(tokenRecord!.usedAt).toBeNull();
    securityToken = tokenRecord!.token;
  });

  it('2. GET /api/store/security-edit returns store data with valid token and rejects invalid/expired tokens', async () => {
    const { GET: getSecurityStore } = await import('@/app/api/store/security-edit/route');

    // 2.1 Valid Token
    const validReq = new Request(`http://localhost:3000/api/store/security-edit?token=${securityToken}`);
    const validRes = await getSecurityStore(validReq);
    expect(validRes.status).toBe(200);
    const validData = await validRes.json();

    expect(validData.success).toBe(true);
    expect(validData.store.id).toBe(storeA.id);
    expect(validData.store.phone).toBe('0812340001');
    expect(validData.store.promptPayId).toBe('0812340001');
    expect(validData.store.bankAccountNo).toBe('1234567891');

    // 2.2 Invalid Token
    const invalidReq = new Request(`http://localhost:3000/api/store/security-edit?token=invalid_token_12345`);
    const invalidRes = await getSecurityStore(invalidReq);
    expect(invalidRes.status).toBe(404);

    // 2.3 Expired Token
    const expiredToken = `sec_edit_expired_${timestamp}`;
    await prisma.passwordResetToken.create({
      data: {
        token: expiredToken,
        userId: storeA.id,
        email: `ownera-${timestamp}@example.com`,
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
      },
    });

    const expiredReq = new Request(`http://localhost:3000/api/store/security-edit?token=${expiredToken}`);
    const expiredRes = await getSecurityStore(expiredReq);
    expect(expiredRes.status).toBe(410);
    const expiredData = await expiredRes.json();
    expect(expiredData.code).toBe('TOKEN_EXPIRED');
  });

  it('3. Real-time duplicate availability check respects excludeStoreId', async () => {
    const { POST: checkAvailability } = await import('@/app/api/auth/check-availability/route');

    // 3.1 Store A checking its OWN phone with excludeStoreId -> available: true
    const reqOwnPhone = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: 'phone',
        value: '0812340001',
        excludeStoreId: storeA.id,
      }),
    });
    const resOwnPhone = await checkAvailability(reqOwnPhone);
    const dataOwnPhone = await resOwnPhone.json();
    expect(dataOwnPhone.available).toBe(true);

    // 3.2 Store A checking Store B's phone with excludeStoreId -> available: false (conflict!)
    const reqDupPhone = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: 'phone',
        value: '0898760002',
        excludeStoreId: storeA.id,
      }),
    });
    const resDupPhone = await checkAvailability(reqDupPhone);
    const dataDupPhone = await resDupPhone.json();
    expect(dataDupPhone.available).toBe(false);

    // 3.3 Store A checking Store B's PromptPay -> available: false (conflict!)
    const reqDupPromptPay = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: 'promptPayId',
        value: '0898760002',
        excludeStoreId: storeA.id,
      }),
    });
    const resDupPromptPay = await checkAvailability(reqDupPromptPay);
    const dataDupPromptPay = await resDupPromptPay.json();
    expect(dataDupPromptPay.available).toBe(false);

    // 3.4 Store A checking Store B's Bank Account -> available: false (conflict!)
    const reqDupBank = new Request('http://localhost:3000/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: 'bankAccountNo',
        value: '9876543210',
        bankName: 'SCB',
        excludeStoreId: storeA.id,
      }),
    });
    const resDupBank = await checkAvailability(reqDupBank);
    const dataDupBank = await resDupBank.json();
    expect(dataDupBank.available).toBe(false);
  });

  it('4. POST /api/store/security-edit enforces OTP on phone change and blocks duplicate conflicts', async () => {
    const { POST: postSecurityEdit } = await import('@/app/api/store/security-edit/route');

    // 4.1 Attempting to change to Store B's PromptPay -> 409 Conflict
    const reqConflictPromptPay = new Request('http://localhost:3000/api/store/security-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: securityToken,
        promptPayId: '0898760002', // Store B's promptpay
      }),
    });
    const resConflictPromptPay = await postSecurityEdit(reqConflictPromptPay);
    expect(resConflictPromptPay.status).toBe(409);
    const dataConflictPromptPay = await resConflictPromptPay.json();
    expect(dataConflictPromptPay.error).toContain('มีในระบบแล้ว');

    // 4.2 Attempting to change phone without OTP -> 400 Bad Request
    const reqChangePhoneNoOtp = new Request('http://localhost:3000/api/store/security-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: securityToken,
        phone: '0865551234',
        name: 'เจ้าของร้าน A ใหม่',
      }),
    });
    const resChangePhoneNoOtp = await postSecurityEdit(reqChangePhoneNoOtp);
    expect(resChangePhoneNoOtp.status).toBe(400);
    const dataNoOtp = await resChangePhoneNoOtp.json();
    expect(dataNoOtp.error).toContain('ยืนยันรหัส OTP');

    // 4.3 Generate OTP for new phone 0865551234 and submit valid update
    const otpResult = await sendSmsOtp('0865551234');
    expect(otpResult.success).toBe(true);
    expect(otpResult.devOtp).toBeTruthy();

    const newEmail = `new-owner-${timestamp}@example.com`;
    const reqValidUpdate = new Request('http://localhost:3000/api/store/security-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: securityToken,
        name: 'เจ้าของร้าน A คนใหม่',
        phone: '0865551234',
        email: newEmail,
        bankName: 'BBL',
        bankAccountNo: '5554443322',
        bankAccountName: 'เจ้าของร้าน A คนใหม่',
        promptPayId: '0865551234',
        promptPayName: 'ร้านตามสั่ง A (อัปเดต)',
        otp: otpResult.devOtp,
        refCode: otpResult.refCode,
      }),
    });

    const resValidUpdate = await postSecurityEdit(reqValidUpdate);
    expect(resValidUpdate.status).toBe(200);
    const dataValid = await resValidUpdate.json();
    expect(dataValid.success).toBe(true);

    // Verify DB Store was updated
    const updatedStore = await prisma.store.findUnique({ where: { id: storeA.id } });
    expect(updatedStore?.phone).toBe('0865551234');
    expect(updatedStore?.promptPayId).toBe('0865551234');
    expect(updatedStore?.bankAccountNo).toBe('5554443322');
    expect(updatedStore?.bankName).toBe('BBL');

    // Verify Token was marked as used
    const usedTokenRecord = await prisma.passwordResetToken.findUnique({ where: { token: securityToken } });
    expect(usedTokenRecord?.usedAt).toBeTruthy();

    // 4.4 Trying to use the token AGAIN should fail with 410 (Already Used)
    const reqReuseToken = new Request('http://localhost:3000/api/store/security-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: securityToken,
        phone: '0865551234',
      }),
    });
    const resReuse = await postSecurityEdit(reqReuseToken);
    expect(resReuse.status).toBe(410);
    const dataReuse = await resReuse.json();
    expect(dataReuse.error).toContain('ถูกใช้งานไปแล้ว');
  });
});
