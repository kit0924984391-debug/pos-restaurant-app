import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('AutoForm (shadcn-vue Schema-Driven Form Generation) Suite', () => {
  const userRegistrationSchema = z.object({
    name: z.string().min(2, 'ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),
    phone: z.string().regex(/^0[0-9]{8,9}$/, 'เบอร์โทรศัพท์ไม่ถูกต้อง'),
    role: z.enum(['STAFF', 'CHEF', 'ADMIN']),
    maxTables: z.number().int().positive('จำนวนโต๊ะต้องมากกว่า 0').default(10),
    isActive: z.boolean().default(true),
  });

  it('1. Extracts field definitions and enum values from schema shape', () => {
    const shape = userRegistrationSchema.shape;
    const keys = Object.keys(shape);

    expect(keys).toEqual(['name', 'phone', 'role', 'maxTables', 'isActive']);
    expect(shape.role instanceof z.ZodEnum).toBe(true);
    expect(shape.role.options).toEqual(['STAFF', 'CHEF', 'ADMIN']);
  });

  it('2. Successfully validates conforming form data', () => {
    const validData = {
      name: 'สมชาย ขายดี',
      phone: '0812345678',
      role: 'CHEF' as const,
      maxTables: 15,
      isActive: true,
    };

    const result = userRegistrationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('สมชาย ขายดี');
      expect(result.data.role).toBe('CHEF');
    }
  });

  it('3. Rejects invalid form data with localized error messages', () => {
    const invalidData = {
      name: 'A', // too short (< 2)
      phone: '12345', // invalid phone regex
      role: 'SUPER_ADMIN', // not in enum
      maxTables: -5, // not positive
    };

    const result = userRegistrationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMap = result.error.flatten().fieldErrors;
      expect(errorMap.name?.[0]).toContain('2 ตัวอักษร');
      expect(errorMap.phone?.[0]).toContain('เบอร์โทรศัพท์ไม่ถูกต้อง');
      expect(errorMap.maxTables?.[0]).toContain('มากกว่า 0');
    }
  });

  it('4. Applies schema defaults when optional fields are omitted', () => {
    const partialData = {
      name: 'สมศรี มีทรัพย์',
      phone: '0899998888',
      role: 'STAFF' as const,
    };

    const result = userRegistrationSchema.parse(partialData);
    expect(result.maxTables).toBe(10);
    expect(result.isActive).toBe(true);
  });
});
