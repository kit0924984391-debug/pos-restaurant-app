import { NextResponse } from 'next/server';
import { executeIdempotent } from './executor';

import { IIdempotencyStore } from './store';

export interface WithIdempotencyOptions {
  storeId?: string;
  ttlSeconds?: number;
  customStore?: IIdempotencyStore;
}

/**
 * Route Handler wrapper providing automatic Idempotency-Key processing
 */
export function withIdempotency<T extends (...args: any[]) => Promise<Response | NextResponse>>(
  handler: T,
  options: WithIdempotencyOptions = {}
): (...args: Parameters<T>) => Promise<Response | NextResponse> {
  return async (...args: Parameters<T>): Promise<Response | NextResponse> => {
    const request = args[0] instanceof Request ? (args[0] as Request) : undefined;
    if (!request) {
      return handler(...args);
    }

    const key =
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key') ||
      undefined;

    if (!key) {
      return handler(...args);
    }

    let payload: any = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const cloned = request.clone();
        payload = await cloned.json();
      } catch {
        // Not a JSON payload, proceed without payload hashing
      }
    }

    try {
      const result = await executeIdempotent(
        {
          key,
          storeId: options.storeId,
          payload,
          ttlSeconds: options.ttlSeconds,
          operation: async () => {
            const response = await handler(...args);
            let responseData: any = null;
            try {
              const resCloned = response.clone();
              responseData = await resCloned.json();
            } catch {
              responseData = null;
            }
            return { data: responseData, status: response.status };
          },
        },
        options.customStore
      );

      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Idempotent-Key': key,
        'X-Idempotent-Replay': result.isReplay ? 'true' : 'false',
      };

      return NextResponse.json(result.data, {
        status: result.statusCode,
        headers: responseHeaders,
      });
    } catch (err: any) {
      if (err?.code === 'idempotency_key_reused') {
        return NextResponse.json(
          { error: err.message, code: 'idempotency_key_reused' },
          { status: 409 }
        );
      }
      if (err?.code === 'request_in_progress') {
        return NextResponse.json(
          { error: err.message, code: 'request_in_progress' },
          { status: 409 }
        );
      }
      throw err;
    }
  };
}
