import { cookies } from "next/headers";
import { createHmac } from "node:crypto";

import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";

/**
 * User role within the session
 */
type SessionRole = "admin" | "teacher";

/**
 * Session data stored in the signed cookie
 */
type SessionPayload = {
  /** User role (admin or teacher) */
  role: SessionRole;
  /** Teacher ID (required for teacher role) */
  teacherId?: string;
  /** Expiration timestamp (Unix seconds) */
  exp: number;
};

const COOKIE_NAME = "ttle_session";
const DAY_IN_SECONDS = 24 * 60 * 60;

/**
 * Creates an HMAC-SHA256 signature for the given content.
 *
 * @param content - Content to sign
 * @returns Hex-encoded signature
 * @internal
 */
function sign(content: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(content).digest("hex");
}

/**
 * Encodes a session payload into a signed token.
 *
 * The token format is: base64url(payload).hmac_signature
 *
 * @param payload - Session data to encode
 * @returns Signed token string
 * @internal
 */
function encode(payload: SessionPayload) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(base);
  return `${base}.${signature}`;
}

/**
 * Decodes and validates a signed session token.
 *
 * Verifies the HMAC signature and checks expiration.
 * Returns null if the token is invalid, tampered with, or expired.
 *
 * @param token - Signed token string to decode
 * @returns Decoded session payload, or null if invalid/expired
 * @internal
 */
function decode(token: string): SessionPayload | null {
  const [base, signature] = token.split(".");

  if (!base || !signature || sign(base) !== signature) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf-8")) as SessionPayload;

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

/**
 * Creates a new session by setting a signed, HTTP-only cookie.
 *
 * The session expires after 24 hours. The cookie is signed with HMAC-SHA256
 * to prevent tampering and is marked secure in production environments.
 *
 * @param payload - Session data (role and optional teacherId)
 * @param payload.role - User role (admin or teacher)
 * @param payload.teacherId - Teacher ID (required for teacher role)
 *
 * @example
 * ```ts
 * // Create admin session
 * await setSession({ role: 'admin' });
 *
 * // Create teacher session
 * await setSession({ role: 'teacher', teacherId: 'teacher_123' });
 * ```
 */
export async function setSession(payload: Omit<SessionPayload, "exp">) {
  const store = await cookies();
  const exp = Math.floor(Date.now() / 1000) + DAY_IN_SECONDS;
  store.set(COOKIE_NAME, encode({ ...payload, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DAY_IN_SECONDS,
  });
}

/**
 * Clears the current session by deleting the session cookie.
 *
 * Call this function when a user logs out.
 *
 * @example
 * ```ts
 * await clearSession();
 * // User is now logged out
 * ```
 */
export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Retrieves the current session from the signed cookie.
 *
 * Validates the signature and expiration time. Returns null if the
 * session is missing, invalid, tampered with, or expired.
 *
 * @returns Session payload if valid, null otherwise
 *
 * @example
 * ```ts
 * const session = await getSession();
 * if (session) {
 *   console.log('User role:', session.role);
 *   if (session.teacherId) {
 *     console.log('Teacher ID:', session.teacherId);
 *   }
 * }
 * ```
 */
export async function getSession() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw ? decode(raw) : null;
}

/**
 * Retrieves the current session and verifies the user has admin role.
 *
 * Use this function to protect admin-only routes and API endpoints.
 *
 * @returns Session payload with admin role
 * @throws {HttpError} With 401 status if user is not authenticated or not an admin
 *
 * @example
 * ```ts
 * // In a Next.js API route
 * export async function POST(request: Request) {
 *   await requireAdmin(); // Throws if not admin
 *   // Admin-only logic here
 * }
 * ```
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new HttpError("Unauthorized", 401);
  }
  return session;
}

/**
 * Retrieves the current session and verifies the user has teacher or admin role.
 *
 * Use this function to protect teacher routes and API endpoints.
 * Admins are also allowed as they have elevated privileges.
 *
 * @returns Session payload with teacherId guaranteed to be present
 * @throws {HttpError} With 401 status if user is not authenticated, not a teacher/admin, or missing teacherId
 *
 * @example
 * ```ts
 * // In a Next.js API route
 * export async function GET(request: Request) {
 *   const session = await requireTeacher();
 *   // Access teacher-specific data
 *   const classes = await getClassesByTeacher(session.teacherId);
 * }
 * ```
 */
export async function requireTeacher() {
  const session = await getSession();
  if (!session || (session.role !== "teacher" && session.role !== "admin") || !session.teacherId) {
    throw new HttpError("Unauthorized", 401);
  }
  return session as SessionPayload & { teacherId: string };
}
