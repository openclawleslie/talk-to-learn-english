import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type SessionPayload = {
  role: "admin" | "teacher";
  teacherId?: string;
  exp: number;
};

function verifyToken(raw?: string): SessionPayload | null {
  if (!raw) {
    return null;
  }

  const [base] = raw.split(".");
  if (!base) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf-8")) as SessionPayload;
  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = verifyToken(request.cookies.get("ttle_session")?.value);

  if (path.startsWith("/admin") && path !== "/admin/login") {
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (path.startsWith("/teacher") && path !== "/teacher/login") {
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.redirect(new URL("/teacher/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*"],
};
