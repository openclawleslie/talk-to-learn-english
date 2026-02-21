# Database Setup Instructions

## Quick Setup (5 minutes)

### Option 1: Neon PostgreSQL (Recommended - Free)

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up (free tier available)
   - Create a new project

2. **Get Connection String**
   - In your Neon dashboard, find the connection string
   - It looks like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

3. **Configure Environment**
   ```bash
   # Copy the template
   cp .env.template .env

   # Edit .env and replace:
   # - DATABASE_URL with your Neon connection string
   # - ADMIN_PASSWORD with a secure password
   # - SESSION_SECRET with a random string (use: openssl rand -base64 32)
   ```

4. **Apply Migrations**
   ```bash
   bash setup-db.sh
   ```

### Option 2: Local PostgreSQL

1. **Install PostgreSQL** (if not already installed)
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   ```

2. **Create Database**
   ```bash
   createdb talk_to_learn
   ```

3. **Configure Environment**
   ```bash
   cp .env.template .env
   # Edit .env with:
   # DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/talk_to_learn
   ```

4. **Apply Migrations**
   ```bash
   bash setup-db.sh
   ```

## What Gets Applied

The following migrations will be applied to your database:

1. **0003_add_family_email.sql** - Adds email field to families table
2. **0004_create_notification_preferences.sql** - Creates notification preferences table
3. **0005_past_switch.sql** - Creates task notifications tracking table

## Verification

After setup, verify with:
```bash
export PATH="/opt/homebrew/bin:$PATH"
npm run db:push
```

Should output: "✓ Migrations applied successfully"

## Troubleshooting

**Error: "Command 'npm' not found"**
```bash
export PATH="/opt/homebrew/bin:$PATH"
```

**Error: "Please provide required params for Postgres driver"**
- Check that DATABASE_URL is set in .env
- Ensure the connection string is valid
- Test connection: `psql "YOUR_DATABASE_URL"`

**Error: Connection refused**
- Verify database is running
- Check host/port in connection string
- For Neon, ensure you copied the full connection string with `?sslmode=require`
