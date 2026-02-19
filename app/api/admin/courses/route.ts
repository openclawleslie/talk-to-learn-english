import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { createCourseSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin();
    const courses = await db.select().from(schema.courses).orderBy(schema.courses.name);
    return ok({ courses });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const payload = createCourseSchema.parse(await request.json());
    const [row] = await db.insert(schema.courses).values(payload).returning();
    return ok(row, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
