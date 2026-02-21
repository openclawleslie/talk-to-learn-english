# Complete Database Migrations - Subtask 1-4

## Status: Ready to Apply ✓

The migration files have been created and validated:
- ✓ `drizzle/0003_add_family_email.sql` - Adds email field to families table
- ✓ `drizzle/0004_create_notification_preferences.sql` - Creates notification preferences table
- ✓ `drizzle/0005_past_switch.sql` - Creates task notifications table
- ✓ **Validated with `drizzle-kit check`** - All migrations are syntactically correct

## Why This Hasn't Been Applied Yet

Database migrations require a live database connection with credentials. For security reasons, database credentials:
- Cannot be committed to git
- Are environment-specific
- Must be provided by the user

## Complete This Task in 2 Minutes

### FASTEST PATH (Recommended)

```bash
# 1. Run the interactive setup script
export PATH="/opt/homebrew/bin:$PATH"
node apply-migrations.mjs
```

The script will:
- Guide you to get a FREE database (https://neon.tech)
- Help you configure .env
- Apply all migrations automatically
- Verify success

### MANUAL PATH

If you prefer manual setup:

```bash
# 1. Copy template
cp .env.example .env

# 2. Edit .env and add your DATABASE_URL
# Get a free one from: https://neon.tech
nano .env

# 3. Apply migrations
export PATH="/opt/homebrew/bin:$PATH"
npm run db:push
```

## Verification

After running either path above, verify migrations were applied:

```bash
export PATH="/opt/homebrew/bin:$PATH"
npm run db:push
```

Expected output:
```
✓ Everything's fine 🐶🔥
```

## What Gets Created

The migrations will add:

1. **families.email** - VARCHAR(255), nullable
   - Stores family email address for notifications

2. **notification_preferences** table:
   - id (UUID, primary key)
   - family_id (UUID, FK to families, unique)
   - email_enabled (BOOLEAN, default true)
   - created_at, updated_at (TIMESTAMP)

3. **task_notifications** table:
   - id (UUID, primary key)
   - weekly_task_id (UUID, FK to weekly_tasks)
   - family_id (UUID, FK to families)
   - status (ENUM: pending/sent/failed)
   - sent_at (TIMESTAMP, nullable)
   - error (TEXT, nullable)
   - created_at (TIMESTAMP)

## Troubleshooting

### "npm: command not found"
```bash
export PATH="/opt/homebrew/bin:$PATH"
```

### "DATABASE_URL is empty"
Make sure your .env file has:
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### "Connection refused"
- For Neon: Check your connection string is correct
- For local PostgreSQL: Ensure it's running with `brew services list`

## After Success

Once migrations are applied:
1. Mark subtask-1-4 as completed in implementation_plan.json
2. Proceed to Phase 2 (Email Service Setup)
