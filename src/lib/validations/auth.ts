import { z } from 'zod';

export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, 'กรุณากรอกเบอร์โทรศัพท์มือถือหรืออีเมล')
    .refine((val) => val.trim().length >= 4, 'กรุณากรอกข้อมูลระบุตัวตนให้ถูกต้อง'),
  password: z
    .string()
    .min(1, 'กรุณากรอกรหัสผ่าน')
    .min(4, 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    storeName: z.string().min(2, 'ชื่อร้านต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),
    name: z.string().min(2, 'ชื่อเจ้าของร้านต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),
    email: z.string().email('กรุณากรอกอีเมลที่ถูกต้อง (เช่น example@mail.com)'),
    phone: z
      .string()
      .min(9, 'เบอร์โทรศัพท์ต้องมีอย่างน้อย 9-10 หลัก')
      .regex(/^[0-9\-\s+]+$/, 'เบอร์โทรศัพท์ต้องประกอบด้วยตัวเลขเท่านั้น'),
    bankName: z.string().min(1, 'กรุณาเลือกธนาคาร'),
    bankAccountNo: z
      .string()
      .min(10, 'เลขที่บัญชีต้องมีอย่างน้อย 10 หลัก')
      .max(15, 'เลขที่บัญชีต้องไม่เกิน 15 หลัก'),
    bankAccountName: z.string().min(2, 'ชื่อบัญชีธนาคารต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),
    password: z.string().min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
    confirmPassword: z.string().min(6, 'กรุณากรอกยืนยันรหัสผ่าน'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
