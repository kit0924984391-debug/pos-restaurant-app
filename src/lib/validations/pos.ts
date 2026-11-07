import { z } from 'zod';

/**
 * Menu Item Option Validation
 */
export const menuItemOptionSchema = z.object({
  name: z.string().min(1, 'ต้องระบุชื่อตัวเลือก'),
  choice: z.string().min(1, 'ต้องระบุชื่อตัวเลือกย่อย'),
  extraPrice: z.coerce.number().min(0, 'ราคาเพิ่มต้องไม่ติดลบ').default(0),
});

export type MenuItemOption = z.infer<typeof menuItemOptionSchema>;

/**
 * Menu Item Validation
 */
export const menuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'ต้องระบุชื่ออาหาร').max(100, 'ชื่ออาหารต้องไม่เกิน 100 ตัวอักษร'),
  description: z.string().max(300, 'คำอธิบายต้องไม่เกิน 300 ตัวอักษร').optional(),
  category: z.enum(['FOOD', 'DRINK', 'DESSERT', 'OTHER']).default('FOOD'),
  price: z.coerce.number().positive('ราคาต้องมากกว่า 0 บาท'),
  cost: z.coerce.number().min(0, 'ต้นทุนต้องไม่ติดลบ').default(0),
  isAvailable: z.boolean().default(true),
  options: z.array(menuItemOptionSchema).default([]),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;

/**
 * Order Item Option
 */
export const orderItemOptionSchema = z.object({
  name: z.string().min(1, 'ต้องระบุชื่อตัวเลือก'),
  choice: z.string().min(1, 'ต้องระบุค่าตัวเลือก'),
  extraPrice: z.coerce.number().min(0).default(0),
});

export type OrderItemOption = z.infer<typeof orderItemOptionSchema>;

/**
 * Order Item
 */
