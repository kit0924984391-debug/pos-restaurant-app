import { describe, it, expect, vi } from 'vitest';
import { cleanPhoneNumber, formatPhoneNumber, isValidThaiMobile } from '@/lib/sms';

describe('Phone Number Utilities', () => {
  it('cleanPhoneNumber should strip non-digits and normalize +66', () => {
    expect(cleanPhoneNumber('081-234-5678')).toBe('0812345678');
    expect(cleanPhoneNumber('+66812345678')).toBe('0812345678');
    expect(cleanPhoneNumber('66812345678')).toBe('0812345678');
    expect(cleanPhoneNumber('081 234 5678')).toBe('0812345678');
    expect(cleanPhoneNumber('')).toBe('');
  });

  it('formatPhoneNumber should format standard 10-digit mobile number', () => {
    expect(formatPhoneNumber('0812345678')).toBe('081-234-5678');
    expect(formatPhoneNumber('0891234567')).toBe('089-123-4567');
  });

  it('isValidThaiMobile should identify valid and invalid Thai mobile numbers', () => {
    // Valid mobile prefixes in Thailand: 06, 08, 09 (10 digits)
    expect(isValidThaiMobile('0812345678')).toBe(true);
    expect(isValidThaiMobile('081-234-5678')).toBe(true);
    expect(isValidThaiMobile('+66812345678')).toBe(true);
    expect(isValidThaiMobile('0951234567')).toBe(true);
    expect(isValidThaiMobile('0612345678')).toBe(true);

    // Invalid numbers
    expect(isValidThaiMobile('021234567')).toBe(false); // Bangkok landline
    expect(isValidThaiMobile('053123456')).toBe(false); // Provincial landline
    expect(isValidThaiMobile('12345')).toBe(false); // Too short
    expect(isValidThaiMobile('0712345678')).toBe(false); // Invalid prefix
    expect(isValidThaiMobile('')).toBe(false);
  });
});

describe('Mobile Login Identifier Resolution', () => {
  it('correctly matches clean mobile number from formatted input', () => {
    const rawInput = '081-234-5678';
    const clean = cleanPhoneNumber(rawInput);
    expect(clean).toBe('0812345678');
    expect(clean.length).toBe(10);
  });

  it('correctly differentiates email from mobile number', () => {
    const emailInput = 'admin@ordeopos.com';
    const phoneInput = '081-234-5678';

    expect(emailInput.includes('@')).toBe(true);
    expect(phoneInput.includes('@')).toBe(false);
    expect(isValidThaiMobile(cleanPhoneNumber(phoneInput))).toBe(true);
  });
});
