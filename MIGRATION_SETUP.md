# Database Migration Setup Required

## Current Status: Subtask 1-2

The database migration file has been generated successfully but cannot be applied automatically because the DATABASE_URL environment variable is not configured.

## Migration File Ready

**File**: `drizzle/0003_loose_fenris.sql`

**Changes**:
- Drops unique index `submission_student_task_unique` on (studentId, taskItemId)
- Adds `attempt_number` integer NOT NULL column to submissions table

This enables students to submit multiple attempts for the same task item.

## Setup Instructions

### Option 1: Complete Migration Now (Recommended)

1. **Copy the template**:
   ```bash
   cp env.template .env
   ```

2. **Configure DATABASE_URL** in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

   Example for local PostgreSQL:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/talk_to_learn
   ```

3. **Apply the migration**:
   ```bash
   npm run db:push
   ```

   Or directly:
   ```bash
   /opt/homebrew/bin/node ./node_modules/.bin/drizzle-kit push
   ```

4. **Verify** the output shows: "Database schema updated successfully"

5. **Update subtask status** to 'completed' in `.auto-claude/specs/021-practice-retry-tracking/implementation_plan.json`

### Option 2: Skip and Continue Development

You can proceed with developing the backend API (Phase 2) assuming the new schema is in place:
- Code can reference the `attemptNumber` field
- Migration can be applied to dev/staging database later
- **CRITICAL**: Migration MUST be applied before deploying Phase 2 changes to any environment

### Option 3: Use Existing Main Repo .env

If you have a `.env` file configured in the main repository:

```bash
# From the worktree directory
ln -s /Users/claw/projects/071-talk-to-learn-english-master/.env .env
npm run db:push
```

## Environment Variables Reference

See `env.template` for all required variables:
- `DATABASE_URL` - PostgreSQL connection string (required for migrations)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Admin credentials
- `SESSION_SECRET` - Session encryption key
- `AI_BASE_URL` / `AI_API_KEY` - AI API configuration
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage

## Migration Details

**SQL Changes**:
```sql
DROP INDEX "submission_student_task_unique";
ALTER TABLE "submissions" ADD COLUMN "attempt_number" integer NOT NULL;
```

**Impact**:
- Allows multiple submission records for same (studentId, taskItemId)
- Each new attempt will have an incremented attemptNumber
- Existing submissions will default to attemptNumber=1

## Next Steps

After completing the migration:
1. Verify database schema with: `psql $DATABASE_URL -c "\d submissions"`
2. Mark subtask-1-2 as 'completed'
3. Continue to Phase 2: Backend Submission API