export const orderItemSchema = z.object({
  menuItemId: z.string().min(1, 'ต้องระบุ menuItemId'),
  name: z.string().min(1, 'ต้องระบุชื่อรายการอาหาร'),
  price: z.coerce.number().positive('ราคาต่อหน่วยต้องมากกว่า 0 บาท'),
  quantity: z.coerce.number().int('จำนวนต้องเป็นจำนวนเต็ม').positive('จำนวนต้องอย่างน้อย 1 จาน'),
  notes: z.string().max(200, 'หมายเหตุต้องไม่เกิน 200 ตัวอักษร').optional(),
  options: z.array(orderItemOptionSchema).default([]),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

/**
 * Discriminated Union for Payment Details
 * Discriminated on 'method': CASH | PROMPTPAY | TRANSFER | CREDIT_CARD
 */
export const cashPaymentSchema = z.object({
  method: z.literal('CASH'),
  amount: z.coerce.number().positive('ยอดชำระต้องมากกว่า 0 บาท'),
  amountTendered: z.coerce.number().positive('ยอดเงินที่รับต้องมากกว่า 0 บาท'),
  change: z.coerce.number().min(0, 'เงินทอนต้องไม่ติดลบ').default(0),
});

export const promptPayPaymentSchema = z.object({
  method: z.literal('PROMPTPAY'),
  amount: z.coerce.number().positive('ยอดชำระต้องมากกว่า 0 บาท'),
  qrPayload: z.string().min(1, 'ต้องระบุ QR Payload'),
  transactionRef: z.string().optional(),
});

export const transferPaymentSchema = z.object({
  method: z.literal('TRANSFER'),
  amount: z.coerce.number().positive('ยอดชำระต้องมากกว่า 0 บาท'),
  bankName: z.string().min(1, 'ต้องระบุธนาคารผู้โอน'),
  slipUrl: z.string().url('ต้องเป็น URL ของสลิปที่ถูกต้อง').optional(),
  verified: z.boolean().default(false),
});

export const creditCardPaymentSchema = z.object({
  method: z.literal('CREDIT_CARD'),
  amount: z.coerce.number().positive('ยอดชำระต้องมากกว่า 0 บาท'),
  cardLast4: z.string().length(4, 'ต้องระบุเลขท้ายบัตร 4 หลัก'),
  cardType: z.enum(['VISA', 'MASTERCARD', 'JCB', 'OTHER']).default('VISA'),
  authCode: z.string().optional(),
});

export const paymentDiscriminatedSchema = z.discriminatedUnion('method', [
  cashPaymentSchema,
  promptPayPaymentSchema,
  transferPaymentSchema,
  creditCardPaymentSchema,
]);

export type PaymentDetail = z.infer<typeof paymentDiscriminatedSchema>;

/**
 * Full Order Creation Schema with SuperRefine
 * Validates table/customer rules and discount limits
 */
export const createPosOrderSchema = z
  .object({
    storeId: z.string().min(1, 'ต้องระบุ storeId'),
    tableId: z.string().optional(),
    tableNo: z.coerce.number().int().positive('หมายเลขโต๊ะต้องเป็นตัวเลขมากกว่า 0').optional(),
    customerName: z.string().max(100, 'ชื่อลูกค้าต้องไม่เกิน 100 ตัวอักษร').optional(),
    orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).default('DINE_IN'),
    items: z.array(orderItemSchema).min(1, 'กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ'),
    discountAmount: z.coerce.number().min(0, 'ส่วนลดต้องไม่ติดลบ').default(0),
    payment: paymentDiscriminatedSchema.optional(),
    note: z.string().max(300, 'หมายเหตุคำสั่งซื้อต้องไม่เกิน 300 ตัวอักษร').optional(),
  })
  .superRefine((data, ctx) => {
    // 1. If DINE_IN, either tableId or tableNo must be provided
    if (data.orderType === 'DINE_IN' && !data.tableId && data.tableNo === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'การทานที่ร้าน (DINE_IN) ต้องระบุหมายเลขโต๊ะหรือ Table ID',
        path: ['tableNo'],
      });
    }

    // 2. Calculate subtotal and check discount limits
    const subtotal = data.items.reduce((sum, item) => {
      const optionsSum = item.options.reduce((optSum, opt) => optSum + (opt.extraPrice || 0), 0);
      return sum + (item.price + optionsSum) * item.quantity;
    }, 0);

    if (data.discountAmount > subtotal) {
      ctx.addIssue({
        code: 'custom',
        message: `ส่วนลด (${data.discountAmount} บาท) ต้องไม่เกินยอดรวมของออเดอร์ (${subtotal} บาท)`,
        path: ['discountAmount'],
      });
    }

    // 3. If Cash payment, amountTendered must be >= subtotal - discount
    if (data.payment && data.payment.method === 'CASH') {
      const payableAmount = Math.max(0, subtotal - data.discountAmount);
      if (data.payment.amountTendered < payableAmount) {
        ctx.addIssue({
          code: 'custom',
          message: `ยอดเงินที่รับ (${data.payment.amountTendered} บาท) ไม่เพียงพอต่อยอดที่ต้องชำระ (${payableAmount} บาท)`,
          path: ['payment', 'amountTendered'],
        });
      }
    }
  });

export type CreatePosOrderInput = z.infer<typeof createPosOrderSchema>;

/**
 * Bank Slip OCR / Webhook Verification Schema
 */
export const bankSlipVerificationSchema = z.object({
  transRef: z.string().min(1, 'ต้องระบุรหัสอ้างอิงธุรกรรม (Transaction Reference)'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'รูปแบบเวลาต้องเป็น HH:MM หรือ HH:MM:SS'),
  amount: z.coerce.number().positive('ยอดเงินในสลิปต้องมากกว่า 0 บาท'),
  senderBank: z.string().min(1, 'ต้องระบุธนาคารผู้โอน'),
  receiverBank: z.string().min(1, 'ต้องระบุธนาคารผู้รับ'),
  senderAccount: z.string().optional(),
  receiverAccount: z.string().min(1, 'ต้องระบุบัญชีผู้รับเงิน'),
  orderId: z.string().optional(),
});

export type BankSlipVerificationInput = z.infer<typeof bankSlipVerificationSchema>;

/**
 * Table Cart Sync Schema (QR Customer Ordering)
 */
export const tableCartSyncSchema = z.object({
  tableId: z.string().min(1, 'ต้องระบุ tableId'),
  storeId: z.string().min(1, 'ต้องระบุ storeId'),
  cartItems: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.coerce.number().int().min(0, 'จำนวนต้องไม่ติดลบ'),
        selectedOptions: z.array(z.string()).default([]),
        notes: z.string().max(100).optional(),
      })
    )
    .default([]),
  lastUpdated: z.coerce.number().default(() => Date.now()),
});

export type TableCartSyncInput = z.infer<typeof tableCartSyncSchema>;
