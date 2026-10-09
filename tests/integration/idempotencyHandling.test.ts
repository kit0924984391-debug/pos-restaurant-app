import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createSessionToken, hashPassword, COOKIE_NAME } from '@/lib/auth';
import { processDeliveryWebhook } from '@/lib/deliveryEngine';
import { POST as createOrder } from '@/app/api/r/[slug]/orders/route';
import { POST as approveSubscription } from '@/app/api/platform-admin/subscriptions/route';
import { POST as payOrder } from '@/app/api/r/[slug]/orders/[id]/pay/route';
import { POST as serviceCall } from '@/app/api/r/[slug]/service-call/route';
import { POST as createMenuOrCategory } from '@/app/api/r/[slug]/menu/route';

describe('Idempotency Handling & Duplicate Prevention Verification', () => {
  const adminEmail = 'idempotency-admin@ordeopos.com';
  let adminId: string;
  let adminToken: string;

  const testStoreSlug = 'idempotency-test-store';
  let testStoreId: string;
  let testIngredientId: string;
  let testMenuItemId: string;
  let testPlanId: string;
  let testSubId: string;

  beforeAll(async () => {
    // 0. Ensure IdempotencyKey table exists in local test database
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "storeId" TEXT NOT NULL,
        "payloadHash" TEXT NOT NULL,
        "status" INTEGER NOT NULL,
        "body" TEXT NOT NULL,
        "createdAt" INTEGER NOT NULL
      )
    `.catch(() => {});

    // 0. Pre-clean
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.store.deleteMany({ where: { slug: testStoreSlug } });

    // 1. Create Admin
    const adminHash = await hashPassword('AdminPass123!');
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminHash,
        name: 'Idempotency Super Admin',
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
        name: 'ร้านทดสอบระบบ Idempotency',
        status: 'ACTIVE',
        trialEndsAt: trialEnd,
        subscriptionEnd: trialEnd,
      },
    });
    testStoreId = store.id;

    // 3. Create Ingredient with initial stock = 100
    const ingredient = await prisma.ingredient.create({
      data: {
        storeId: store.id,
        name: 'หมูสับ',
        unit: 'กรัม',
        costPerUnit: 0.15,
        currentStock: 100,
      },
    });
    testIngredientId = ingredient.id;

    // 4. Create Category, Menu Item & BOM recipe (1 dish = 50g)
    const cat = await prisma.category.create({
      data: {
        storeId: store.id,
        name: 'อาหารจานเดียว',
      },
    });

    const item = await prisma.menuItem.create({
      data: {
        storeId: store.id,
        categoryId: cat.id,
        name: 'กะเพราหมูสับ',
        basePrice: 60,
        isAvailable: true,
      },
    });
    testMenuItemId = item.id;

    await prisma.menuItemRecipe.create({
      data: {
        menuItemId: item.id,
        ingredientId: ingredient.id,
        quantity: 50,
      },
    });

    // 5. Create Plan & Pending Subscription
    const plan = await prisma.plan.create({
      data: {
        name: 'Idempotency Pro 30D',
        price: 500,
        durationDays: 30,
      },
    });
    testPlanId = plan.id;

    const sub = await prisma.subscriptionHistory.create({
      data: {
        storeId: store.id,
        planId: plan.id,
        amount: 500,
        status: 'PENDING',
      },
    });
    testSubId = sub.id;
  });

  afterAll(async () => {
    if (testStoreId) {
      await prisma.subscriptionHistory.deleteMany({ where: { storeId: testStoreId } });
      await prisma.orderItem.deleteMany({ where: { order: { storeId: testStoreId } } });
      await prisma.order.deleteMany({ where: { storeId: testStoreId } });
      await prisma.menuItemRecipe.deleteMany({ where: { menuItem: { storeId: testStoreId } } });
      await prisma.menuItem.deleteMany({ where: { storeId: testStoreId } });
      await prisma.category.deleteMany({ where: { storeId: testStoreId } });
      await prisma.stockLog.deleteMany({ where: { storeId: testStoreId } });
      await prisma.ingredient.deleteMany({ where: { storeId: testStoreId } });
      await prisma.store.deleteMany({ where: { id: testStoreId } });
    }
    if (testPlanId) {
      await prisma.plan.deleteMany({ where: { id: testPlanId } });
    }
    if (adminId) {
      await prisma.user.deleteMany({ where: { id: adminId } });
    }
    if (testStoreId) {
      await prisma.$executeRaw`DELETE FROM "IdempotencyKey" WHERE "storeId" = ${testStoreId}`.catch(() => {});
    }
  });

  it('1. Delivery Webhook: Replays identical response and DOES NOT deduct stock twice on duplicate retry', async () => {
    const deliveryPayload = {
      orderId: 'LM-TEST-DUPLICATE-99',
      channel: 'LINEMAN',
      items: [
        {
          name: 'กะเพราหมูสับ',
          price: 60,
          quantity: 1,
        },
      ],
    };

    // First Webhook delivery
    const res1 = await processDeliveryWebhook(testStoreSlug, deliveryPayload);
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.isDuplicateWebhook).toBeUndefined();

    // Check stock was deducted: 100 - 50 = 50
    const ingAfterFirst = await prisma.ingredient.findUnique({ where: { id: testIngredientId } });
    expect(ingAfterFirst?.currentStock).toBe(50);

    // Second Webhook delivery (aggregator retry with same orderId)
    const res2 = await processDeliveryWebhook(testStoreSlug, deliveryPayload);
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.isDuplicateWebhook).toBe(true);
    expect(res2.body.orderId).toBe(res1.body.orderId);

    // Check stock was NOT deducted again (still 50)
    const ingAfterSecond = await prisma.ingredient.findUnique({ where: { id: testIngredientId } });
    expect(ingAfterSecond?.currentStock).toBe(50);

    // Check only 1 order exists for this deliveryOrderId
    const ordersCount = await prisma.order.count({
      where: { storeId: testStoreId, deliveryOrderId: 'LM-TEST-DUPLICATE-99' },
    });
    expect(ordersCount).toBe(1);
  });

  it('2. Order Creation: Supports Idempotency-Key header, replays response, and rejects changed body', async () => {
    const idemKey = 'test-client-order-key-abc';
    const orderBody = {
      tableId: 1,
      items: [
        {
          menuItemId: testMenuItemId,
          name: 'กะเพราหมูสับ',
          basePrice: 60,
          price: 60,
          quantity: 1,
        },
      ],
    };

    // First Submission
    const req1 = new Request(`http://localhost/api/r/${testStoreSlug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify(orderBody),
    });
    const res1 = await createOrder(req1, { params: { slug: testStoreSlug } });
    const data1 = await res1.json();

    expect(res1.status).toBe(201);
    expect(data1.id).toBeDefined();

    // Second Submission with same key & same body -> Replay cached 201 response
    const req2 = new Request(`http://localhost/api/r/${testStoreSlug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify(orderBody),
    });
    const res2 = await createOrder(req2, { params: { slug: testStoreSlug } });
    const data2 = await res2.json();

    expect(res2.status).toBe(201);
    expect(data2.id).toBe(data1.id);

    // Third Submission with SAME key but DIFFERENT body -> 409 idempotency_key_reused
    const req3 = new Request(`http://localhost/api/r/${testStoreSlug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({ ...orderBody, note: 'เผ็ดน้อย' }),
    });
    const res3 = await createOrder(req3, { params: { slug: testStoreSlug } });
    const data3 = await res3.json();

    expect(res3.status).toBe(409);
    expect(data3.code).toBe('idempotency_key_reused');
  });

  it('3. Subscription Approval: Atomic guard prevents double approval / double extension', async () => {
    // 1st Approval
    const req1 = new Request('http://localhost/api/platform-admin/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        id: testSubId,
        action: 'APPROVE',
      }),
    });
    const res1 = await approveSubscription(req1);
    const data1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(data1.success).toBe(true);

    // 2nd Approval attempt on the already-approved subscription -> Rejection with 400
    const req2 = new Request('http://localhost/api/platform-admin/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        id: testSubId,
        action: 'APPROVE',
      }),
    });
    const res2 = await approveSubscription(req2);
    const data2 = await res2.json();

    expect(res2.status).toBe(400);
    expect(data2.error).toContain('รายการนี้ถูกดำเนินการไปแล้ว');
  });

  it('4. Order Payment: Supports Idempotency-Key header, replays response, and safely re-enters already-paid orders', async () => {
    // Create an order to pay
    const order = await prisma.order.create({
      data: {
        storeId: testStoreId,
        totalAmount: 120,
        netAmount: 120,
        paymentStatus: 'UNPAID',
        status: 'PENDING',
        orderType: 'DINE_IN',
        tableNo: 2,
      },
    });

    const paymentKey = 'pay-idem-key-999';
    const payBody = {
      paymentMethod: 'CASH',
      cashReceived: 200,
      changeAmount: 80,
    };

    // 1st Pay request
    const req1 = new Request(`http://localhost/api/r/${testStoreSlug}/orders/${order.id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': paymentKey,
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify(payBody),
    });
    const res1 = await payOrder(req1, { params: { slug: testStoreSlug, id: order.id } });
    const data1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(data1.id).toBe(order.id);
    expect(data1.paymentStatus).toBe('PAID');

    // 2nd Pay request with SAME Idempotency-Key -> Idempotent Replay 200 OK
    const req2 = new Request(`http://localhost/api/r/${testStoreSlug}/orders/${order.id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': paymentKey,
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify(payBody),
    });
    const res2 = await payOrder(req2, { params: { slug: testStoreSlug, id: order.id } });
    const data2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(data2.id).toBe(order.id);
    expect(data2.paymentStatus).toBe('PAID');
    expect(res2.headers.get('X-Idempotent-Replay')).toBe('true');

    // 3rd Pay request with different key but order is ALREADY PAID -> Returns 200 OK with paid order (not 400 error)
    const req3 = new Request(`http://localhost/api/r/${testStoreSlug}/orders/${order.id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'another-key-888',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify(payBody),
    });
    const res3 = await payOrder(req3, { params: { slug: testStoreSlug, id: order.id } });
    const data3 = await res3.json();

    expect(res3.status).toBe(200);
    expect(data3.id).toBe(order.id);
    expect(data3.paymentStatus).toBe('PAID');
  });

  it('5. Table Service Call: Debounces rapid duplicate calls without flooding notifications', async () => {
    // 1st Service Call
    const req1 = new Request(`http://localhost/api/r/${testStoreSlug}/service-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableNo: 5,
        requestType: 'เรียกพนักงาน',
      }),
    });
    const res1 = await serviceCall(req1, { params: { slug: testStoreSlug } });
    const data1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(data1.success).toBe(true);
    expect(data1.isDuplicate).toBeUndefined();

    // 2nd Immediate Service Call (rapid double tap) -> Idempotently debounced
    const req2 = new Request(`http://localhost/api/r/${testStoreSlug}/service-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableNo: 5,
        requestType: 'เรียกพนักงาน',
      }),
    });
    const res2 = await serviceCall(req2, { params: { slug: testStoreSlug } });
    const data2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(data2.success).toBe(true);
    expect(data2.isDuplicate).toBe(true);
  });

  it('6. Category Creation: Returns existing category if duplicate name submitted', async () => {
    const categoryName = 'ต้ม/แกง (หมวดหมู่ทดสอบ)';

    // 1st Creation
    const req1 = new Request(`http://localhost/api/r/${testStoreSlug}/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        action: 'CREATE_CATEGORY',
        name: categoryName,
      }),
    });
    const res1 = await createMenuOrCategory(req1, { params: { slug: testStoreSlug } });
    const data1 = await res1.json();

    expect([200, 201]).toContain(res1.status);
    expect(data1.id).toBeDefined();

    // 2nd Creation with identical name -> Idempotently returns existing category
    const req2 = new Request(`http://localhost/api/r/${testStoreSlug}/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        action: 'CREATE_CATEGORY',
        name: categoryName,
      }),
    });
    const res2 = await createMenuOrCategory(req2, { params: { slug: testStoreSlug } });
    const data2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(data2.id).toBe(data1.id);

    // Verify database only has 1 category with this name
    const count = await prisma.category.count({
      where: { storeId: testStoreId, name: categoryName },
    });
    expect(count).toBe(1);
  });
});
