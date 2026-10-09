const { Client } = require('pg');

const hosts = [
  'aws-0-ap-northeast-1.pooler.supabase.com',
  'aws-1-ap-northeast-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'db.fyulqejkzuhwppstezko.supabase.co',
];

async function testAll() {
  for (const host of hosts) {
    console.log(`Testing host: ${host}...`);
    const isPooler = host.includes('pooler');
    const user = isPooler ? 'postgres.fyulqejkzuhwppstezko' : 'postgres';
    const client = new Client({
      host,
      port: isPooler ? 6543 : 5432,
      database: 'postgres',
      user,
      password: process.env.SUPABASE_DB_PASSWORD || '',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      const res = await client.query('SELECT current_database(), current_user, version()');
      console.log(`✅ SUCCESS on ${host}:`, res.rows[0]);
      await client.end();
      return { host, user, port: isPooler ? 6543 : 5432 };
    } catch (e) {
      console.log(`❌ FAILED on ${host}:`, e.message);
    }
  }
}

testAll();
