import { cookies } from "next/headers";
import { createHmac } from "node:crypto";

import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";

type SessionRole = "admin" | "teacher";

type SessionPayload = {
  role: SessionRole;
  teacherId?: string;
  exp: number;
};

const COOKIE_NAME = "ttle_session";
const DAY_IN_SECONDS = 24 * 60 * 60;

function sign(content: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(content).digest("hex");
}

function encode(payload: SessionPayload) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(base);
  return `${base}.${signature}`;
}

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

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw ? decode(raw) : null;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new HttpError("Unauthorized", 401);
  }
  return session;
}

export async function requireTeacher() {
  const session = await getSession();
  if (!session || (session.role !== "teacher" && session.role !== "admin") || !session.teacherId) {
    throw new HttpError("Unauthorized", 401);
  }
  return session as SessionPayload & { teacherId: string };
}
