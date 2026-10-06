import { DurableObject } from 'cloudflare:workers';
import worker from './.open-next/worker.js';

// RealtimeHub — one Durable Object instance per store (idFromName(storeId)).
// Holds every SSE writer for that store and fans out events to all of them,
// so POS/Kitchen/customer screens get realtime updates even when their
// requests land on different worker isolates. Storage-free broadcast hub.
export class RealtimeHub extends DurableObject {
  writers;

  constructor(state, env) {
    super(state, env);
    this.writers = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/connect') {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      this.writers.add(writer);

      const cleanup = () => {
        this.writers.delete(writer);
        try {
          writer.close();
        } catch {}
      };
      request.signal?.addEventListener?.('abort', cleanup);

      writer.write(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`)
      );
      const ping = setInterval(() => {
        try {
          writer.write(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
          this.writers.delete(writer);
        }
      }, 15000);

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const payload = await request.json();
      const encoder = new TextEncoder();
      const standard = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
      const named = payload?.type
        ? `event: ${payload.type}\ndata: ${JSON.stringify(payload.data)}\n\n`
        : '';
      for (const writer of [...this.writers]) {
        try {
          writer.write(encoder.encode(standard + named));
        } catch {
          this.writers.delete(writer);
        }
      }
      return new Response('ok');
    }

    return new Response('not found', { status: 404 });
  }
}

// Thin wrapper around the generated OpenNext worker.
// OpenNext/Next serve prerendered HTML with `Cache-Control: s-maxage=31536000,
// stale-while-revalidate=...` (mimicking Vercel, where deployments purge the
// CDN automatically). Cloudflare does not purge caches on deploy, so browsers
// could keep old HTML that references deleted JS chunks (ChunkLoadError ->
// every button dead until a hard refresh). Force browsers to revalidate HTML
// on every load; etags keep unchanged pages cheap (304).
export default {
  async fetch(request, env, ctx) {
    const res = await worker.fetch(request, env, ctx);
    const contentType = res.headers.get('content-type') || '';
    if (res.status < 300 && contentType.includes('text/html')) {
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }
    return res;
  },
};
