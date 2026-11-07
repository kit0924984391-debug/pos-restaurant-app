import { NextResponse } from 'next/server';
import { getHealthChecker } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checker = getHealthChecker();
  const readiness = await checker.getReadiness();

  const httpStatus = readiness.healthy ? 200 : 503;

  return NextResponse.json(readiness, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
