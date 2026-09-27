const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const client = new Client({
    connectionString: 'postgresql://postgres.koutohveoioovtlylphm:11072526%23Kit@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to database.');

  const adminEmail = 'admin@ordeopos.com';
  const adminPassword = 'adminpassword123';
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
