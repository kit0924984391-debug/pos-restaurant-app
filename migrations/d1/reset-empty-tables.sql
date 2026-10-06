-- Reset Table 1 (and any table with 0 unpaid active orders) to AVAILABLE
UPDATE "Table"
SET "status" = 'AVAILABLE', "currentSessionId" = NULL
WHERE "id" IN (
    SELECT t.id
    FROM "Table" t
    LEFT JOIN "Order" o ON o.tableId = t.id AND o.paymentStatus IN ('UNPAID', 'PENDING_CONFIRMATION') AND o.status NOT IN ('CANCELLED', 'COMPLETED')
    GROUP BY t.id
    HAVING COUNT(o.id) = 0
);
