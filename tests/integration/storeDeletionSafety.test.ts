import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createSessionToken, hashPassword, COOKIE_NAME } from '@/lib/auth';
import { PATCH, DELETE } from '@/app/api/platform-admin/stores/[id]/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as getPublicSettings } from '@/app/api/r/[slug]/settings/public/route';

describe('Store Deletion Safety & 30-Day Cancellation Flow', () => {
  const adminEmail = 'test-super-admin@ordeopos.com';
  const adminPassword = 'SuperSecretMasterPassword123#';
  let adminId: string;
  let adminToken: string;

  const testStoreSlug = 'safety-test-store';
  const testStoreName = 'ร้านอาหารทดสอบระบบความปลอดภัย';
  let testStoreId: string;

  const ownerPhone = '0898887766';
  const ownerPassword = 'ownerpassword123';
  let ownerId: string;

  beforeAll(async () => {
    // 1. Create a test Super Admin
    const adminHash = await hashPassword(adminPassword);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminHash,
        name: 'Test Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    adminId = admin.id;
    adminToken = await createSessionToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'SUPER_ADMIN',
    });

    // 2. Create a test Store with owner
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    const store = await prisma.store.create({
      data: {
        slug: testStoreSlug,
        name: testStoreName,
        status: 'ACTIVE',
        trialEndsAt: trialEnd,
        subscriptionEnd: trialEnd,
      },
    });
    testStoreId = store.id;

    const ownerHash = await hashPassword(ownerPassword);
    const owner = await prisma.user.create({
      data: {
        email: 'safety-owner@test.com',
        phone: ownerPhone,
        passwordHash: ownerHash,
        name: 'เจ้าของร้านทดสอบ',
        role: 'STORE_OWNER',
        storeId: store.id,
      },
    });
    ownerId = owner.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, ownerId] } },
    });
    await prisma.store.deleteMany({
      where: { id: testStoreId },
    });
  });

  it('Step 1: Rejects deletion if Super Admin password is missing or incorrect', async () => {
    const req = new Request(`http://localhost/api/platform-admin/stores/${testStoreId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        storeName: testStoreName,
        adminPassword: 'WrongPassword123',
      }),
    });

    const res = await DELETE(req, { params: { id: testStoreId } });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('รหัสผ่านผู้ดูแลระบบสูงสุดไม่ถูกต้อง');
  });

  it('Step 2: Rejects deletion if store name does not match exactly', async () => {
    const req = new Request(`http://localhost/api/platform-admin/stores/${testStoreId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        storeName: 'ชื่อร้านที่พิมพ์ผิด',
        adminPassword,
      }),
    });

    const res = await DELETE(req, { params: { id: testStoreId } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('ชื่อร้านที่กรอกไม่ตรงกับชื่อร้านในระบบ');
  });

  it('Step 3: Successfully schedules 30-day soft deletion when credentials and store name match', async () => {
    const req = new Request(`http://localhost/api/platform-admin/stores/${testStoreId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        storeName: testStoreName,
        adminPassword,
      }),
    });

    const res = await DELETE(req, { params: { id: testStoreId } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('30 วัน');

    // Verify in database
    const dbStore = await prisma.store.findUnique({ where: { id: testStoreId } });
    expect(dbStore?.status).toBe('PENDING_DELETE');
    expect(dbStore?.scheduledDeleteAt).not.toBeNull();
    expect(dbStore?.deletedAt).not.toBeNull();

    // Verify ~30 days in future
    const now = Date.now();
    const scheduledTime = new Date(dbStore!.scheduledDeleteAt!).getTime();
    const daysDiff = (scheduledTime - now) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThan(29);
    expect(daysDiff).toBeLessThanOrEqual(30.1);
  });

  it('Step 4: Store in PENDING_DELETE blocks store owner login with 30-day grace period notice', async () => {
    const loginReq = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: ownerPhone,
        password: ownerPassword,
      }),
    });

    const loginRes = await login(loginReq);
    const loginData = await loginRes.json();

    expect(loginRes.status).toBe(403);
    expect(loginData.error).toContain('30 วัน');
  });

  it('Step 5: Store in PENDING_DELETE blocks public ordering access', async () => {
    const publicReq = new Request(`http://localhost/api/r/${testStoreSlug}/settings/public`, {
      method: 'GET',
    });

    const publicRes = await getPublicSettings(publicReq, { params: { slug: testStoreSlug } });
    const publicData = await publicRes.json();

    expect(publicRes.status).toBe(403);
    expect(publicData.error).toContain('รอการลบ');
  });

  it('Step 6: Super Admin can cancel deletion and restore store to ACTIVE status within 30 days', async () => {
    const restoreReq = new Request(`http://localhost/api/platform-admin/stores/${testStoreId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        action: 'CANCEL_DELETE',
      }),
    });

    const restoreRes = await PATCH(restoreReq, { params: { id: testStoreId } });
    const restoreData = await restoreRes.json();

    expect(restoreRes.status).toBe(200);
    expect(restoreData.success).toBe(true);
    expect(restoreData.message).toContain('ยกเลิกการลบ');

    // Verify in database that store is active and deletion timestamps are cleared
    const restoredStore = await prisma.store.findUnique({ where: { id: testStoreId } });
    expect(restoredStore?.status).toBe('ACTIVE');
    expect(restoredStore?.scheduledDeleteAt).toBeNull();
    expect(restoredStore?.deletedAt).toBeNull();
  });

  it('Step 7: Restored store owner can log in normally again', async () => {
    const loginReq = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: ownerPhone,
        password: ownerPassword,
      }),
    });

    const loginRes = await login(loginReq);
    const loginData = await loginRes.json();

    expect(loginRes.status).toBe(200);
    expect(loginData.success).toBe(true);
    expect(loginData.user.storeSlug).toBe(testStoreSlug);
  });
});
