-- Add bank account fields to Store
ALTER TABLE "Store" ADD COLUMN "bankName" TEXT DEFAULT '';
ALTER TABLE "Store" ADD COLUMN "bankAccountNo" TEXT DEFAULT '';
ALTER TABLE "Store" ADD COLUMN "bankAccountName" TEXT DEFAULT '';

-- Create StoreTrialAudit for permanent anti-abuse verification
CREATE TABLE IF NOT EXISTS "StoreTrialAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "bankAccountNo" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "storeName" TEXT,
    "storeId" TEXT,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "StoreTrialAudit_phone_idx" ON "StoreTrialAudit"("phone");
CREATE INDEX IF NOT EXISTS "StoreTrialAudit_bankAccountNo_idx" ON "StoreTrialAudit"("bankAccountNo");
