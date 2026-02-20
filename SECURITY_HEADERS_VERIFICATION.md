# Security Headers Manual Verification Guide

## Overview

This guide provides step-by-step instructions for manually verifying that security headers are properly configured in the development environment.

## Prerequisites

- Development server must be running on `http://localhost:3000`
- Modern web browser (Chrome, Firefox, Safari, or Edge)

## Starting the Development Server

```bash
npm run dev
```

Wait for the server to start (you should see "Ready in X ms" message).

## Manual Verification Steps

### 1. Browser DevTools Verification

#### Chrome / Edge
1. Open browser and navigate to `http://localhost:3000`
2. Open DevTools:
   - Windows/Linux: Press `F12` or `Ctrl + Shift + I`
   - macOS: Press `Cmd + Option + I`
3. Go to the **Network** tab
4. Reload the page (`Ctrl+R` or `Cmd+R`)
5. Click on the first request (usually the document/HTML request)
6. Look for the **Headers** section
7. Scroll to **Response Headers**

#### Firefox
1. Open browser and navigate to `http://localhost:3000`
2. Open Developer Tools:
   - Windows/Linux: Press `F12` or `Ctrl + Shift + I`
   - macOS: Press `Cmd + Option + I`
3. Go to the **Network** tab
4. Reload the page
5. Click on the first request in the list
6. Check the **Response Headers** section

### 2. Required Headers to Verify

Confirm the following headers are present with the specified values:

#### ✅ X-Frame-Options
- **Expected Value:** `DENY`
- **Purpose:** Prevents the page from being loaded in an iframe (clickjacking protection)

#### ✅ X-Content-Type-Options
- **Expected Value:** `nosniff`
- **Purpose:** Prevents MIME type sniffing

#### ✅ Content-Security-Policy
- **Expected to contain:** `default-src 'self'`
- **Full value should include:**
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' blob: data: https:`
  - `media-src 'self' blob:`
  - `font-src 'self' data:`
  - `connect-src 'self'`
  - `frame-ancestors 'none'`
- **Purpose:** Controls which resources can be loaded and from where

#### ✅ Referrer-Policy
- **Expected Value:** `strict-origin-when-cross-origin`
- **Purpose:** Controls how much referrer information is shared

#### ✅ Permissions-Policy
- **Expected Value:** `camera=(), microphone=(), geolocation=(), interest-cohort=()`
- **Purpose:** Restricts access to browser features

### 3. Test Multiple Routes

Verify headers are present on all of the following routes:

- `http://localhost:3000/` (Home page)
- `http://localhost:3000/admin/login` (Admin login)
- `http://localhost:3000/teacher/login` (Teacher login)
- `http://localhost:3000/family/tasks` (Family tasks - if accessible)

For each route:
1. Navigate to the URL
2. Check DevTools Network tab
3. Confirm all 5 security headers are present

### 4. Check for Console Errors

While verifying, also check the **Console** tab for:
- ❌ No CSP violation errors
- ❌ No blocked resource errors
- ❌ No "Refused to load" messages

If you see CSP violations, the Content-Security-Policy may need adjustment.

### 5. Automated Verification Script

For a quick automated check, you can run:

```bash
./scripts/verify-security-headers.sh
```

This script will:
- Check if the dev server is running
- Test all required headers on multiple routes
- Provide a pass/fail report

## Expected Results

### ✅ Success Criteria

All of the following should be true:
- All 5 security headers are present on every route
- Header values match the expected values
- No CSP violations in console
- All pages load and function normally
- No blocked resources

### ❌ Failure Scenarios

If any of these occur, the verification has failed:
- Missing security headers
- Incorrect header values
- CSP violations in console
- Blocked legitimate resources
- Pages not loading correctly

## Troubleshooting

### Headers Not Present
- Verify `next.config.ts` has the headers configuration
- Restart the dev server
- Clear browser cache and hard reload (`Ctrl+Shift+R` or `Cmd+Shift+R`)

### CSP Violations
- Check console for specific violation messages
- Verify the CSP policy allows necessary resources
- May need to adjust `script-src`, `style-src`, or other directives

### Server Won't Start
- Check if port 3000 is already in use
- Verify dependencies are installed: `npm install`
- Check for errors in terminal output

## Configuration Reference

The security headers are configured in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' blob: data: https:",
            "media-src 'self' blob:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
          ].join("; "),
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
      ],
    },
  ];
}
```

## Sign-Off

After completing manual verification, confirm:

- [ ] All 5 security headers present on `/`
- [ ] All 5 security headers present on `/admin/login`
- [ ] All 5 security headers present on `/teacher/login`
- [ ] No CSP violations in console
- [ ] All pages load and function correctly
- [ ] Automated script passes (if run)

Once all items are checked, the security headers verification is complete.
