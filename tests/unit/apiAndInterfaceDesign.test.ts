import { describe, it, expect } from 'vitest';
import {
  asStoreId,
  asOrderId,
  asTableId,
  asMenuItemId,
  asUserId,
  asMemberId,
  OrderLifecycleState,
  PaymentState,
  OrderChannelVariant,
  ApiContractAuditor,
} from '@/lib/contracts';
import {
  apiSuccess,
  apiCreated,
  apiPaginated,
  apiValidationError,
  apiInternalError,
  apiNotFound,
} from '@/lib/apiResponse';
import {
  validateBoundary,
  createOrderBoundarySchema,
  thirdPartyDeliveryWebhookBoundarySchema,
} from '@/lib/validations/boundary';

describe('API and Interface Design - Core Principles & Verification', () => {
  describe('1. Branded Types for Domain IDs', () => {
    it('correctly tags branded types and preserves underlying string values', () => {
      const storeId = asStoreId('store_123');
      const orderId = asOrderId('order_456');
      const tableId = asTableId('table_789');
      const menuItemId = asMenuItemId('menu_101');
      const userId = asUserId('user_202');
      const memberId = asMemberId('member_303');

      expect(storeId).toBe('store_123');
      expect(orderId).toBe('order_456');
      expect(tableId).toBe('table_789');
      expect(menuItemId).toBe('menu_101');
      expect(userId).toBe('user_202');
      expect(memberId).toBe('member_303');
    });
  });

  describe('2. Discriminated Unions for Entity States', () => {
    it('supports exhaustive state checking for order lifecycles', () => {
      const pending: OrderLifecycleState = { status: 'PENDING', placedAt: '2026-10-16T09:00:00Z' };
      const completed: OrderLifecycleState = {
        status: 'COMPLETED',
        completedAt: '2026-10-16T09:30:00Z',
        netAmount: 250,
      };

      function formatStatus(s: OrderLifecycleState): string {
        switch (s.status) {
          case 'PENDING':
            return `รอรับออเดอร์ (${s.placedAt})`;
          case 'COOKING':
            return `กำลังทำอาหาร (${s.startedAt})`;
          case 'READY':
            return `อาหารเสร็จแล้ว (${s.readyAt})`;
          case 'SERVED':
            return `เสิร์ฟแล้ว (${s.servedAt})`;
          case 'COMPLETED':
            return `สำเร็จ (${s.netAmount} บาท)`;
          case 'CANCELLED':
            return `ยกเลิก: ${s.reason}`;
        }
      }

      expect(formatStatus(pending)).toBe('รอรับออเดอร์ (2026-10-16T09:00:00Z)');
      expect(formatStatus(completed)).toBe('สำเร็จ (250 บาท)');
    });

    it('handles payment state variants correctly', () => {
      const unpaid: PaymentState = { status: 'UNPAID' };
      const paid: PaymentState = {
        status: 'PAID',
        method: 'PROMPTPAY',
        paidAt: '2026-10-16T09:15:00Z',
        amount: 320,
      };

      expect(unpaid.status).toBe('UNPAID');
      expect(paid.status).toBe('PAID');
      if (paid.status === 'PAID') {
        expect(paid.amount).toBe(320);
        expect(paid.method).toBe('PROMPTPAY');
      }
    });
  });

  describe('3. Validate at Boundaries (System Edges)', () => {
    it('validates valid order boundary payload successfully', () => {
      const validPayload = {
        tableNo: 5,
        orderType: 'DINE_IN',
        items: [
          {
            menuItemId: 'item_pad_thai',
            quantity: 2,
            notes: 'เผ็ดน้อย',
            options: [{ name: 'เนื้อสัตว์', choice: 'กุ้งสด', extraPrice: 20 }],
          },
        ],
        customerName: 'คุณสมชาย',
      };

      const result = validateBoundary(createOrderBoundarySchema, validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tableNo).toBe(5);
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0].quantity).toBe(2);
      }
    });

    it('rejects order with zero items at the boundary', () => {
      const invalidPayload = {
        tableNo: 1,
        items: [],
      };

      const result = validateBoundary(createOrderBoundarySchema, invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.message).toContain('อย่างน้อย 1 รายการ');
        expect(result.details.items).toBeDefined();
      }
    });

    it('rejects negative item quantity at the boundary', () => {
      const invalidPayload = {
        items: [{ menuItemId: 'item_1', quantity: -1 }],
      };

      const result = validateBoundary(createOrderBoundarySchema, invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.details['items.0.quantity']).toBeDefined();
      }
    });

    it('validates and sanitizes third-party delivery webhook boundary (untrusted data)', () => {
      const externalPayload = {
        channel: 'LINEMAN',
        orderId: 'LM-998822',
        status: 'ACCEPTED',
        totalAmount: 180,
        riderName: 'สมศักดิ์',
        riderPhone: '0812345678',
        extraUntrustedField: 'malicious-string',
      };

      const result = validateBoundary(thirdPartyDeliveryWebhookBoundarySchema, externalPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.channel).toBe('LINEMAN');
        expect(result.data.orderId).toBe('LM-998822');
        expect(result.data.totalAmount).toBe(180);
        // Strips untrusted extra fields
        expect((result.data as any).extraUntrustedField).toBeUndefined();
      }
    });
  });

  describe('4. Standard API Error & Response Helpers', () => {
    it('returns structured 422 validation error with machine-readable code', async () => {
      const response = apiValidationError({ field: ['กรุณาระบุข้อมูล'] });
      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.statusCode).toBe(422);
      expect(body.details).toEqual({ field: ['กรุณาระบุข้อมูล'] });
      expect(body.timestamp).toBeDefined();
    });

    it('returns safe 500 internal error without leaking stack trace', async () => {
      const response = apiInternalError();
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('INTERNAL_SERVER_ERROR');
      expect(body.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.message).toContain('เกิดข้อผิดพลาดภายในระบบ');
      expect(body.statusCode).toBe(500);
      expect(body.details).toBeUndefined();
    });
  });

  describe('5. Contract Conformance & Type Contracts', () => {
    it('verifies IStoreApiClient contract method definitions', () => {
      // Mock implementation to verify contract compile-time and runtime structure
      const mockClient: import('@/lib/contracts').IStoreApiClient = {
        getOrders: async () => [],
        getOrderById: async (id: string) => ({
          id,
          storeId: 'store_1',
          orderNumber: 1,
          status: 'PENDING',
          orderType: 'DINE_IN',
          orderChannel: 'DINE_IN',
          totalAmount: 100,
          discountAmount: 0,
          netAmount: 100,
          createdAt: new Date().toISOString(),
        }),
        createOrder: async (input) => ({
          id: 'ord_new',
          storeId: 'store_1',
          orderNumber: 2,
          status: 'PENDING',
          orderType: input.orderType || 'DINE_IN',
          orderChannel: input.orderChannel || 'DINE_IN',
          totalAmount: 150,
          discountAmount: 0,
          netAmount: 150,
          createdAt: new Date().toISOString(),
        }),
        updateOrderStatus: async (orderId, status) => ({
          id: orderId,
          storeId: 'store_1',
          orderNumber: 1,
          status,
          orderType: 'DINE_IN',
          orderChannel: 'DINE_IN',
          totalAmount: 100,
          discountAmount: 0,
          netAmount: 100,
          createdAt: new Date().toISOString(),
        }),
        getMenuItems: async () => [],
        createMenuItem: async (input) => ({
          id: 'menu_1',
          storeId: 'store_1',
          name: input.name,
          category: input.category,
          price: input.price,
          isAvailable: true,
        }),
        toggleMenuAvailability: async (menuId, isAvailable) => ({
          id: menuId,
          storeId: 'store_1',
          name: 'ข้าวผัด',
          category: 'อาหารจานเดียว',
          price: 50,
          isAvailable,
        }),
        getTables: async () => [],
        createTable: async (input) => ({
          id: 'tbl_1',
          storeId: 'store_1',
          tableNo: input.tableNo,
          name: input.label || `โต๊ะ ${input.tableNo}`,
          status: 'AVAILABLE',
        }),
        clearTable: async (tableNo) => ({ success: true, message: `เคลียร์โต๊ะ ${tableNo}` }),
        getInventory: async () => [],
        createIngredient: async (input) => ({
          id: 'ing_1',
          storeId: 'store_1',
          name: input.name,
          unit: input.unit,
          costPerUnit: input.costPerUnit || 0,
          currentStock: input.currentStock || 0,
          minStockAlert: input.minStockAlert || 10,
        }),
        getMembers: async () => [],
        registerMember: async (input) => ({
          id: 'mem_1',
          storeId: 'store_1',
          name: input.name,
          phone: input.phone,
          points: 0,
          totalSpent: 0,
          totalOrders: 0,
        }),
        getPromotions: async () => [],
        createPromotion: async (input) => ({
          id: 'pro_1',
          storeId: 'store_1',
          name: input.name,
          code: input.code,
          discountType: input.discountType,
          discountValue: input.discountValue,
          isActive: true,
          usageCount: 0,
        }),
      };

      expect(typeof mockClient.getOrders).toBe('function');
      expect(typeof mockClient.createOrder).toBe('function');
      expect(typeof mockClient.createMenuItem).toBe('function');
      expect(typeof mockClient.createTable).toBe('function');
      expect(typeof mockClient.createIngredient).toBe('function');
      expect(typeof mockClient.registerMember).toBe('function');
      expect(typeof mockClient.createPromotion).toBe('function');
    });
  });

  describe('6. Dual Auth Extraction (Bearer Token & Cookie)', () => {
    it('getCurrentUser extracts session token from Authorization: Bearer header', async () => {
      const { createSessionToken, getCurrentUser } = await import('@/lib/auth');
      const testUser: import('@/lib/auth').SessionUser = {
        id: 'usr_test_1',
        email: 'owner@test.com',
        name: 'ร้านทดสอบ',
        role: 'STORE_OWNER',
        storeId: 'store_test_1',
        storeSlug: 'test-store',
      };

      const token = await createSessionToken(testUser);
      const reqWithBearer = new Request('https://pos.local/api/r/test-store/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const extracted = await getCurrentUser(reqWithBearer);
      expect(extracted).not.toBeNull();
      expect(extracted?.id).toBe(testUser.id);
      expect(extracted?.role).toBe('STORE_OWNER');
    });

    it('getCurrentUser extracts session token from Cookie header', async () => {
      const { createSessionToken, getCurrentUser, COOKIE_NAME } = await import('@/lib/auth');
      const testUser: import('@/lib/auth').SessionUser = {
        id: 'usr_test_2',
        email: 'staff@test.com',
        name: 'พนักงานทดสอบ',
        role: 'STORE_STAFF',
        storeId: 'store_test_1',
        storeSlug: 'test-store',
      };

      const token = await createSessionToken(testUser);
      const reqWithCookie = new Request('https://pos.local/api/r/test-store/orders', {
        headers: {
          Cookie: `${COOKIE_NAME}=${token}`,
        },
      });

      const extracted = await getCurrentUser(reqWithCookie);
      expect(extracted).not.toBeNull();
      expect(extracted?.id).toBe(testUser.id);
      expect(extracted?.role).toBe('STORE_STAFF');
    });
  });

  describe('7. Interface Design Auditor (Hyrum\'s Law, Predictable Naming, One-Version Rule)', () => {
    it('detects sensitive and implementation leakage in public payloads (Hyrum\'s Law)', () => {
      const publicResponse = {
        id: 'ord_123',
        customerName: 'คุณสมศักดิ์',
        passwordHash: '$2b$10$...', // LEAK!
        metadata: {
          sqlQuery: 'SELECT * FROM orders', // LEAK!
        },
      };

      const leaks = ApiContractAuditor.checkImplementationLeaks(publicResponse);
      expect(leaks).toHaveLength(2);
      expect(leaks[0]).toContain('passwordHash');
      expect(leaks[1]).toContain('metadata.sqlQuery');
    });

    it('validates boolean naming conventions (is/has/can/should prefix)', () => {
      expect(ApiContractAuditor.checkBooleanNaming('isAvailable')).toBe(true);
      expect(ApiContractAuditor.checkBooleanNaming('hasDiscount')).toBe(true);
      expect(ApiContractAuditor.checkBooleanNaming('canEdit')).toBe(true);
      expect(ApiContractAuditor.checkBooleanNaming('shouldNotify')).toBe(true);

      // Violations
      expect(ApiContractAuditor.checkBooleanNaming('available')).toBe(false);
      expect(ApiContractAuditor.checkBooleanNaming('discount')).toBe(false);
    });

    it('validates enum value conventions (UPPER_SNAKE_CASE)', () => {
      expect(ApiContractAuditor.checkEnumConvention('IN_PROGRESS')).toBe(true);
      expect(ApiContractAuditor.checkEnumConvention('COMPLETED')).toBe(true);
      expect(ApiContractAuditor.checkEnumConvention('WAITING_FOR_PAYMENT')).toBe(true);

      // Violations
      expect(ApiContractAuditor.checkEnumConvention('inProgress')).toBe(false);
      expect(ApiContractAuditor.checkEnumConvention('Completed')).toBe(false);
    });

    it('enforces input/output separation (forbids server-managed attributes in input)', () => {
      const inputWithServerFields = ['name', 'price', 'id', 'createdAt'];
      const audit = ApiContractAuditor.checkInputOutputSeparation(inputWithServerFields);

      expect(audit.valid).toBe(false);
      expect(audit.violations).toContain('id');
      expect(audit.violations).toContain('createdAt');

      const cleanInput = ['name', 'price', 'categoryId'];
      const cleanAudit = ApiContractAuditor.checkInputOutputSeparation(cleanInput);
      expect(cleanAudit.valid).toBe(true);
      expect(cleanAudit.violations).toHaveLength(0);
    });

    it('evaluates backward compatibility (prefer addition over modification)', () => {
      const v1Schema = {
        title: { type: 'string' },
        description: { type: 'string', optional: true },
        priority: { type: 'string' },
      };

      // 1. Safe additive revision
      const v2SafeSchema = {
        title: { type: 'string' },
        description: { type: 'string', optional: true },
        priority: { type: 'string' },
        labels: { type: 'string[]', optional: true }, // Optional addition
      };
      const safeReport = ApiContractAuditor.checkBackwardCompatibility(v1Schema, v2SafeSchema);
      expect(safeReport.compatible).toBe(true);
      expect(safeReport.breakingChanges).toHaveLength(0);
      expect(safeReport.safeAdditions).toHaveLength(1);

      // 2. Breaking revision (removed field & changed type)
      const v2BreakingSchema = {
        title: { type: 'string' },
        // description removed!
        priority: { type: 'number' }, // type changed from string to number!
      };
      const breakingReport = ApiContractAuditor.checkBackwardCompatibility(v1Schema, v2BreakingSchema);
      expect(breakingReport.compatible).toBe(false);
      expect(breakingReport.breakingChanges.length).toBeGreaterThanOrEqual(2);
    });
  });
});


