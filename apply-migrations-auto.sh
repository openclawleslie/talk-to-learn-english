#!/bin/bash

#
# Automatic Migration Script (Non-Interactive)
# Attempt 4 - Different from previous interactive approach
#

set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "════════════════════════════════════════════════════════"
echo "  Database Migration Application (Non-Interactive Mode)"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if DATABASE_URL is set in environment or .env file
if [ -f ".env" ]; then
    echo "✓ Found .env file, loading variables..."
    export $(cat .env | grep -v '^#' | grep -v '^\s*$' | xargs)
fi

if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:5432/YOUR_DATABASE" ]; then
    echo "❌ DATABASE_URL is not configured"
    echo ""
    echo "This step requires a PostgreSQL database. The migrations are READY"
    echo "to be applied, but cannot proceed without database credentials."
    echo ""
    echo "To complete this step:"
    echo "  1. Get a free database from https://neon.tech"
    echo "  2. Set DATABASE_URL in .env file"
    echo "  3. Re-run: npm run db:push"
    echo ""
    echo "Migration files ready to apply:"
    echo "  ✓ drizzle/0003_add_family_email.sql"
    echo "  ✓ drizzle/0004_create_notification_preferences.sql"
    echo "  ✓ drizzle/0005_past_switch.sql (task_notifications)"
    echo ""
    echo "Status: BLOCKED - Database credentials required"
    exit 1
fi

echo "✓ DATABASE_URL found"
echo "✓ Checking database connection..."
echo ""

# Run migrations
echo "Running: npm run db:push"
echo ""

npm run db:push

if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "  ✅ SUCCESS - Migrations Applied"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "Database schema updated with:"
    echo "  ✓ families.email field"
    echo "  ✓ notification_preferences table"
    echo "  ✓ task_notifications table"
    echo ""
    exit 0
else
    echo ""
    echo "❌ Migration failed"
    exit 1
fi
