UPDATE "User" SET "passwordHash" = '$2b$06$WFow4Co6V4TWoW3sK2AwQ.4O93NIX273SVGnn1c1bBa6ZcZTgU/CW' WHERE email IN ('admin@ordeopos.com', 'owner@lungpa.com', 'kitsada1984@gmail.com');
UPDATE "User" SET "phone" = '081-234-5678' WHERE email = 'admin@ordeopos.com';
UPDATE "User" SET "phone" = '089-123-4567' WHERE email = 'owner@lungpa.com';
