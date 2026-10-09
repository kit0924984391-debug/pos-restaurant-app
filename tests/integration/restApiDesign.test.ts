import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createSessionToken, hashPassword, COOKIE_NAME } from '@/lib/auth';
import { GET as getOrders, POST as createOrder } from '@/app/api/r/[slug]/orders/route';
import { GET as getMenuItem, PATCH as patchMenuItem } from '@/app/api/r/[slug]/menu/[id]/route';
import { POST as createPlan, GET as getPlans } from '@/app/api/platform-admin/plans/route';
import { GET as getPlanById, PATCH as patchPlanById, DELETE as deletePlanById } from '@/app/api/platform-admin/plans/[id]/route';
import { GET as getSubscriptions } from '@/app/api/platform-admin/subscriptions/route';
import { GET as getSubById } from '@/app/api/platform-admin/subscriptions/[id]/route';
import { GET as getMembers } from '@/app/api/r/[slug]/members/route';

describe('REST API Design & Zero-Breaking-Change Verification', () => {
  const adminEmail = 'rest-api-admin@ordeopos.com';
  let adminId: string;
  let adminToken: string;

  const testStoreSlug = 'rest-api-test-store';
  let testStoreId: string;
  let testCategoryId: string;
  let testMenuItemId: string;
  let createdPlanId: string;

  beforeAll(async () => {
    // 0. Pre-clean
    await prisma.user.deleteMany({
      where: { email: adminEmail },
    });
    await prisma.store.deleteMany({
      where: { slug: testStoreSlug },
    });

    // 1. Create Super Admin
    const adminHash = await hashPassword('AdminPass123!');
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminHash,
        name: 'REST Super Admin',
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

    // 2. Create Store
    const trialEnd = new Date(Date.now() + 30 * 86400000);
    const store = await prisma.store.create({
      data: {
        slug: testStoreSlug,
        name: 'ร้านทดสอบ REST API',
        status: 'ACTIVE',
        trialEndsAt: trialEnd,
        subscriptionEnd: trialEnd,
      },
    });
    testStoreId = store.id;

    // 3. Create Category & Menu Item
    const cat = await prisma.category.create({
      data: {
        storeId: store.id,
        name: 'อาหารจานเดียว',
        sortOrder: 1,
      },
    });
    testCategoryId = cat.id;

    const item = await prisma.menuItem.create({
      data: {
        storeId: store.id,
        categoryId: cat.id,
        name: 'ข้าวกะเพราไก่ไข่ดาว',
        basePrice: 65,
        isAvailable: true,
      },
    });
    testMenuItemId = item.id;
  });

  afterAll(async () => {
    if (createdPlanId) {
      await prisma.plan.deleteMany({ where: { id: createdPlanId } });
    }
    if (adminId) {
      await prisma.user.deleteMany({ where: { id: adminId } });
    }
    if (testStoreId) {
      await prisma.store.deleteMany({ where: { id: testStoreId } });
    }
  });

  it('1. POST /api/r/[slug]/orders returns status 201 Created', async () => {
    const req = new Request(`http://localhost/api/r/${testStoreSlug}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: 1,
        items: [
          {
            menuItemId: testMenuItemId,
            name: 'ข้าวกะเพราไก่ไข่ดาว',
            basePrice: 65,
            price: 65,
            quantity: 2,
          },
        ],
      }),
    });

    const res = await createOrder(req, { params: { slug: testStoreSlug } });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.items.length).toBe(1);
  });

  it('2. GET /api/r/[slug]/orders returns array without page, and paginated object with page', async () => {
    // A) Backward compatible without ?page
    const unpaginatedReq = new Request(`http://localhost/api/r/${testStoreSlug}/orders`, {
      method: 'GET',
    });
    const unpaginatedRes = await getOrders(unpaginatedReq, { params: { slug: testStoreSlug } });
    const unpaginatedData = await unpaginatedRes.json();

    expect(Array.isArray(unpaginatedData)).toBe(true);
    expect(unpaginatedData.length).toBeGreaterThan(0);

    // B) Standard REST with ?page=1&limit=5
    const paginatedReq = new Request(`http://localhost/api/r/${testStoreSlug}/orders?page=1&limit=5`, {
      method: 'GET',
    });
    const paginatedRes = await getOrders(paginatedReq, { params: { slug: testStoreSlug } });
    const paginatedData = await paginatedRes.json();

    expect(paginatedData.orders).toBeDefined();
    expect(Array.isArray(paginatedData.orders)).toBe(true);
    expect(paginatedData.pagination).toBeDefined();
    expect(paginatedData.pagination.page).toBe(1);
    expect(paginatedData.pagination.limit).toBe(5);
    expect(paginatedData.pagination.total).toBeGreaterThan(0);
  });

  it('3. GET & PATCH /api/r/[slug]/menu/[id] provides single-item REST access', async () => {
    // GET single menu item
    const getReq = new Request(`http://localhost/api/r/${testStoreSlug}/menu/${testMenuItemId}`, {
      method: 'GET',
    });
    const getRes = await getMenuItem(getReq, { params: { slug: testStoreSlug, id: testMenuItemId } });
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.name).toBe('ข้าวกะเพราไก่ไข่ดาว');

    // PATCH update menu item
    const patchReq = new Request(`http://localhost/api/r/${testStoreSlug}/menu/${testMenuItemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        basePrice: 70,
      }),
    });
    const patchRes = await patchMenuItem(patchReq, { params: { slug: testStoreSlug, id: testMenuItemId } });
    const patchData = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchData.basePrice).toBe(70);
  });

  it('4. POST & GET /api/platform-admin/plans creates plan with 201 and supports plans/[id]', async () => {
    // POST plan -> status 201
    const postReq = new Request('http://localhost/api/platform-admin/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        name: 'REST ทดสอบแพ็กเกจ Pro',
        price: 499,
        durationDays: 30,
        maxTables: 30,
      }),
    });
    const postRes = await createPlan(postReq);
    const postData = await postRes.json();

    expect(postRes.status).toBe(201);
    expect(postData.plan.id).toBeDefined();
    createdPlanId = postData.plan.id;

    // GET /api/platform-admin/plans/[id]
    const getReq = new Request(`http://localhost/api/platform-admin/plans/${createdPlanId}`, {
      headers: { Cookie: `${COOKIE_NAME}=${adminToken}` },
    });
    const getRes = await getPlanById(getReq, { params: { id: createdPlanId } });
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.plan.name).toBe('REST ทดสอบแพ็กเกจ Pro');

    // PATCH /api/platform-admin/plans/[id]
    const patchReq = new Request(`http://localhost/api/platform-admin/plans/${createdPlanId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        price: 599,
      }),
    });
    const patchRes = await patchPlanById(patchReq, { params: { id: createdPlanId } });
    const patchData = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchData.plan.price).toBe(599);

    // DELETE /api/platform-admin/plans/[id]
    const deleteReq = new Request(`http://localhost/api/platform-admin/plans/${createdPlanId}`, {
      method: 'DELETE',
      headers: { Cookie: `${COOKIE_NAME}=${adminToken}` },
    });
    const deleteRes = await deletePlanById(deleteReq, { params: { id: createdPlanId } });
    const deleteData = await deleteRes.json();

    expect(deleteRes.status).toBe(200);
    expect(deleteData.success).toBe(true);
    createdPlanId = ''; // cleaned up
  });

  it('5. GET /api/platform-admin/subscriptions supports optional pagination', async () => {
    const paginatedReq = new Request('http://localhost/api/platform-admin/subscriptions?page=1&limit=5', {
      headers: { Cookie: `${COOKIE_NAME}=${adminToken}` },
    });
    const res = await getSubscriptions(paginatedReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.subscriptions).toBeDefined();
    expect(data.pagination).toBeDefined();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(5);
  });

  it('6. GET /api/r/[slug]/members supports optional pagination', async () => {
    const paginatedReq = new Request(`http://localhost/api/r/${testStoreSlug}/members?page=1&limit=5`, {
      headers: { Cookie: `${COOKIE_NAME}=${adminToken}` },
    });
    const res = await getMembers(paginatedReq, { params: { slug: testStoreSlug } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.members).toBeDefined();
    expect(data.pagination).toBeDefined();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(5);
  });
});
