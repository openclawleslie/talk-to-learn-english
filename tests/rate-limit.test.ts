import assert from "node:assert/strict";
import test from "node:test";

import { getClientIp, checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { HttpError } from "@/lib/http";
import { NextRequest } from "next/server";

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const headersObj = new Headers(headers);
  return {
    headers: headersObj,
  } as NextRequest;
}

test("getClientIp extracts IP from x-forwarded-for header", () => {
  const request = createMockRequest({ "x-forwarded-for": "192.168.1.1, 10.0.0.1" });
  assert.equal(getClientIp(request), "192.168.1.1");
});

test("getClientIp extracts IP from x-real-ip header", () => {
  const request = createMockRequest({ "x-real-ip": "192.168.1.2" });
  assert.equal(getClientIp(request), "192.168.1.2");
});

test("getClientIp prioritizes x-forwarded-for over x-real-ip", () => {
  const request = createMockRequest({
    "x-forwarded-for": "192.168.1.1",
    "x-real-ip": "192.168.1.2",
  });
  assert.equal(getClientIp(request), "192.168.1.1");
});

test("getClientIp returns unknown when no IP headers present", () => {
  const request = createMockRequest();
  assert.equal(getClientIp(request), "unknown");
});

test("checkRateLimit allows requests within limit", () => {
  const request = createMockRequest({ "x-forwarded-for": "192.168.1.100" });
  const config = { maxAttempts: 3, windowMs: 60000 };

  assert.doesNotThrow(() => checkRateLimit(request, config));
  assert.doesNotThrow(() => checkRateLimit(request, config));
  assert.doesNotThrow(() => checkRateLimit(request, config));
});

test("checkRateLimit throws HttpError when limit exceeded", () => {
  const request = createMockRequest({ "x-forwarded-for": "192.168.1.101" });
  const config = { maxAttempts: 2, windowMs: 60000 };

  checkRateLimit(request, config);
  checkRateLimit(request, config);

  assert.throws(
    () => checkRateLimit(request, config),
    (error: Error) => {
      return error instanceof HttpError && error.status === 429;
    }
  );
});

test("checkRateLimit uses sliding window correctly", async () => {
  const request = createMockRequest({ "x-forwarded-for": "192.168.1.102" });
  const config = { maxAttempts: 2, windowMs: 100 };

  checkRateLimit(request, config);
  checkRateLimit(request, config);

  // Wait for window to expire
  await new Promise(resolve => setTimeout(resolve, 150));

  // Should allow new requests after window expires
  assert.doesNotThrow(() => checkRateLimit(request, config));
});

test("resetRateLimit clears rate limit for client", () => {
  const request = createMockRequest({ "x-forwarded-for": "192.168.1.103" });
  const config = { maxAttempts: 2, windowMs: 60000 };

  checkRateLimit(request, config);
  checkRateLimit(request, config);

  resetRateLimit(request);

  // Should allow requests again after reset
  assert.doesNotThrow(() => checkRateLimit(request, config));
  assert.doesNotThrow(() => checkRateLimit(request, config));
});

test("checkRateLimit treats different IPs independently", () => {
  const request1 = createMockRequest({ "x-forwarded-for": "192.168.1.104" });
  const request2 = createMockRequest({ "x-forwarded-for": "192.168.1.105" });
  const config = { maxAttempts: 2, windowMs: 60000 };

  checkRateLimit(request1, config);
  checkRateLimit(request1, config);

  // request1 is at limit, but request2 should still work
  assert.doesNotThrow(() => checkRateLimit(request2, config));
});
