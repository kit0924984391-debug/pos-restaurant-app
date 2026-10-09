CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL
);
