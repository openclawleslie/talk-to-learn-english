import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * HTTP error with a specific status code.
 *
 * Extends the standard Error class to include an HTTP status code.
 * Use this in API routes to throw errors that will be handled by `fromError`.
 *
 * @example
 * ```ts
 * throw new HttpError("Resource not found", 404);
 * throw new HttpError("Forbidden", 403);
 * ```
 */
export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Creates a successful JSON response with typed data.
 *
 * Returns a Next.js JSON response with format: `{ ok: true, data: T }`.
 * Use this as the standard success response format for API routes.
 *
 * @param data - Response data of any type
 * @param init - Optional response initialization options (headers, status, etc.)
 * @returns Next.js JSON response with success format
 *
 * @example
 * ```ts
 * // In a Next.js API route
 * export async function GET() {
 *   const users = await db.query.users.findMany();
 *   return ok(users);
 * }
 *
 * // With custom headers
 * return ok({ count: 42 }, {
 *   headers: { 'Cache-Control': 'max-age=3600' }
 * });
 * ```
 */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Creates an error JSON response with a message and optional details.
 *
 * Returns a Next.js JSON response with format: `{ ok: false, error: { message, details } }`.
 * Use this as the standard error response format for API routes.
 *
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 400)
 * @param details - Optional additional error information (e.g., validation errors)
 * @returns Next.js JSON response with error format
 *
 * @example
 * ```ts
 * // Simple error
 * return fail("Invalid input");
 *
 * // With custom status
 * return fail("Not found", 404);
 *
 * // With details
 * return fail("Validation failed", 400, {
 *   field: "email",
 *   issue: "Invalid format"
 * });
 * ```
 */
export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status });
}

/**
 * Converts any error into a standardized JSON error response.
 *
 * Handles different error types automatically:
 * - `ZodError`: Returns 400 with validation details
 * - `HttpError`: Returns the specified status and message
 * - Other errors: Returns 500 and logs the error
 *
 * Use this in API route catch blocks to ensure consistent error responses.
 *
 * @param error - Error of any type (ZodError, HttpError, or unknown)
 * @returns Next.js JSON response with appropriate error format and status
 *
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   try {
 *     const body = await request.json();
 *     const data = createUserSchema.parse(body);
 *     return ok({ success: true });
 *   } catch (error) {
 *     return fromError(error); // Handles ZodError automatically
 *   }
 * }
 * ```
 */
export function fromError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 400, error.flatten());
  }

  if (error instanceof HttpError) {
    return fail(error.message, error.status);
  }

  console.error("Unhandled error:", error);
  return fail("Internal server error", 500);
}
