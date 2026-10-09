const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const connectionString = process.env.SEED_DB_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ต้องตั้งค่า SEED_DB_URL (หรือ DATABASE_URL) ก่อนรันสคริปต์นี้');
    process.exit(1);
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: true }
  });

  await client.connect();
  console.log('Connected to database.');

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@ordeopos.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ต้องตั้งค่า SEED_ADMIN_PASSWORD (ไม่เก็บรหัสจริงไว้ในโค้ด) ก่อนรันสคริปต์นี้');
    process.exit(1);
  }
  const hash = await bcrypt.hash(adminPassword, 10);

  const existing = await client.query(
    'SELECT id, email, role FROM pos_restaurant."User" WHERE email = $1',
    [adminEmail]
  );

  if (existing.rows.length > 0) {
    console.log('Updating existing admin user password...');
    await client.query(
      'UPDATE pos_restaurant."User" SET "passwordHash" = $1, role = $2, "updatedAt" = NOW() WHERE email = $3',
      [hash, 'SUPER_ADMIN', adminEmail]
    );
    console.log('Admin user updated successfully.');
  } else {
    console.log('Inserting new admin user...');
    const id = 'admin_' + Math.random().toString(36).substring(2, 11);
    await client.query(
      `INSERT INTO pos_restaurant."User" (id, email, "passwordHash", name, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [id, adminEmail, hash, 'Super Admin (ORDEO)', 'SUPER_ADMIN']
    );
    console.log('Admin user created successfully with ID:', id);
  }

  // Also verify owner@lungpa.com
  const ownerEmail = 'owner@lungpa.com';
  const ownerPass = 'password123';
  const ownerHash = await bcrypt.hash(ownerPass, 10);
  await client.query(
    'UPDATE pos_restaurant."User" SET "passwordHash" = $1 WHERE email = $2',
    [ownerHash, ownerEmail]
  );
  console.log('Owner@lungpa.com password verified/updated.');

  const res = await client.query('SELECT id, email, name, role, "storeId" FROM pos_restaurant."User"');
  console.log('Current users:', res.rows);

  await client.end();
}

seedAdmin().catch(console.error);
