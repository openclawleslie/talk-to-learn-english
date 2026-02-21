#\!/bin/bash

# Simple script to apply database migrations
# This is the FASTEST way to complete subtask-1-4

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         Apply Database Migrations - Subtask 1-4          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Set PATH for npm
export PATH="/opt/homebrew/bin:$PATH"

# Check if .env exists
if [ \! -f .env ]; then
    echo "⚠️  No .env file found."
    echo ""
    echo "Choose an option:"
    echo "  1) Interactive setup (recommended)"
    echo "  2) Manual setup"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        echo ""
        echo "Starting interactive setup..."
        node apply-migrations.mjs
        exit $?
    else
        echo ""
        echo "Manual setup instructions:"
        echo "  1. cp .env.example .env"
        echo "  2. Edit .env and add your DATABASE_URL"
        echo "  3. Run this script again"
        echo ""
        echo "Get a FREE database at: https://neon.tech"
        exit 1
    fi
fi

# Check if DATABASE_URL is set
source .env 2>/dev/null || true

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL is not set in .env file"
    echo ""
    read -p "Would you like to run interactive setup? (y/n): " run_interactive
    
    if [ "$run_interactive" = "y" ]; then
        node apply-migrations.mjs
        exit $?
    else
        echo ""
        echo "Please add DATABASE_URL to your .env file"
        echo "Get a FREE database at: https://neon.tech"
        exit 1
    fi
fi

# Apply migrations
echo "🚀 Applying database migrations..."
echo ""

npm run db:push

exitcode=$?

if [ $exitcode -eq 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                    ✅ SUCCESS\!                            ║"
    echo "╠══════════════════════════════════════════════════════════╣"
    echo "║  Database migrations applied successfully\!               ║"
    echo "║                                                          ║"
    echo "║  ✓ families.email field added                            ║"
    echo "║  ✓ notification_preferences table created                ║"
    echo "║  ✓ task_notifications table created                      ║"
    echo "║                                                          ║"
    echo "║  Next: Mark subtask-1-4 as completed                     ║"
    echo "╚══════════════════════════════════════════════════════════╝"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    echo ""
    echo "Common issues:"
    echo "  • Check DATABASE_URL is correct"
    echo "  • Ensure database is accessible"
    echo "  • Verify network connection"
fi

exit $exitcode
