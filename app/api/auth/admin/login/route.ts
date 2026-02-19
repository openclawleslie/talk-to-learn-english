import { NextRequest } from "next/server";

import { setSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { fromError, fail, ok } from "@/lib/http";
import { adminLoginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = adminLoginSchema.parse(await request.json());

    if (payload.username !== env.ADMIN_USERNAME || payload.password !== env.ADMIN_PASSWORD) {
      return fail("Invalid credentials", 401);
    }

    await setSession({ role: "admin" });
    return ok({ role: "admin" });
  } catch (error) {
    return fromError(error);
  }
}
