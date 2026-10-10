-- Migration: 0004_password_reset_token.sql
-- Description: Add email to StoreTrialAudit and create PasswordResetToken table

ALTER TABLE StoreTrialAudit ADD COLUMN email TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS StoreTrialAudit_email_idx ON StoreTrialAudit(email);

CREATE TABLE IF NOT EXISTS PasswordResetToken (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  email TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS PasswordResetToken_token_idx ON PasswordResetToken(token);
CREATE INDEX IF NOT EXISTS PasswordResetToken_userId_idx ON PasswordResetToken(userId);
CREATE INDEX IF NOT EXISTS PasswordResetToken_email_idx ON PasswordResetToken(email);
