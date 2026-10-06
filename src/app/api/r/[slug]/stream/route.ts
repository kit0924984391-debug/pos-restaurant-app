import { eventBus, EventPayload } from '@/lib/events';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getRealtimeHub(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    return getCloudflareContext()?.env?.REALTIME_HUB;
  } catch {
    return undefined;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const store = await prisma.store.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  });

  if (!store) {
    return new Response('Store not found', { status: 404 });
  }

  // Preferred path: the store's Durable Object hub holds every SSE writer, so
  // events reach all screens no matter which isolate served their requests.
  const hub = getRealtimeHub();
  if (hub) {
    const id = hub.idFromName(store.id);
    const stub = hub.get(id);
    return stub.fetch('https://hub/connect', { signal: request.signal });
  }

  // Fallback (local `next dev` without a DO binding): in-memory emitter.
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection event
  const sendEvent = (event: string, data: any) => {
    try {
      const payload = event === 'message'
        ? `data: ${JSON.stringify(data)}\n\n`
        : `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      writer.write(encoder.encode(payload));
    } catch (e) {
      // client disconnected
    }
  };

  sendEvent('connected', { timestamp: Date.now(), storeId: store.id });

  // Listen to store-scoped events and global events
  const onPosEvent = (payload: EventPayload) => {
    if (!payload.storeId || payload.storeId === store.id) {
      // 1. Send standard message event so eventSource.onmessage picks it up with { type, data, storeId }
      sendEvent('message', { type: payload.type, data: payload.data, storeId: payload.storeId });
      // 2. Also send named event for addEventListener listeners
      if (payload.type) {
        sendEvent(payload.type, payload.data);
      }
    }
  };

  eventBus.on('pos-event', onPosEvent);

  // Keep-alive heartbeat every 15s
  const interval = setInterval(() => {
    sendEvent('ping', { timestamp: Date.now() });
  }, 15000);

  // Auto-close gracefully at 25s so serverless function never hangs or burns GB-hours
  const autoCloseTimeout = setTimeout(() => {
    sendEvent('reconnect', { timestamp: Date.now() });
    clearInterval(interval);
    eventBus.off('pos-event', onPosEvent);
    writer.close().catch(() => {});
  }, 25000);

  request.signal.addEventListener('abort', () => {
    clearTimeout(autoCloseTimeout);
    clearInterval(interval);
    eventBus.off('pos-event', onPosEvent);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
