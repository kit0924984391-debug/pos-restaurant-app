import { NextResponse } from 'next/server';
import { cleanupExpiredIdempotencyKeys } from '@/lib/idempotency';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ttlParam = searchParams.get('ttl');
    const ttlSeconds = ttlParam ? parseInt(ttlParam, 10) : 86400;

    const result = await cleanupExpiredIdempotencyKeys(ttlSeconds);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.purgedCount} expired idempotency keys`,
      result,
    });
  } catch (error: any) {
    console.error('[Cron:CleanupIdempotency] Failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Cleanup job failed' },
      { status: 500 }
    );
  }
}
