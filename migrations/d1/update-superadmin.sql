-- Ensure phone conflict is avoided
UPDATE "User" SET "phone" = NULL WHERE "phone" IN ('0925470359', '092-547-0359');

-- Upsert Super Admin with user-requested credentials
INSERT INTO "User" (
    "id",
    "email",
    "passwordHash",
    "name",
    "phone",
    "role",
    "createdAt",
    "updatedAt"
) VALUES (
    'admin_super_main',
    'kitsada0359@gmail.com',
    '$2b$06$XP7ipjTsGlPXxnZu/rB75OnJdkWC1Aq4ca09z6MlOTsT4PiDE9AGG',
    'ผู้ดูแลระบบสูงสุด (Super Admin)',
    '0925470359',
    'SUPER_ADMIN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT("email") DO UPDATE SET
    "passwordHash" = '$2b$06$XP7ipjTsGlPXxnZu/rB75OnJdkWC1Aq4ca09z6MlOTsT4PiDE9AGG',
    "phone" = '0925470359',
    "role" = 'SUPER_ADMIN',
    "name" = 'ผู้ดูแลระบบสูงสุด (Super Admin)',
    "updatedAt" = CURRENT_TIMESTAMP;

-- Also update existing admin users to match credentials if kept as backup
UPDATE "User"
SET "passwordHash" = '$2b$06$XP7ipjTsGlPXxnZu/rB75OnJdkWC1Aq4ca09z6MlOTsT4PiDE9AGG'
WHERE "role" = 'SUPER_ADMIN';
