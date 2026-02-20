import { NextRequest } from "next/server";
import { HttpError } from "@/lib/http";

interface RateLimitEntry {
  attempts: number[];
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configuration (will be overridden by env variables when available)
const defaultConfig: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore.entries()) {
    entry.attempts = entry.attempts.filter(timestamp => now - timestamp < defaultConfig.windowMs);

    if (entry.attempts.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function checkRateLimit(request: NextRequest, config: RateLimitConfig = defaultConfig): void {
  const identifier = getClientIp(request);
  const now = Date.now();
  const window = config.windowMs;
  const maxAttempts = config.maxAttempts;

  let entry = rateLimitStore.get(identifier);

  if (!entry) {
    entry = { attempts: [] };
    rateLimitStore.set(identifier, entry);
  }

  // Remove attempts outside the time window (sliding window)
  entry.attempts = entry.attempts.filter(timestamp => now - timestamp < window);

  // Check if rate limit exceeded
  if (entry.attempts.length >= maxAttempts) {
    throw new HttpError("Too many requests. Please try again later.", 429);
  }

  // Record this attempt
  entry.attempts.push(now);
}

export function resetRateLimit(request: NextRequest): void {
  const identifier = getClientIp(request);
  rateLimitStore.delete(identifier);
}
