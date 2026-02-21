#!/bin/bash
# Database Setup Helper for Task 015

set -e

echo "=== Database Setup for Task Publication Notifications ==="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "✓ .env file already exists"

    # Check if DATABASE_URL is set
    if grep -q "^DATABASE_URL=.\+" .env; then
        echo "✓ DATABASE_URL is configured"
        echo ""
        echo "Applying migrations..."
        export PATH="/opt/homebrew/bin:$PATH"
        npm run db:push
        exit 0
    else
        echo "⚠ DATABASE_URL is empty in .env"
    fi
fi

echo "⚠ .env file not configured yet"
echo ""
echo "To complete database setup, you need to:"
echo ""
echo "1. Create a PostgreSQL database (options):"
echo "   a) Neon (https://neon.tech) - Free tier available"
echo "   b) Local PostgreSQL"
echo "   c) Other cloud provider"
echo ""
echo "2. Create .env file from template:"
echo "   cp .env.example .env"
echo ""
echo "3. Edit .env and fill in:"
echo "   - DATABASE_URL=<your postgres connection string>"
echo "   - ADMIN_PASSWORD=<choose a secure password>"
echo "   - SESSION_SECRET=<generate a random secret>"
echo ""
echo "4. Re-run this script:"
echo "   bash setup-db.sh"
echo ""
echo "Example DATABASE_URL format:"
echo "  postgresql://user:password@host:5432/dbname"
echo "  postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
echo ""
