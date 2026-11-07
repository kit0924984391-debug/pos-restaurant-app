const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /cookie/i,
  /credit[-_]?card/i,
  /cvv/i,
  /api[-_]?key/i,
  /jwt/i,
  /prompt[-_]?pay[-_]?id/i,
  /bank[-_]?account/i,
  /private[-_]?key/i,
];

/**
 * Mask email address: test@example.com -> te***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return email;
  return email.replace(/(.{2})[^@]*(@.*)/, '$1***$2');
}

/**
 * Mask Thai mobile phone number: 0899998877 -> 089-***-8877
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-***-${digits.slice(5)}`;
  }
  return phone.replace(/(\d{2,3})\d{4,}(\d{2,4})/, '$1-***-$2');
}

/**
 * Deep sanitization of objects to prevent PII and credential exposure in logs
 */
export function sanitizeLogData<T = any>(data: T, seen = new WeakSet()): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Primitives
  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      // Check if string looks like an email
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
        return maskEmail(data) as unknown as T;
      }
      // Check if string looks like a 10-digit mobile phone
      if (/^0[689]\d{8}$/.test(data)) {
        return maskPhone(data) as unknown as T;
      }
    }
    return data;
  }

  // Prevent circular references
  if (seen.has(data as object)) {
    return '[CIRCULAR]' as unknown as T;
  }
  seen.add(data as object);

  // Array handling
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, seen)) as unknown as T;
  }

  // Special object types
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: process.env.NODE_ENV !== 'production' ? data.stack : undefined,
    } as unknown as T;
  }

  if (data instanceof Date) {
    return data.toISOString() as unknown as T;
  }

  // Object keys sanitization
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

    if (isSensitive) {
      result[key] = '[REDACTED]';
      continue;
    }

    if (key.toLowerCase().includes('email') && typeof value === 'string') {
      result[key] = maskEmail(value);
      continue;
    }

    if (
      (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) &&
      typeof value === 'string'
    ) {
      result[key] = maskPhone(value);
      continue;
    }

    result[key] = sanitizeLogData(value, seen);
  }

  return result as T;
}
