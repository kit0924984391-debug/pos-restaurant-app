import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { cleanPhoneNumber, isValidThaiMobile, verifySmsOtp } from '@/lib/sms';

export const dynamic = 'force-dynamic';

function generateSlug(storeName: string): string {
  const clean = storeName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (clean.length >= 3) {
    return `${clean}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `store-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
}

// Signup throttle: max 3 registration attempts per phone/email per 24h, counted in
// D1 (works across worker isolates). Full anti-spam belongs to the edge (WAF
// rate limiting) once the app runs on a custom domain.
const REGISTER_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REGISTER_PER_PHONE = 5;

async function registerAttemptsFor(key: string, nowMs: number): Promise<number> {
  const rows: any = await prisma.$queryRaw`
    SELECT count AS c, windowStart AS ws FROM LoginAttempt WHERE key = ${'register:' + key}
  `;
  const row = rows?.[0];
  if (!row) return 0;
  if (Number(row.ws) < nowMs - REGISTER_WINDOW_MS) return 0;
  return Number(row.c) || 0;
}

async function recordRegisterAttempt(key: string, nowMs: number): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO LoginAttempt (key, windowStart, count)
    VALUES (${'register:' + key}, ${nowMs}, 1)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN windowStart < ${nowMs - REGISTER_WINDOW_MS} THEN 1 ELSE count + 1 END,
      windowStart = CASE WHEN windowStart < ${nowMs - REGISTER_WINDOW_MS} THEN ${nowMs} ELSE windowStart END
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, storeName, phone, otp, refCode } = body;

    if (!name || !storeName || !phone || !password || !otp) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, ชื่อร้าน, เบอร์โทรศัพท์, รหัสผ่าน, และรหัส OTP)' },
        { status: 400 }
      );
    }

    const cleanPhone = cleanPhoneNumber(phone);
    if (!isValidThaiMobile(cleanPhone)) {
      return NextResponse.json(
        { error: 'เบอร์โทรศัพท์มือถือไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก (เช่น 0812345678)' },
        { status: 400 }
      );
    }

    const signupKey = cleanPhone;
    const signupNow = Date.now();
    const priorAttempts = await registerAttemptsFor(signupKey, signupNow);
    if (priorAttempts >= MAX_REGISTER_PER_PHONE) {
      return NextResponse.json(
        { error: 'เบอร์โทรนี้ลองสมัครหลายครั้งเกินไป กรุณารอ 24 ชั่วโมงแล้วลองใหม่' },
        { status: 429 }
      );
    }
    await recordRegisterAttempt(signupKey, signupNow);

    // 1. Check existing phone number
    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: phone },
        ],
      },
    });

    if (existingPhoneUser) {
      return NextResponse.json(
        { error: 'เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบด้วยเบอร์นี้หรือใช้เบอร์อื่น' },
        { status: 400 }
      );
    }

    // 2. Verify SMS OTP
    const otpVerification = await verifySmsOtp(cleanPhone, otp, refCode);
    if (!otpVerification.success) {
      return NextResponse.json(
        { error: otpVerification.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' },
        { status: 400 }
      );
    }

    // 3. Email handling (use provided email or auto-generate fallback from phone)
    const userEmail = email && email.trim()
      ? email.toLowerCase().trim()
      : `${cleanPhone}@ordeopos.com`;

    const existingEmailUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingEmailUser) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาใช้อีเมลอื่น' },
        { status: 400 }
      );
    }

    // Generate Slug
    let slug = generateSlug(storeName);
    while (await prisma.store.findUnique({ where: { slug } })) {
      slug = generateSlug(storeName);
    }

    // 90 Days Free Trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 90);

    const passwordHash = await hashPassword(password);

    // D1 does not support interactive transactions, so dependent steps run
    // sequentially and independent steps are batched. If anything fails, the
    // store row is deleted (cascades to user/tables/categories/menu) so no
    // half-registered account is left behind.
    let store: any = null;
    let result: { user: any; store: any };
    try {
      store = await prisma.store.create({
        data: {
          slug,
          name: storeName.trim(),
          phone: cleanPhone,
          status: 'TRIAL',
          trialEndsAt: trialEnd,
          subscriptionEnd: trialEnd,
          planId: 'plan_trial',
          tableCount: 10,
          receiptFooter: 'ขอบคุณที่อุดหนุนครับ/ค่ะ โอกาสหน้าเชิญใหม่',
        },
      });

      // User + initial tables only depend on store.id — safe to batch.
      const [user] = await prisma.$transaction([
        prisma.user.create({
          data: {
            name: name.trim(),
            email: userEmail,
            passwordHash,
            phone: cleanPhone,
            role: 'STORE_OWNER',
            storeId: store.id,
          },
        }),
        prisma.table.createMany({
          data: Array.from({ length: 10 }, (_, i) => ({
            storeId: store.id,
            tableNo: i + 1,
            name: `โต๊ะ ${i + 1}`,
            status: 'AVAILABLE',
          })),
        }),
      ]);

      const cat = await prisma.category.create({
        data: {
          storeId: store.id,
          name: 'เมนูแนะนำ / ผัดกะเพรา',
          sortOrder: 1,
        },
      });

      await prisma.$transaction([
        prisma.menuItem.create({
          data: {
            storeId: store.id,
            categoryId: cat.id,
            name: 'ผัดกะเพราราดข้าว (สูตรเด็ด)',
            basePrice: 50,
            description: 'ผัดกะเพราหอมกรุ่นคั่วพริกแห้งเข้มข้น',
            imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
            options: {
              create: [
                {
                  title: 'เลือกเนื้อสัตว์',
                  isRequired: true,
                  choices: {
                    create: [
                      { name: 'หมูสับ/หมูชิ้น', extraPrice: 0 },
                      { name: 'ไก่ชิ้น', extraPrice: 0 },
                      { name: 'หมูกรอบ', extraPrice: 15 },
                      { name: 'ทะเลรวม (กุ้ง+หมึก)', extraPrice: 20 },
                    ],
                  },
                },
                {
                  title: 'ระดับความเผ็ด',
                  isRequired: true,
                  choices: {
                    create: [
                      { name: 'เผ็ดน้อย', extraPrice: 0 },
                      { name: 'เผ็ดกลาง', extraPrice: 0 },
                      { name: 'เผ็ดมาก', extraPrice: 0 },
                    ],
                  },
                },
                {
                  title: 'เพิ่มไข่',
                  isRequired: false,
                  choices: {
                    create: [
                      { name: 'ไข่ดาวไม่สุก', extraPrice: 10 },
                      { name: 'ไข่ดาวสุก', extraPrice: 10 },
                      { name: 'ไข่เจียว', extraPrice: 15 },
                    ],
                  },
                },
              ],
            },
          },
        }),
        prisma.menuItem.create({
          data: {
            storeId: store.id,
            categoryId: cat.id,
            name: 'ข้าวผัดโบราณ',
            basePrice: 50,
            description: 'ข้าวผัดไข่หอมกระทะ คะน้ากรอบ มะนาวผ่าซีก',
            imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
          },
        }),
      ]);

      result = { user, store };
    } catch (provisionErr) {
      if (store) {
        await prisma.store.delete({ where: { id: store.id } }).catch(() => {});
      }
      throw provisionErr;
    }

    // Create session token
    const token = await createSessionToken({
      id: result.user.id,
      email: result.user.email,
      phone: result.user.phone,
      name: result.user.name,
      role: 'STORE_OWNER',
      storeId: result.store.id,
      storeSlug: result.store.slug,
      storeName: result.store.name,
      storeStatus: result.store.status,
      subscriptionEnd: result.store.subscriptionEnd.toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        phone: result.user.phone,
        name: result.user.name,
        role: 'STORE_OWNER',
        storeSlug: result.store.slug,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Error in registration:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
      { status: 500 }
    );
  }
}
