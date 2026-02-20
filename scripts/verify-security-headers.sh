#!/bin/bash

# Security Headers Verification Script
# This script verifies that all required security headers are present

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo "Security Headers Verification"
echo "========================================"
echo ""

# Default port
PORT=${1:-3000}
BASE_URL="http://localhost:$PORT"

# Routes to test
ROUTES=(
  "/"
  "/admin/login"
  "/teacher/login"
  "/family/tasks"
)

# Required headers
declare -A REQUIRED_HEADERS
REQUIRED_HEADERS["X-Frame-Options"]="DENY"
REQUIRED_HEADERS["X-Content-Type-Options"]="nosniff"
REQUIRED_HEADERS["Referrer-Policy"]="strict-origin-when-cross-origin"

# Headers that should contain specific values
declare -A CONTAINS_HEADERS
CONTAINS_HEADERS["Content-Security-Policy"]="default-src 'self'"
CONTAINS_HEADERS["Permissions-Policy"]="camera=()"

# Check if server is running
echo -e "${BLUE}Checking if server is running on port $PORT...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}✗ Server is not running on port $PORT${NC}"
    echo ""
    echo "Please start the development server first:"
    echo "  npm run dev"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Test each route
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

for route in "${ROUTES[@]}"; do
    echo -e "${BLUE}Testing route: $route${NC}"
    URL="$BASE_URL$route"

    # Fetch headers
    HEADERS=$(curl -s -I "$URL" 2>/dev/null)

    if [ -z "$HEADERS" ]; then
        echo -e "${RED}  ✗ Failed to fetch headers${NC}"
        ((FAILED_TESTS++))
        continue
    fi

    # Check exact match headers
    for header in "${!REQUIRED_HEADERS[@]}"; do
        ((TOTAL_TESTS++))
        expected="${REQUIRED_HEADERS[$header]}"

        if echo "$HEADERS" | grep -qi "^$header: $expected"; then
            echo -e "${GREEN}  ✓ $header: $expected${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}  ✗ $header: Expected '$expected'${NC}"
            actual=$(echo "$HEADERS" | grep -i "^$header:" | cut -d' ' -f2- || echo "MISSING")
            echo -e "${YELLOW}    Actual: $actual${NC}"
            ((FAILED_TESTS++))
        fi
    done

    # Check headers that should contain certain values
    for header in "${!CONTAINS_HEADERS[@]}"; do
        ((TOTAL_TESTS++))
        expected="${CONTAINS_HEADERS[$header]}"

        if echo "$HEADERS" | grep -i "^$header:" | grep -q "$expected"; then
            echo -e "${GREEN}  ✓ $header contains '$expected'${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}  ✗ $header should contain '$expected'${NC}"
            actual=$(echo "$HEADERS" | grep -i "^$header:" | head -1 || echo "MISSING")
            echo -e "${YELLOW}    Actual: $actual${NC}"
            ((FAILED_TESTS++))
        fi
    done

    echo ""
done

# Summary
echo "========================================"
echo "Summary"
echo "========================================"
echo "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo ""
    echo "========================================"
    echo "Manual Verification Steps"
    echo "========================================"
    echo "1. Open browser to http://localhost:$PORT"
    echo "2. Open DevTools (F12 or Cmd+Option+I)"
    echo "3. Go to Network tab"
    echo "4. Reload the page"
    echo "5. Click on the document request"
    echo "6. Check the Response Headers section"
    echo ""
    echo "Verify these headers are present:"
    echo "  • X-Frame-Options: DENY"
    echo "  • X-Content-Type-Options: nosniff"
    echo "  • Content-Security-Policy: (should contain default-src 'self')"
    echo "  • Referrer-Policy: strict-origin-when-cross-origin"
    echo "  • Permissions-Policy: (restrictive policy)"
    echo ""
    exit 1
else
    echo ""
    echo -e "${GREEN}✓ All security headers are properly configured!${NC}"
    echo ""
    exit 0
fi
