import crypto from 'crypto';

/**
 * Sorts object keys recursively to ensure deterministic serialization
 */
export function canonicalizeJson(value: any): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalizeJson(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(value).sort();
  const pairs = sortedKeys.map((key) => {
    return JSON.stringify(key) + ':' + canonicalizeJson(value[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Computes a deterministic SHA-256 hash of any payload
 */
export function hashPayload(payload: any): string {
  if (payload === undefined || payload === null) {
    return 'empty_payload_hash';
  }

  const canonical = typeof payload === 'string' ? payload : canonicalizeJson(payload);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
