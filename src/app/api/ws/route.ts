import { getWebSocketManager } from '@/lib/websocket/server';
import { parseWebSocketMessage, createWebSocketMessage } from '@/lib/websocket/protocol';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isWsUpgrade =
    request.headers.get('Upgrade')?.toLowerCase() === 'websocket' ||
    request.headers.get('connection')?.toLowerCase().includes('upgrade');

  // Cloudflare Workers Native WebSocketPair handling
  if (isWsUpgrade && typeof (globalThis as any).WebSocketPair !== 'undefined') {
    const pair = new (globalThis as any).WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    server.accept();

    const manager = getWebSocketManager();
    const connId = `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = url.searchParams.get('userId') || undefined;
    const roomId = url.searchParams.get('roomId') || undefined;

    const connectionAdapter = {
      id: connId,
      userId,
      rooms: new Set<string>(),
      send: (data: any) => {
        try {
          server.send(typeof data === 'string' ? data : JSON.stringify(data));
        } catch {}
      },
      close: () => {
        try {
          server.close();
        } catch {}
      },
    };

    manager.registerClient(connectionAdapter);

    if (roomId) {
      manager.joinRoom(connId, roomId);
    }

    server.addEventListener('message', async (event: any) => {
      await manager.handleMessage(connId, event.data);
    });

    server.addEventListener('close', () => {
      manager.unregisterClient(connId);
    });

    server.addEventListener('error', () => {
      manager.unregisterClient(connId);
    });

    return new Response(null, {
      status: 101,
      // @ts-expect-error Cloudflare Workers specific response property
      webSocket: client,
    });
  }

  // Non-upgrade HTTP GET request: returns overview and available endpoints
  const manager = getWebSocketManager();
  return Response.json({
    status: 'online',
    protocol: 'RFC-6455',
    endpoints: {
      stats: '/api/ws/stats',
      health: '/api/ws/health',
      streamFallback: '/api/r/[slug]/stream',
    },
    currentStats: manager.getStats(),
  });
}
