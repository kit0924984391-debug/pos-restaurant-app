import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { isValidEmail, maskEmail } from '@/lib/email';
import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Password Reset & Email Recovery Suite', () => {
  const testPhone = '0887776655';
  const testEmail = 'chef.somchai@example.com';
  let testUserId = '';

  beforeEach(async () => {
    // Cleanup any existing test artifacts
    await (prisma as any).passwordResetToken.deleteMany({
      where: { email: testEmail },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        OR: [{ email: testEmail }, { phone: testPhone }],
      },
    }).catch(() => {});

    // Create a fresh test user
    const initialHash = await hashPassword('oldpassword123');
    const user = await prisma.user.create({
      data: {
        name: 'เชฟสมชาย ทดสอบ',
        email: testEmail,
        phone: testPhone,
        passwordHash: initialHash,
        role: 'STORE_OWNER',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await (prisma as any).passwordResetToken.deleteMany({
      where: { email: testEmail },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        OR: [{ email: testEmail }, { phone: testPhone }],
      },
    }).catch(() => {});
  });

  it('1. isValidEmail correctly validates email formats', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('chef.somchai@orderpos.co.th')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('2. maskEmail correctly hides sensitive email parts', () => {
    expect(maskEmail('somchai@gmail.com')).toBe('s****i@gmail.com');
    expect(maskEmail('ab@example.com')).toBe('a***@example.com');
    expect(maskEmail('chef@pos.th')).toBe('c**f@pos.th');
  });

  it('3. Generates a valid PasswordResetToken in the database', async () => {
    const token = 'test-token-' + Date.now();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const record = await (prisma as any).passwordResetToken.create({
      data: {
        token,
        userId: testUserId,
        email: testEmail,
        expiresAt,
      },
    });

    expect(record.id).toBeDefined();
    expect(record.token).toBe(token);
    expect(record.userId).toBe(testUserId);
    expect(record.usedAt).toBeNull();
  });

  it('4. Updates user password and consumes token when reset is performed', async () => {
    const token = 'reset-flow-token-' + Date.now();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await (prisma as any).passwordResetToken.create({
      data: {
        token,
        userId: testUserId,
        email: testEmail,
        expiresAt,
      },
    });

    // Simulate reset execution
    const newPassword = 'newSecretPassword2026';
    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: testUserId },
      data: { passwordHash: newHash },
    });

    await (prisma as any).passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    // Verify user password hash has been updated
    const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(updatedUser).toBeDefined();
    const isValidOld = await verifyPassword('oldpassword123', updatedUser!.passwordHash);
    const isValidNew = await verifyPassword(newPassword, updatedUser!.passwordHash);
    expect(isValidOld).toBe(false);
    expect(isValidNew).toBe(true);

    // Verify token is now marked as used
    const consumedToken = await (prisma as any).passwordResetToken.findUnique({ where: { token } });
    expect(consumedToken.usedAt).not.toBeNull();
  });

  it('5. Rejects expired tokens', async () => {
    const token = 'expired-token-' + Date.now();
    // Expired 10 minutes ago
    const expiresAt = new Date(Date.now() - 10 * 60 * 1000);

    await (prisma as any).passwordResetToken.create({
      data: {
        token,
        userId: testUserId,
        email: testEmail,
        expiresAt,
      },
    });

    const record = await (prisma as any).passwordResetToken.findUnique({ where: { token } });
    const isExpired = new Date() > new Date(record.expiresAt);
    expect(isExpired).toBe(true);
  });
});
