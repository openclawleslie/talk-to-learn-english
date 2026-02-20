import assert from "node:assert/strict";
import test from "node:test";
import { get } from "node:http";

const BASE_URL = "http://localhost:3000";

/**
 * Helper function to make HTTP request and return response headers
 */
function fetchHeaders(path: string): Promise<Record<string, string | string[] | undefined>> {
  return new Promise((resolve, reject) => {
    const req = get(`${BASE_URL}${path}`, (res) => {
      // Convert header keys to lowercase for consistent comparison
      const headers: Record<string, string | string[] | undefined> = {};
      Object.entries(res.headers).forEach(([key, value]) => {
        headers[key.toLowerCase()] = value;
      });
      resolve(headers);
      res.resume(); // Consume response to free up resources
    });

    req.on("error", (err) => {
      reject(new Error(`Failed to connect to ${BASE_URL}${path}. Is the dev server running? (npm run dev)\n${err.message}`));
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Request to ${BASE_URL}${path} timed out. Is the dev server running?`));
    });
  });
}

test("Security headers are present on homepage", async () => {
  const headers = await fetchHeaders("/");

  // X-Frame-Options
  assert.ok(headers["x-frame-options"], "X-Frame-Options header should be present");
  assert.equal(headers["x-frame-options"], "DENY");

  // X-Content-Type-Options
  assert.ok(headers["x-content-type-options"], "X-Content-Type-Options header should be present");
  assert.equal(headers["x-content-type-options"], "nosniff");

  // Content-Security-Policy
  assert.ok(headers["content-security-policy"], "Content-Security-Policy header should be present");
  const csp = headers["content-security-policy"] as string;
  assert.ok(csp.includes("default-src 'self'"), "CSP should include default-src 'self'");
  assert.ok(csp.includes("script-src 'self'"), "CSP should include script-src 'self'");
  assert.ok(csp.includes("frame-ancestors 'none'"), "CSP should include frame-ancestors 'none'");

  // Referrer-Policy
  assert.ok(headers["referrer-policy"], "Referrer-Policy header should be present");
  assert.equal(headers["referrer-policy"], "strict-origin-when-cross-origin");

  // Permissions-Policy
  assert.ok(headers["permissions-policy"], "Permissions-Policy header should be present");
  const permissionsPolicy = headers["permissions-policy"] as string;
  assert.ok(permissionsPolicy.includes("camera=()"), "Permissions-Policy should restrict camera");
  assert.ok(permissionsPolicy.includes("microphone=()"), "Permissions-Policy should restrict microphone");
  assert.ok(permissionsPolicy.includes("geolocation=()"), "Permissions-Policy should restrict geolocation");
});

test("Security headers are present on admin login route", async () => {
  const headers = await fetchHeaders("/admin/login");

  assert.ok(headers["x-frame-options"], "X-Frame-Options header should be present on /admin/login");
  assert.ok(headers["x-content-type-options"], "X-Content-Type-Options header should be present on /admin/login");
  assert.ok(headers["content-security-policy"], "Content-Security-Policy header should be present on /admin/login");
  assert.ok(headers["referrer-policy"], "Referrer-Policy header should be present on /admin/login");
  assert.ok(headers["permissions-policy"], "Permissions-Policy header should be present on /admin/login");
});

test("Security headers are present on teacher login route", async () => {
  const headers = await fetchHeaders("/teacher/login");

  assert.ok(headers["x-frame-options"], "X-Frame-Options header should be present on /teacher/login");
  assert.ok(headers["x-content-type-options"], "X-Content-Type-Options header should be present on /teacher/login");
  assert.ok(headers["content-security-policy"], "Content-Security-Policy header should be present on /teacher/login");
  assert.ok(headers["referrer-policy"], "Referrer-Policy header should be present on /teacher/login");
  assert.ok(headers["permissions-policy"], "Permissions-Policy header should be present on /teacher/login");
});

test("CSP allows blob: for media resources", async () => {
  const headers = await fetchHeaders("/");
  const csp = headers["content-security-policy"] as string;

  assert.ok(csp.includes("media-src 'self' blob:"), "CSP should allow blob: for media-src (Vercel Blob storage)");
  assert.ok(csp.includes("img-src 'self' blob:"), "CSP should allow blob: for img-src");
});

test("All five required security headers are present", async () => {
  const headers = await fetchHeaders("/");

  const requiredHeaders = [
    "x-frame-options",
    "x-content-type-options",
    "content-security-policy",
    "referrer-policy",
    "permissions-policy",
  ];

  requiredHeaders.forEach((header) => {
    assert.ok(headers[header], `Required security header ${header} should be present`);
  });
});
