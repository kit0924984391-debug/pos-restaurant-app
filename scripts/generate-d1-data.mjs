// One-off migration: generate D1 INSERT statements from the Supabase JSON backup.
// Usage: node scripts/generate-d1-data.mjs <backup.json> <output.sql>
import fs from 'node:fs';

const [backupPath, outPath] = process.argv.slice(2);
if (!backupPath || !outPath) {
  console.error('usage: node scripts/generate-d1-data.mjs <backup.json> <output.sql>');
  process.exit(1);
}

// FK-safe order (parents before children)
const ORDER = [
  'Plan',
  'Store',
  'User',
  'PlatformSetting',
  'Category',
  'MenuItem',
  'MenuOptionGroup',
  'MenuOptionChoice',
  'Ingredient',
  'MenuItemRecipe',
  'StockLog',
  'CustomerMember',
  'Promotion',
  'LoyaltyReward',
  'Table',
  'Order',
  'OrderItem',
  'BankNotificationLog',
  'SubscriptionHistory',
  'BoardCategory',
  'BoardThread',
  'BoardComment',
  'BoardReaction',
  'BoardReport',
];

const dump = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

const esc = (v) => String(v).replace(/'/g, "''");

function toSql(col, v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'object' && v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === 'object') {
    // pg returns Date instances for timestamptz via JSON reviver? backup JSON
    // has them as ISO strings already — anything else object-shaped: JSON-stringify
    return `'${esc(JSON.stringify(v))}'`;
  }
  // ISO date-time strings from the JSON backup keep T/Z format
  return `'${esc(v)}'`;
}

const stmts = [];
const counts = {};
for (const table of ORDER) {
  const rows = dump[table] || [];
  counts[table] = rows.length;
  for (const row of rows) {
    const cols = Object.keys(row);
    const values = cols.map((c) => toSql(c, row[c]));
    stmts.push(
      `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`
    );
  }
}

fs.writeFileSync(outPath, '-- Auto-generated from Supabase backup\n' + stmts.join('\n') + '\n');
console.log('statements:', stmts.length);
console.log('rows per table:', JSON.stringify(counts));
