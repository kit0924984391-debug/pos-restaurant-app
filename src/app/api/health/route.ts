import { NextResponse } from 'next/server';
import { getHealthChecker } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checker = getHealthChecker();
  const deepHealth = await checker.getDeepHealth();

  const httpStatus = deepHealth.healthy ? 200 : 503;

  return NextResponse.json(deepHealth, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
