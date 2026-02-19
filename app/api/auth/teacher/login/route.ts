import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { setSession } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, fail, ok } from "@/lib/http";
import { teacherLoginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = teacherLoginSchema.parse(await request.json());

    const [teacher] = await db
      .select()
      .from(schema.teachers)
      .where(eq(schema.teachers.email, payload.email))
      .limit(1);

    if (!teacher || !teacher.isActive) {
      return fail("Invalid credentials", 401);
    }

    const passed = await bcrypt.compare(payload.password, teacher.passwordHash);

    if (!passed) {
      return fail("Invalid credentials", 401);
    }

    await setSession({ role: teacher.isAdmin ? "admin" : "teacher", teacherId: teacher.id });
    return ok({ role: teacher.isAdmin ? "admin" : "teacher", teacherId: teacher.id });
  } catch (error) {
    return fromError(error);
  }
}
