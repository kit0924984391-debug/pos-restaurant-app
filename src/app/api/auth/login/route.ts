import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { cleanPhoneNumber, formatPhoneNumber } from '@/lib/sms';

export const dynamic = 'force-dynamic';

// Brute-force throttle per account. Counters live in D1 (raw SQL via the
// Prisma adapter) so the limit holds across worker isolates, not just within
// one. Window: 8 failed attempts per key locks that account for 10 minutes.
const LOCK_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES_PER_ACCOUNT = 8;

async function getFailedCount(accountKey: string, nowMs: number): Promise<number> {
  const rows: any = await prisma.$queryRaw`
    SELECT count AS c, windowStart AS ws FROM LoginAttempt WHERE key = ${'login:' + accountKey}
  `;
  const row = rows?.[0];
  if (!row) return 0;
  // window expired -> counter restarts
  if (Number(row.ws) < nowMs - LOCK_WINDOW_MS) return 0;
  return Number(row.c) || 0;
}

async function recordFailure(accountKey: string, nowMs: number): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO LoginAttempt (key, windowStart, count)
    VALUES (${'login:' + accountKey}, ${nowMs}, 1)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN windowStart < ${nowMs - LOCK_WINDOW_MS} THEN 1 ELSE count + 1 END,
      windowStart = CASE WHEN windowStart < ${nowMs - LOCK_WINDOW_MS} THEN ${nowMs} ELSE windowStart END
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, identifier, password } = body;
    const loginInput = String(phone || identifier || email || '').trim();

    if (!loginInput || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกเบอร์โทรศัพท์และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const cleanPhone = cleanPhoneNumber(loginInput);
    const formattedPhone = cleanPhone ? formatPhoneNumber(cleanPhone) : '';
    const accountKey = (cleanPhone || loginInput.toLowerCase()).trim();
    const nowMs = Date.now();
    const failedCount = await getFailedCount(accountKey, nowMs);
    if (failedCount >= MAX_FAILURES_PER_ACCOUNT) {
      return NextResponse.json(
        { error: 'ล็อกอินไม่สำเร็จหลายครั้ง บัญชีนี้ถูกระงับชั่วคราว 10 นาที' },
        { status: 429 }
      );
    }

    // Search by phone (cleaned, formatted, or raw with dashes) OR by email
    const searchConditions: any[] = [
      { email: loginInput.toLowerCase() },
    ];
    if (cleanPhone) {
      searchConditions.push({ phone: cleanPhone });
      searchConditions.push({ phone: loginInput });
      if (formattedPhone) {
        searchConditions.push({ phone: formattedPhone });
      }
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: searchConditions,
      },
      include: { store: true },
    });

    if (!user) {
      await recordFailure(accountKey, nowMs);
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบเบอร์โทรศัพท์หรือรหัสผ่าน' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await recordFailure(accountKey, nowMs);
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    await prisma
      .$executeRaw`DELETE FROM LoginAttempt WHERE key = ${'login:' + accountKey}`
      .catch(() => {});

    // Check store status if user is store owner/staff
    if (user.role !== 'SUPER_ADMIN' && user.store) {
      if (user.store.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'ร้านของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' },
          { status: 403 }
        );
      }
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role as any,
      storeId: user.storeId,
      storeSlug: user.store?.slug,
      storeName: user.store?.name,
      storeStatus: user.store?.status,
      subscriptionEnd: user.store?.subscriptionEnd?.toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        storeSlug: user.store?.slug,
        storeName: user.store?.name,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
