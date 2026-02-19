import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status });
}

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
