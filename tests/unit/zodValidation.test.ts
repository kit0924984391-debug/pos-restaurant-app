import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  validateBoundary,
  createOrderBoundarySchema,
  menuItemSchema,
  paymentDiscriminatedSchema,
  createPosOrderSchema,
  bankSlipVerificationSchema,
  tableCartSyncSchema,
  validateEnv,
  formatZodError,
  safeValidate,
  exportToJsonSchema,
} from '@/lib/validations';
import { z } from 'zod';

describe('Zod Schema Validation & Type-Inference Suite', () => {
  // 1. Authentication Schemas
  describe('1. Authentication Validation (loginSchema & registerSchema)', () => {
    it('loginSchema successfully parses valid phone/email and password', () => {
      const validPhone = loginSchema.safeParse({
        phone: '0812345678',
        password: 'password123',
      });
      expect(validPhone.success).toBe(true);
      if (validPhone.success) {
        expect(validPhone.data.phone).toBe('0812345678');
      }

      const invalid = loginSchema.safeParse({
        phone: '12',
        password: '12',
      });
      expect(invalid.success).toBe(false);
    });

    it('registerSchema validates password match and bank account details', () => {
      const validRegistration = {
        storeName: 'ร้านป้าสมใจ',
        name: 'สมใจ ใจดี',
        email: 'somjai@example.com',
        phone: '0891234567',
        bankName: 'กสิกรไทย',
        bankAccountNo: '1234567890',
        bankAccountName: 'สมใจ ใจดี',
        password: 'secretPassword123',
        confirmPassword: 'secretPassword123',
      };

      const result = registerSchema.safeParse(validRegistration);
      expect(result.success).toBe(true);

      const mismatchedPassword = {
        ...validRegistration,
        confirmPassword: 'differentPassword',
      };
      const mismatchResult = registerSchema.safeParse(mismatchedPassword);
      expect(mismatchResult.success).toBe(false);
      if (!mismatchResult.success) {
        expect(mismatchResult.error.issues[0].message).toContain('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      }
    });
  });

  // 2. POS Domain & Payment Discriminated Unions
  describe('2. POS Domain Schemas & Payment Discriminated Unions', () => {
    it('menuItemSchema validates price coercion and item options', () => {
      const rawItem = {
        name: 'ข้าวกะเพราหมูกรอบ',
        price: '65', // coerced from string to number
        category: 'FOOD',
        options: [
          { name: 'ความเผ็ด', choice: 'เผ็ดมาก', extraPrice: 0 },
          { name: 'ไข่ดาว', choice: 'ไข่ดาวกรอบ', extraPrice: '10' }, // coerced
        ],
      };

      const result = menuItemSchema.safeParse(rawItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBe(65);
        expect(result.data.options[1].extraPrice).toBe(10);
      }
    });

    it('paymentDiscriminatedSchema correctly validates CASH payment with change calculation', () => {
      const cashPay = {
        method: 'CASH',
        amount: 120,
        amountTendered: 200,
        change: 80,
      };

      const result = paymentDiscriminatedSchema.safeParse(cashPay);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe('CASH');
        expect(result.data.amount).toBe(120);
      }
    });

    it('paymentDiscriminatedSchema correctly validates PROMPTPAY and TRANSFER payments', () => {
      const promptPay = {
        method: 'PROMPTPAY',
        amount: 85,
        qrPayload: '00020101021129370016A000000677010111...',
      };
      const promptPayResult = paymentDiscriminatedSchema.safeParse(promptPay);
      expect(promptPayResult.success).toBe(true);

      const transfer = {
        method: 'TRANSFER',
        amount: 150,
        bankName: 'ไทยพาณิชย์',
        slipUrl: 'https://storage.pos.local/slips/slip_123.jpg',
      };
      const transferResult = paymentDiscriminatedSchema.safeParse(transfer);
      expect(transferResult.success).toBe(true);
    });

    it('createPosOrderSchema enforces superRefine business constraints (table check & discount limits)', () => {
      const baseOrder = {
        storeId: 'store_01',
        orderType: 'DINE_IN',
        items: [
          {
            menuItemId: 'item_1',
            name: 'กะเพราไก่',
            price: 50,
            quantity: 2,
            options: [],
          },
        ],
        discountAmount: 150, // subtotal is 100, discount is 150 -> should fail superRefine!
      };

      // 1. Missing table for DINE_IN
      const noTableResult = createPosOrderSchema.safeParse(baseOrder);
      expect(noTableResult.success).toBe(false);
      if (!noTableResult.success) {
        const errorMessages = noTableResult.error.issues.map((i) => i.message);
        expect(errorMessages.some((msg) => msg.includes('ต้องระบุหมายเลขโต๊ะ'))).toBe(true);
        expect(errorMessages.some((msg) => msg.includes('ต้องไม่เกินยอดรวม'))).toBe(true);
      }

      // 2. Valid order with table and proper discount
      const validOrder = {
        ...baseOrder,
        tableNo: 4,
        discountAmount: 20,
        payment: {
          method: 'CASH',
          amount: 80,
          amountTendered: 100,
          change: 20,
        },
      };

      const validResult = createPosOrderSchema.safeParse(validOrder);
      expect(validResult.success).toBe(true);
    });
  });

  // 3. Bank Slip & Table Cart Validation
  describe('3. Bank Slip & Table Cart Validation', () => {
    it('bankSlipVerificationSchema validates OCR transaction data', () => {
      const slipData = {
        transRef: '202610161200998877',
        date: '2026-10-16',
        time: '12:30:45',
        amount: '120.50',
        senderBank: 'KBANK',
        receiverBank: 'SCB',
        receiverAccount: '123-4-56789-0',
      };

      const result = bankSlipVerificationSchema.safeParse(slipData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(120.5);
      }
    });

    it('tableCartSyncSchema validates cart array items and default timestamp', () => {
      const cartData = {
        tableId: 'tbl_8',
        storeId: 'store_test',
        cartItems: [
          { menuItemId: 'item_pad_thai', quantity: 2, selectedOptions: ['พิเศษ'] },
        ],
      };

      const result = tableCartSyncSchema.safeParse(cartData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lastUpdated).toBeGreaterThan(0);
        expect(result.data.cartItems[0].quantity).toBe(2);
      }
    });
  });

  // 4. Environment Variables Validation
  describe('4. Environment Variables Validation (validateEnv)', () => {
    it('validateEnv provides default values and coerces numbers', () => {
      const customEnv = {
        NODE_ENV: 'production',
        PORT: '8080',
        LOG_LEVEL: 'warn',
        BASE_URL: 'https://pos-restaurant.local',
      };

      const result = validateEnv(customEnv);
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.PORT).toBe(8080);
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.LOG_LEVEL).toBe('warn');
        expect(result.data.JWT_SECRET).toBeDefined();
      }
    });

    it('validateEnv flags invalid values with structured errors', () => {
      const invalidEnv = {
        NODE_ENV: 'invalid_env_name',
        PORT: '-10',
        BASE_URL: 'not-a-valid-url',
      };

      const result = validateEnv(invalidEnv);
      expect(result.success).toBe(false);
      expect(result.errors?.NODE_ENV).toBeDefined();
      expect(result.errors?.PORT).toBeDefined();
      expect(result.errors?.BASE_URL).toBeDefined();
    });
  });

  // 5. Error Formatters & Safe Parsing Helper
  describe('5. Error Formatters & Safe Parsing Helper', () => {
    it('formatZodError standardizes field errors and summaries', () => {
      const testSchema = z.object({
        email: z.string().email('อีเมลไม่ถูกต้อง'),
        age: z.number().int().min(18, 'อายุต้องไม่ต่ำกว่า 18 ปี'),
      });

      const parsed = testSchema.safeParse({ email: 'bad_email', age: 15 });
      expect(parsed.success).toBe(false);

      if (!parsed.success) {
        const formatted = formatZodError(parsed.error);
        expect(formatted.fieldErrors.email).toEqual(['อีเมลไม่ถูกต้อง']);
        expect(formatted.fieldErrors.age).toEqual(['อายุต้องไม่ต่ำกว่า 18 ปี']);
        expect(formatted.errorCount).toBe(2);
        expect(formatted.firstError).toBe('อีเมลไม่ถูกต้อง');
      }
    });

    it('safeValidate helper returns typed data or formatted error payload', () => {
      const testSchema = z.object({
        quantity: z.number().positive('จำนวนต้องมากกว่า 0'),
      });

      const successResult = safeValidate(testSchema, { quantity: 5 });
      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.data.quantity).toBe(5);
      }

      const failResult = safeValidate(testSchema, { quantity: -1 });
      expect(failResult.success).toBe(false);
      if (!failResult.success) {
        expect(failResult.errors.fieldErrors.quantity).toEqual(['จำนวนต้องมากกว่า 0']);
      }
    });
  });

  // 6. JSON Schema Export (Zod 4 toJSONSchema)
  describe('6. JSON Schema Export (z.toJSONSchema)', () => {
    it('exportToJsonSchema generates valid Draft 2020-12 schema object', () => {
      const itemSchema = z.object({
        name: z.string(),
        price: z.number(),
        isAvailable: z.boolean().default(true),
      });

      const jsonSchema = exportToJsonSchema(itemSchema, {
        title: 'MenuItemSpecification',
        description: 'OpenAPI specification for Menu Items',
      });

      expect(jsonSchema.title).toBe('MenuItemSpecification');
      expect(jsonSchema.description).toBe('OpenAPI specification for Menu Items');
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties.name.type).toBe('string');
      expect(jsonSchema.properties.price.type).toBe('number');
    });
  });

  // 7. Backward Compatibility Verification
  describe('7. Backward Compatibility Verification (validateBoundary)', () => {
    it('validateBoundary functions as before without breaking changes', () => {
      const res = validateBoundary(createOrderBoundarySchema, {
        items: [{ menuItemId: 'item_1', quantity: 2 }],
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.items[0].quantity).toBe(2);
        expect(res.data.orderType).toBe('DINE_IN');
      }
    });
  });
});
