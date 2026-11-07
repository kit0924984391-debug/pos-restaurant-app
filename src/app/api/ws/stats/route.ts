import { NextResponse } from 'next/server';
import { getWebSocketManager } from '@/lib/websocket/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const manager = getWebSocketManager();
  const stats = manager.getStats();

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
