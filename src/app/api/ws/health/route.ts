import { NextResponse } from 'next/server';
import { getWebSocketManager } from '@/lib/websocket/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const manager = getWebSocketManager();
  const health = manager.getHealth();

  return NextResponse.json(
    {
      ...health,
      memoryUsage: typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : null,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
