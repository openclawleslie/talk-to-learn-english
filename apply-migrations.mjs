#!/usr/bin/env node

/**
 * Interactive Database Migration Script
 *
 * This script helps users apply database migrations by:
 * 1. Guiding them to get a FREE Neon database (if needed)
 * 2. Collecting the DATABASE_URL
 * 3. Creating/updating the .env file
 * 4. Running the migrations
 * 5. Verifying success
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function readEnvFile() {
  try {
    const content = await fs.readFile('.env', 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
    return env;
  } catch (error) {
    return {};
  }
}

async function writeEnvFile(env) {
  const lines = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  await fs.writeFile('.env', lines + '\n', 'utf-8');
}

async function testDatabaseConnection(databaseUrl) {
  console.log('\n🔍 Testing database connection...');

  // Create a temporary config file
  const testConfig = `
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "${databaseUrl}",
  },
});
`;

  try {
    await fs.writeFile('./drizzle.config.test.js', testConfig);

    // Try to introspect the database
    const { stdout, stderr } = await execAsync(
      'npx drizzle-kit introspect --config=./drizzle.config.test.js',
      { env: { ...process.env, PATH: '/opt/homebrew/bin:' + process.env.PATH } }
    );

    await fs.unlink('./drizzle.config.test.js');

    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    await fs.unlink('./drizzle.config.test.js').catch(() => {});
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function applyMigrations() {
  console.log('\n🚀 Applying migrations...\n');

  try {
    const { stdout, stderr } = await execAsync(
      'npm run db:push',
      {
        env: { ...process.env, PATH: '/opt/homebrew/bin:' + process.env.PATH },
        cwd: process.cwd()
      }
    );

    console.log(stdout);
    if (stderr && !stderr.includes('npm run')) {
      console.error(stderr);
    }

    console.log('\n✅ Migrations applied successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    Database Migration Setup - Task Notification Feature  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('This script will help you apply the database migrations for:');
  console.log('  ✓ Add email field to families table');
  console.log('  ✓ Create notification_preferences table');
  console.log('  ✓ Create task_notifications table\n');

  // Check if .env exists
  const env = await readEnvFile();

  if (env.DATABASE_URL && env.DATABASE_URL !== '') {
    console.log('✓ Found existing DATABASE_URL in .env file\n');

    const useExisting = await question('Use existing DATABASE_URL? (y/n): ');
    if (useExisting.toLowerCase() === 'y') {
      // Test connection
      const connected = await testDatabaseConnection(env.DATABASE_URL);
      if (!connected) {
        console.log('\n⚠️  Could not connect to existing database.');
        const retry = await question('Enter a new DATABASE_URL? (y/n): ');
        if (retry.toLowerCase() !== 'y') {
          console.log('Exiting...');
          rl.close();
          return;
        }
      } else {
        // Apply migrations
        const success = await applyMigrations();
        rl.close();
        process.exit(success ? 0 : 1);
      }
    }
  }

  // Guide user to get a database
  console.log('\n📋 To apply migrations, you need a PostgreSQL database.');
  console.log('\nOption 1 (Recommended): Free Neon PostgreSQL Database');
  console.log('  1. Visit: https://neon.tech');
  console.log('  2. Sign up (free tier is sufficient)');
  console.log('  3. Create a new project');
  console.log('  4. Copy the connection string\n');

  console.log('Option 2: Local PostgreSQL');
  console.log('  1. Install: brew install postgresql@15');
  console.log('  2. Start: brew services start postgresql@15');
  console.log('  3. Create DB: createdb talk_to_learn');
  console.log('  4. Use: postgresql://localhost:5432/talk_to_learn\n');

  const databaseUrl = await question('Enter your DATABASE_URL: ');

  if (!databaseUrl || databaseUrl.trim() === '') {
    console.log('❌ DATABASE_URL is required. Exiting...');
    rl.close();
    return;
  }

  // Test the connection
  const connected = await testDatabaseConnection(databaseUrl.trim());
  if (!connected) {
    console.log('\n❌ Could not connect to database. Please check your connection string.');
    rl.close();
    process.exit(1);
  }

  // Update .env file
  env.DATABASE_URL = databaseUrl.trim();

  // Add other required vars if missing
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD === '') {
    const adminPass = await question('Enter ADMIN_PASSWORD (or press Enter for "admin123"): ');
    env.ADMIN_PASSWORD = adminPass.trim() || 'admin123';
  }

  if (!env.SESSION_SECRET || env.SESSION_SECRET === '') {
    env.SESSION_SECRET = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    console.log('Generated SESSION_SECRET automatically');
  }

  if (!env.ADMIN_USERNAME) env.ADMIN_USERNAME = 'admin';
  if (!env.DEFAULT_TZ) env.DEFAULT_TZ = 'Asia/Shanghai';

  // Write .env file
  console.log('\n💾 Saving .env file...');
  await writeEnvFile(env);
  console.log('✅ .env file saved');

  // Apply migrations
  const success = await applyMigrations();

  if (success) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  🎉 SUCCESS!                              ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  All migrations have been applied successfully.          ║');
    console.log('║                                                          ║');
    console.log('║  Database schema now includes:                           ║');
    console.log('║    ✓ families.email field                                ║');
    console.log('║    ✓ notification_preferences table                      ║');
    console.log('║    ✓ task_notifications table                            ║');
    console.log('║                                                          ║');
    console.log('║  Next steps:                                             ║');
    console.log('║    1. Mark subtask-1-4 as completed                      ║');
    console.log('║    2. Continue with phase-2 (Email Service Setup)        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
  }

  rl.close();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Unexpected error:', error);
  rl.close();
  process.exit(1);
});
