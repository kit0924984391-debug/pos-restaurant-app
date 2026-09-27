const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const backupFile = path.join(__dirname, '../backups/db-backup-2026-09-22T11-17-28-585Z.json');

async function restore() {
  console.log('--- Starting 100% Database Restore from:', path.basename(backupFile), '---');

  if (!fs.existsSync(backupFile)) {
    throw new Error('Backup file not found: ' + backupFile);
  }

  const raw = fs.readFileSync(backupFile, 'utf8');
  const backupData = JSON.parse(raw);

  const client = new Client({
    connectionString: 'postgresql://postgres.koutohveoioovtlylphm:11072526%23Kit@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL database.');

  // Step 1: Pre-restore Safety Backup
  console.log('\n--- Step 1: Creating Pre-Restore Safety Backup ---');
  const preBackup = {
    metadata: {
      exportedAt: new Date().toISOString(),
      note: 'Pre-restore backup before restoring db-backup-2026-09-22T11-17-28-585Z.json'
    }
  };
  const tableList = [
    'OrderItem', 'Order', 'LoyaltyReward', 'Promotion', 'CustomerMember',
    'StockLog', 'MenuItemRecipe', 'Ingredient', 'MenuOptionChoice',
    'MenuOptionGroup', 'MenuItem', 'Category', 'Table', 'User',
    'Store', 'PlatformSetting', 'SubscriptionHistory', 'Plan', 'BankNotificationLog'
  ];

  for (const tbl of tableList) {
    const res = await client.query(`SELECT * FROM pos_restaurant."${tbl}"`);
    preBackup[tbl] = res.rows;
  }
  const preBackupPath = path.join(__dirname, '../backups/db-backup-pre-restore-2026-09-27.json');
  fs.writeFileSync(preBackupPath, JSON.stringify(preBackup, null, 2), 'utf8');
  console.log('✅ Safety backup saved to:', preBackupPath);

  // Step 2: Delete existing data in reverse order
  console.log('\n--- Step 2: Clearing Existing Database Records ---');
  for (const tbl of tableList) {
    process.stdout.write(`Truncating/deleting ${tbl}... `);
    try {
      await client.query(`DELETE FROM pos_restaurant."${tbl}"`);
      console.log('OK');
    } catch (err) {
      console.log('Error:', err.message);
    }
  }

  // Step 3: Insert data from backup in forward order
  console.log('\n--- Step 3: Inserting Data from Backup ---');

  const tableMapping = [
    { key: 'plans', table: 'Plan' },
    { key: 'platformSettings', table: 'PlatformSetting' },
    { key: 'stores', table: 'Store' },
    { key: 'users', table: 'User' },
    { key: 'tables', table: 'Table' },
    { key: 'categories', table: 'Category' },
    { key: 'menuItems', table: 'MenuItem' },
    { key: 'menuOptionGroups', table: 'MenuOptionGroup' },
    { key: 'menuOptionChoices', table: 'MenuOptionChoice' },
    { key: 'ingredients', table: 'Ingredient' },
    { key: 'menuItemRecipes', table: 'MenuItemRecipe' },
    { key: 'stockLogs', table: 'StockLog' },
    { key: 'customerMembers', table: 'CustomerMember' },
    { key: 'promotions', table: 'Promotion' },
    { key: 'loyaltyRewards', table: 'LoyaltyReward' },
    { key: 'orders', table: 'Order' },
    { key: 'orderItems', table: 'OrderItem' },
    { key: 'subscriptionHistories', table: 'SubscriptionHistory' },
    { key: 'bankNotificationLogs', table: 'BankNotificationLog' },
  ];

  for (const { key, table } of tableMapping) {
    const records = backupData[key] || [];
    if (records.length === 0) {
      console.log(`Skipping ${table} (0 records)`);
      continue;
    }

    process.stdout.write(`Inserting ${records.length} records into ${table}... `);
    for (const record of records) {
      const keys = Object.keys(record);
      const cols = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = keys.map(k => {
        let val = record[k];
        // Handle JSON fields if needed
        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
          return JSON.stringify(val);
        }
        return val;
      });

      const sql = `INSERT INTO pos_restaurant."${table}" (${cols}) VALUES (${placeholders})`;
      try {
        await client.query(sql, values);
      } catch (err) {
        console.error(`\nFailed to insert row in ${table}:`, err.message);
        throw err;
      }
    }
    console.log('DONE ✅');
  }

  // Step 4: Ensure admin@ordeopos.com exists for the quick demo button
  console.log('\n--- Step 4: Ensuring Super Admin accounts ---');
  const demoAdminEmail = 'admin@ordeopos.com';
  const demoAdminPass = 'adminpassword123';
  const demoHash = await bcrypt.hash(demoAdminPass, 10);

  const existingDemo = await client.query(
    'SELECT id FROM pos_restaurant."User" WHERE email = $1',
    [demoAdminEmail]
  );
  if (existingDemo.rows.length === 0) {
    const demoId = 'admin_demo_' + Math.random().toString(36).substring(2, 9);
    await client.query(
      `INSERT INTO pos_restaurant."User" (id, email, "passwordHash", name, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [demoId, demoAdminEmail, demoHash, 'Super Admin (ORDEO)', 'SUPER_ADMIN']
    );
    console.log('✅ Demo Super Admin added:', demoAdminEmail);
  }

  // Step 5: Verify restored record counts
  console.log('\n--- Step 5: Verifying Restored Database Statistics ---');
  for (const { table } of tableMapping) {
    const res = await client.query(`SELECT count(*) FROM pos_restaurant."${table}"`);
    console.log(`${table}: ${res.rows[0].count} records`);
  }

  await client.end();
  console.log('\n🎉 DATABASE 100% RESTORED SUCCESSFULLY! 🎉');
}

restore().catch((err) => {
  console.error('\n❌ RESTORE FAILED:', err);
  process.exit(1);
});
