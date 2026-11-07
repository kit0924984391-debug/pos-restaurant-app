export type IdempotencyStatus = 'processing' | 'completed' | 'failed';

export interface IdempotencyRecord {
  key: string;
  storeId?: string;
  payloadHash: string;
  status: IdempotencyStatus | number; // 102 (processing), 200/201 (completed), 400/500 (failed)
  responseStatus?: number;
  body?: string;
  responseBody?: any;
  createdAt: number;
  expiresAt?: number;
}

export interface IdempotentExecutionResult<T = any> {
  data: T;
  statusCode: number;
  isReplay: boolean;
  key?: string;
}

export interface IdempotentOptions<T = any> {
  key?: string | null;
  storeId?: string;
  payload?: any;
  ttlSeconds?: number;
  operation: () => Promise<{ data: T; status?: number } | T>;
}
