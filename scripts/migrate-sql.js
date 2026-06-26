// Apply a single .sql migration file to the Supabase Postgres over the IPv4
// pooler (the direct host is IPv6-only — see DATABASE_URL in .env).
// Usage: node scripts/migrate-sql.js <path-to.sql>
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!m) continue;
    let v = m[2] || '';
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v.trim();
  }
  return env;
}

async function run() {
  const env = loadEnv();
  const file = process.argv[2];
  if (!file) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Usage: node scripts/migrate-sql.js <path-to.sql>');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;
  if (!connectionString) {
    console.error('\x1b[31m%s\x1b[0m', '❌ DATABASE_URL not found in environment or .env');
    process.exit(1);
  }

  const sqlPath = path.resolve(process.cwd(), file);
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  console.log('⚡ \x1b[36m%s\x1b[0m', `Applying ${path.basename(sqlPath)} …`);

  try {
    await client.connect();
    await client.query(sql); // simple-query protocol runs all statements in the file
    console.log('🎉 \x1b[32m%s\x1b[0m', 'Migration applied successfully.');
  } catch (err) {
    console.error('\n❌ \x1b[31m%s\x1b[0m', 'Migration failed!');
    console.error(err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
