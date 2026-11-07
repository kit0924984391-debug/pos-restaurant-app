/**
 * API and Interface Design - Boundary Validation
 * 
 * Principle 3: Validate at Boundaries
 * Trust internal code. Validate at system edges where external input enters:
 * - API route handlers (user input)
 * - External service response parsing & webhooks (always treat as untrusted)
 */

import { z } from 'zod';

export interface BoundaryValidationSuccess<T> {
  success: true;
  data: T;
}

export interface BoundaryValidationFailure {
  success: false;
  code: 'VALIDATION_ERROR';
  message: string;
  details: Record<string, string[]>;
}

export type BoundaryValidationResult<T> =
  | BoundaryValidationSuccess<T>
  | BoundaryValidationFailure;

/**
 * Validates unknown external input at system boundaries.
 * Returns either strongly typed data or structured validation error details.
 */
export function validateBoundary<T>(
  schema: z.ZodType<T>,
  input: unknown
): BoundaryValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const details: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!details[key]) {
      details[key] = [];
    }
    details[key].push(issue.message);
  }

  const firstErrorMessage =
    result.error.issues[0]?.message || 'ข้อมูลที่ส่งมาไม่ถูกต้องตามเงื่อนไข';

  return {
    success: false,
    code: 'VALIDATION_ERROR',
    message: firstErrorMessage,
    details,
  };
}

/**
 * Boundary Schema: Create Order
 */
export const orderItemOptionBoundarySchema = z.object({
  name: z.string().min(1, 'ต้องระบุชื่อตัวเลือก'),
  choice: z.string().min(1, 'ต้องระบุค่าของตัวเลือก'),
  extraPrice: z.number().nonnegative().optional().default(0),
});

export const orderItemBoundarySchema = z.object({
  menuItemId: z.string().min(1, 'ต้องระบุ menuItemId'),
  name: z.string().optional(),
  price: z.number().nonnegative().optional(),
  quantity: z.number().int().positive('จำนวนอาหารต้องมากกว่า 0'),
  notes: z.string().max(200, 'หมายเหตุต้องไม่เกิน 200 ตัวอักษร').optional(),
  options: z.array(orderItemOptionBoundarySchema).optional(),
});

export const createOrderBoundarySchema = z.object({
  tableId: z.string().optional(),
  tableNo: z.number().int().positive().optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).optional().default('DINE_IN'),
  orderChannel: z.string().optional().default('DINE_IN'),
  deliveryOrderId: z.string().optional(),
  riderName: z.string().max(100).optional(),
  riderPhone: z.string().max(20).optional(),
  gpPercent: z.number().min(0).max(100).optional(),
  items: z.array(orderItemBoundarySchema).min(1, 'กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ'),
  customerName: z.string().max(100).optional(),
  customerLineId: z.string().max(50).optional(),
  memberPhone: z.string().max(20).optional(),
  promoCode: z.string().max(30).optional(),
  discountAmount: z.number().nonnegative().optional().default(0),
  pointsRedeemed: z.number().int().nonnegative().optional().default(0),
  note: z.string().max(300).optional(),
  clientRequestId: z.string().max(100).optional(),
});

export type ValidatedCreateOrderInput = z.infer<typeof createOrderBoundarySchema>;

/**
 * Boundary Schema: Untrusted Third-party Delivery Webhook Payload
 * Sanitizes external payload and strictly enforces required fields
 */
export const thirdPartyDeliveryWebhookBoundarySchema = z.object({
  channel: z.enum(['GRAB', 'LINEMAN', 'SHOPEE', 'ROBINHOOD', 'KLIKIT']).catch('GRAB'),
  orderId: z.string().min(1, 'ต้องมีรหัสคำสั่งซื้อภายนอก'),
  status: z.string().min(1, 'ต้องมีสถานะคำสั่งซื้อ'),
  totalAmount: z.number().nonnegative('ยอดเงินต้องไม่ติดลบ'),
  riderName: z.string().max(100).optional().nullable(),
  riderPhone: z.string().max(20).optional().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().positive(),
      price: z.number().nonnegative(),
    })
  ).optional().default([]),
});

export type ValidatedThirdPartyDeliveryWebhook = z.infer<
  typeof thirdPartyDeliveryWebhookBoundarySchema
>;
