-- 1. Board Relations
DELETE FROM BoardReaction WHERE userId IN (
  SELECT id FROM User WHERE storeId IN (SELECT id FROM Store WHERE status = 'PENDING_DELETE')
);
DELETE FROM BoardComment WHERE userId IN (
  SELECT id FROM User WHERE storeId IN (SELECT id FROM Store WHERE status = 'PENDING_DELETE')
);
DELETE FROM BoardReport WHERE reporterId IN (
  SELECT id FROM User WHERE storeId IN (SELECT id FROM Store WHERE status = 'PENDING_DELETE')
);
DELETE FROM BoardThread WHERE userId IN (
  SELECT id FROM User WHERE storeId IN (SELECT id FROM Store WHERE status = 'PENDING_DELETE')
);

-- 2. Orders & Order Items
DELETE FROM OrderItem WHERE orderId IN (
  SELECT id FROM "Order" WHERE storeId IN (
    SELECT id FROM Store WHERE status = 'PENDING_DELETE'
  )
);
DELETE FROM "Order" WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);

-- 3. Recipe & Menu Options
DELETE FROM MenuItemRecipe WHERE menuItemId IN (
  SELECT id FROM MenuItem WHERE storeId IN (SELECT id FROM Store WHERE status = 'PENDING_DELETE')
);
DELETE FROM MenuOptionChoice WHERE optionGroupId IN (
  SELECT id FROM MenuOptionGroup WHERE menuItemId IN (
    SELECT id FROM MenuItem WHERE storeId IN (SELECT id FROM Store WHERE status = 'PENDING_DELETE')
  )
);
DELETE FROM MenuOptionGroup WHERE menuItemId IN (
  SELECT id FROM MenuItem WHERE storeId IN (SELECT id FROM Store WHERE status = 'PENDING_DELETE')
);
DELETE FROM MenuItem WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);
DELETE FROM Category WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);

-- 4. Tables
DELETE FROM "Table" WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);

-- 5. Marketing, Loyalty, Inventory, Bank logs
DELETE FROM CustomerMember WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);
DELETE FROM Promotion WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);
DELETE FROM LoyaltyReward WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);
DELETE FROM StockLog WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);
DELETE FROM Ingredient WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);
DELETE FROM BankNotificationLog WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);
DELETE FROM SubscriptionHistory WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);

-- 6. Tokens & Anti-abuse audit
DELETE FROM PasswordResetToken WHERE userId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);
DELETE FROM StoreTrialAudit WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
);

-- 7. Store Users (Keep Super Admin safe)
DELETE FROM User WHERE storeId IN (
  SELECT id FROM Store WHERE status = 'PENDING_DELETE'
) AND role != 'SUPER_ADMIN';

-- 8. Finally: Store
DELETE FROM Store WHERE status = 'PENDING_DELETE';
