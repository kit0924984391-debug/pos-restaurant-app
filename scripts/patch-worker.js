const fs = require('fs');
const path = require('path');

const workerPath = path.resolve(__dirname, '../.open-next/worker.js');
if (!fs.existsSync(workerPath)) {
  console.error('.open-next/worker.js not found!');
  process.exit(1);
}

let code = fs.readFileSync(workerPath, 'utf8');

// Check if RealtimeHub is already present
if (!code.includes('class RealtimeHub')) {
  const realtimeHubCode = `
import { DurableObject } from 'cloudflare:workers';

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
        encoder.encode(\`event: connected\\ndata: \${JSON.stringify({ timestamp: Date.now() })}\\n\\n\`)
      );
      const ping = setInterval(() => {
        try {
          writer.write(encoder.encode(\`: ping\\n\\n\`));
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
      const standard = \`event: message\\ndata: \${JSON.stringify(payload)}\\n\\n\`;
      const named = payload?.type
        ? \`event: \${payload.type}\\ndata: \${JSON.stringify(payload.data)}\\n\\n\`
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
`;
  code = realtimeHubCode + '\n' + code;
  fs.writeFileSync(workerPath, code, 'utf8');
  console.log('Successfully patched .open-next/worker.js with RealtimeHub!');
} else {
  console.log('.open-next/worker.js already contains RealtimeHub');
}
