import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createSessionToken, COOKIE_NAME } from '@/lib/auth';

describe('PromptPay Auto-Population, Store Security Lock, and Admin Edit Flow', () => {
  const storeASlug = `test-sec-store-a-${Date.now()}`;
  const storeBSlug = `test-sec-store-b-${Date.now()}`;
  let storeA: any;
  let storeB: any;
  let userA: any;
  let superAdminUser: any;
  let ownerAToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    // 1. Create Store A (owned by User A)
    storeA = await prisma.store.create({
      data: {
        slug: storeASlug,
        name: 'ร้านความปลอดภัย A',
        phone: '0811112222',
        promptPayId: '0811112222',
        promptPayName: 'ร้านความปลอดภัย A',
        bankName: 'KBANK',
        bankAccountNo: '1111222233',
        bankAccountName: 'เจ้าของร้าน A',
        status: 'ACTIVE',
        trialEndsAt: new Date(Date.now() + 86400000),
        subscriptionEnd: new Date(Date.now() + 86400000),
      },
    });

    userA = await prisma.user.create({
      data: {
        name: 'เจ้าของร้าน A',
        email: `ownera-${Date.now()}@example.com`,
        phone: '0811112222',
        passwordHash: 'dummyhash',
        role: 'STORE_OWNER',
        storeId: storeA.id,
      },
    });

    // 2. Create Store B (to test duplicate conflicts)
    storeB = await prisma.store.create({
      data: {
        slug: storeBSlug,
        name: 'ร้านเปรียบเทียบ B',
        phone: '0899990000',
        promptPayId: '0899990000',
        promptPayName: 'ร้านเปรียบเทียบ B',
        bankName: 'SCB',
        bankAccountNo: '9999000011',
        bankAccountName: 'เจ้าของร้าน B',
        status: 'ACTIVE',
        trialEndsAt: new Date(Date.now() + 86400000),
        subscriptionEnd: new Date(Date.now() + 86400000),
      },
    });

    // 3. Create Super Admin user
    superAdminUser = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: `superadmin-${Date.now()}@ordeopos.com`,
        phone: '0800000000',
        passwordHash: 'adminhash',
        role: 'SUPER_ADMIN',
      },
    });

    // Create session tokens
    ownerAToken = await createSessionToken({
      id: userA.id,
      email: userA.email,
      phone: userA.phone,
      name: userA.name,
      role: 'STORE_OWNER',
      storeId: storeA.id,
      storeSlug: storeA.slug,
      storeName: storeA.name,
      storeStatus: storeA.status,
      subscriptionEnd: storeA.subscriptionEnd.toISOString(),
    });

    superAdminToken = await createSessionToken({
      id: superAdminUser.id,
      email: superAdminUser.email,
      phone: superAdminUser.phone,
      name: superAdminUser.name,
      role: 'SUPER_ADMIN',
    });
  });

  afterAll(async () => {
    if (storeA?.id) await prisma.store.delete({ where: { id: storeA.id } }).catch(() => {});
    if (storeB?.id) await prisma.store.delete({ where: { id: storeB.id } }).catch(() => {});
    if (superAdminUser?.id) await prisma.user.delete({ where: { id: superAdminUser.id } }).catch(() => {});
  });

  it('1. GET /api/r/[slug]/settings returns store bank and promptpay details', async () => {
    const { GET: getSettings } = await import('@/app/api/r/[slug]/settings/route');
    const req = new Request(`http://localhost:3000/api/r/${storeASlug}/settings`, {
      method: 'GET',
      headers: { Cookie: `${COOKIE_NAME}=${ownerAToken}` },
    });

    const res = await getSettings(req, { params: { slug: storeASlug } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.promptPayId).toBe('0811112222');
    expect(data.bankName).toBe('KBANK');
    expect(data.bankAccountNo).toBe('1111222233');
    expect(data.bankAccountName).toBe('เจ้าของร้าน A');
    expect(data.phone).toBe('0811112222');
  });

  it('2. PUT /api/r/[slug]/settings BLOCKS store owner from modifying locked promptPayId', async () => {
    const { PUT: putSettings } = await import('@/app/api/r/[slug]/settings/route');
    const req = new Request(`http://localhost:3000/api/r/${storeASlug}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${ownerAToken}`,
      },
      body: JSON.stringify({
        promptPayId: '0899999999', // attempted modification
      }),
    });

    const res = await putSettings(req, { params: { slug: storeASlug } });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe('SECURITY_FIELDS_LOCKED');
    expect(data.error).toContain('ถูกล็อกห้ามแก้ไขด้วยตนเอง');
  });

  it('3. PUT /api/r/[slug]/settings BLOCKS store owner from modifying locked phone, bank account, or email', async () => {
    const { PUT: putSettings } = await import('@/app/api/r/[slug]/settings/route');
    
    // Attempt Phone modification
    const reqPhone = new Request(`http://localhost:3000/api/r/${storeASlug}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE_NAME}=${ownerAToken}` },
      body: JSON.stringify({ phone: '0877778888' }),
    });
    const resPhone = await putSettings(reqPhone, { params: { slug: storeASlug } });
    expect(resPhone.status).toBe(403);

    // Attempt Bank Account modification
    const reqBank = new Request(`http://localhost:3000/api/r/${storeASlug}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE_NAME}=${ownerAToken}` },
      body: JSON.stringify({ bankAccountNo: '9988776655' }),
    });
    const resBank = await putSettings(reqBank, { params: { slug: storeASlug } });
    expect(resBank.status).toBe(403);

    // Attempt Email modification
    const reqEmail = new Request(`http://localhost:3000/api/r/${storeASlug}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE_NAME}=${ownerAToken}` },
      body: JSON.stringify({ ownerEmail: 'hacker@example.com' }),
    });
    const resEmail = await putSettings(reqEmail, { params: { slug: storeASlug } });
    expect(resEmail.status).toBe(403);
  });

  it('4. PUT /api/r/[slug]/settings ALLOWS store owner to update non-locked fields', async () => {
    const { PUT: putSettings } = await import('@/app/api/r/[slug]/settings/route');
    const req = new Request(`http://localhost:3000/api/r/${storeASlug}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${ownerAToken}`,
      },
      body: JSON.stringify({
        storeName: 'ร้านความปลอดภัย A (อัปเดต)',
        address: '123/45 ถนนเจริญนคร กทม.',
        receiptFooter: 'ขอบคุณที่ใช้บริการครับ',
        tableCount: 12,
        promptPayId: '0811112222', // sending unchanged locked value is allowed
        phone: '0811112222',       // sending unchanged locked value is allowed
      }),
    });

    const res = await putSettings(req, { params: { slug: storeASlug } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.storeName).toBe('ร้านความปลอดภัย A (อัปเดต)');
    expect(data.address).toBe('123/45 ถนนเจริญนคร กทม.');
    expect(data.receiptFooter).toBe('ขอบคุณที่ใช้บริการครับ');
    expect(data.tableCount).toBe(12);
  });

  it('5. PATCH /api/platform-admin/stores/[id] BLOCKS Super Admin from assigning duplicate phone or promptpay of another store', async () => {
    const { PATCH: patchStore } = await import('@/app/api/platform-admin/stores/[id]/route');

    // Attempting to set Store A's phone to Store B's phone ('0899990000')
    const reqDupPhone = new Request(`http://localhost:3000/api/platform-admin/stores/${storeA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${superAdminToken}`,
      },
      body: JSON.stringify({
        phone: '0899990000',
      }),
    });

    const resDupPhone = await patchStore(reqDupPhone, { params: { id: storeA.id } });
    expect(resDupPhone.status).toBe(409);
    const dataPhone = await resDupPhone.json();
    expect(dataPhone.error).toContain('ถูกใช้งานโดยร้านอื่นแล้ว');

    // Attempting to set Store A's promptpay to Store B's promptpay ('0899990000')
    const reqDupPromptPay = new Request(`http://localhost:3000/api/platform-admin/stores/${storeA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${superAdminToken}`,
      },
      body: JSON.stringify({
        promptPayId: '0899990000',
      }),
    });

    const resDupPromptPay = await patchStore(reqDupPromptPay, { params: { id: storeA.id } });
    expect(resDupPromptPay.status).toBe(409);
    const dataPromptPay = await resDupPromptPay.json();
    expect(dataPromptPay.error).toContain('ถูกใช้งานโดยร้านอื่นแล้ว');
  });

  it('6. PATCH /api/platform-admin/stores/[id] ALLOWS Super Admin to successfully update store security details', async () => {
    const { PATCH: patchStore } = await import('@/app/api/platform-admin/stores/[id]/route');

    const updatedPhone = '0834445566';
    const updatedPromptPay = '0834445566';
    const updatedBankAcc = '8887776655';
    const updatedEmail = `admin-updated-${Date.now()}@example.com`;

    const reqValid = new Request(`http://localhost:3000/api/platform-admin/stores/${storeA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${superAdminToken}`,
      },
      body: JSON.stringify({
        phone: updatedPhone,
        promptPayId: updatedPromptPay,
        promptPayName: 'ร้านความปลอดภัย A (แอดมินแก้ไขให้)',
        bankName: 'KTB',
        bankAccountNo: updatedBankAcc,
        bankAccountName: 'เจ้าของร้าน A คนเดิม',
        ownerEmail: updatedEmail,
      }),
    });

    const resValid = await patchStore(reqValid, { params: { id: storeA.id } });
    expect(resValid.status).toBe(200);
    const data = await resValid.json();
    expect(data.success).toBe(true);
    expect(data.store.phone).toBe(updatedPhone);
    expect(data.store.promptPayId).toBe(updatedPromptPay);
    expect(data.store.bankName).toBe('KTB');
    expect(data.store.bankAccountNo).toBe(updatedBankAcc);

    // Verify owner user record was synchronized
    const updatedUser = await prisma.user.findFirst({ where: { storeId: storeA.id, role: 'STORE_OWNER' } });
    expect(updatedUser?.phone).toBe(updatedPhone);
    expect(updatedUser?.email).toBe(updatedEmail);
  });
});
