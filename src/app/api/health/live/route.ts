import { NextResponse } from 'next/server';
import { getHealthChecker } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checker = getHealthChecker();
  const liveness = checker.getLiveness();

  return NextResponse.json(liveness, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
