import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;

// Helper to load .env variables manually in ES modules
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  });
  return env;
}

async function run() {
  const env = loadEnv();
  
  // Try DATABASE_URL first, then SUPABASE_DB_PASSWORD, then fallback
  const rawPassword = process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;
  const rawDatabaseUrl = process.argv[2] || process.env.DATABASE_URL || env.DATABASE_URL;

  let client;

  if (rawDatabaseUrl) {
    client = new Client({
      connectionString: rawDatabaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
  } else if (rawPassword) {
    // Avoid URL parsing errors with special characters by passing parameters explicitly
    client = new Client({
      host: 'db.esetdrtkuduprymgskgg.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: rawPassword,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  if (!client) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Migration Error: Database connection details not found.');
    console.log('\nPlease configure your .env file with either:');
    console.log('1. A full connection string:');
    console.log('   DATABASE_URL="postgres://postgres:[password]@db.esetdrtkuduprymgskgg.supabase.co:5432/postgres"\n');
    console.log('2. Or your database password directly:');
    console.log('   SUPABASE_DB_PASSWORD="your-database-password"\n');
    process.exit(1);
  }

  console.log('⚡ \x1b[36m%s\x1b[0m', 'Connecting to Supabase PostgreSQL database...');

  try {
    await client.connect();
    console.log('✅ \x1b[32m%s\x1b[0m', 'Database connection established successfully.');

    // Step 1: Create table if it doesn't exist
    console.log('\n🔧 \x1b[33m%s\x1b[0m', 'Step 1: Ensuring "public.job_applications" table exists...');
    await client.query(`
      create table if not exists public.job_applications (
        "id" text primary key,
        "companyName" text not null,
        "targetRole" text not null,
        "workModel" text not null,
        "location" text,
        "salaryRange" text,
        "otherBenefits" text,
        "hrContact" text,
        "appliedVia" text not null,
        "resumeLink" text,
        "portfolioLink" text,
        "keyJdRequirements" text,
        "jdUrl" text,
        "jdText" text,
        "priority" text,
        "currentStatus" text not null,
        "phases" jsonb not null default '[]'::jsonb,
        "postMortem" jsonb not null default '{}'::jsonb,
        "createdAt" text not null,
        "userId" text
      );
    `);
    console.log('   - Table created or verified successfully.');

    // Step 2: Ensure userId column exists
    console.log('🔧 \x1b[33m%s\x1b[0m', 'Step 2: Checking and appending "userId" column...');
    await client.query(`
      alter table public.job_applications add column if not exists "userId" text;
    `);
    console.log('   - Column "userId" verified successfully.');

    // Step 3: Ensure pipeline columns exist (added with the JD-first form revamp)
    console.log('🔧 \x1b[33m%s\x1b[0m', 'Step 3: Checking and appending pipeline columns...');
    await client.query(`
      alter table public.job_applications add column if not exists "jdUrl" text;
      alter table public.job_applications add column if not exists "jdText" text;
      alter table public.job_applications add column if not exists "priority" text;
    `);
    console.log('   - Columns "jdUrl", "jdText", "priority" verified successfully.');

    // Step 4: Disable Row Level Security (RLS) for simple integration
    console.log('🔧 \x1b[33m%s\x1b[0m', 'Step 4: Disabling Row Level Security (RLS)...');
    await client.query(`
      alter table public.job_applications disable row level security;
    `);
    console.log('   - Row Level Security disabled successfully.');

    console.log('\n🎉 \x1b[32m%s\x1b[0m', 'Supabase Database Migration completed successfully!');
  } catch (err) {
    console.error('\n❌ \x1b[31m%s\x1b[0m', 'Database Migration failed!');
    console.error(err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
