CREATE TABLE IF NOT EXISTS "SmsOtp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SmsOtp_phone_idx" ON "SmsOtp"("phone");

CREATE TABLE IF NOT EXISTS "LoginAttempt" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "windowStart" INTEGER NOT NULL,
    "count" INTEGER NOT NULL
);
