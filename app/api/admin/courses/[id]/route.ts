import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { createCourseSchema } from "@/lib/validators";
import { fromError, ok, fail } from "@/lib/http";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: courseId } = await params;

    const payload = createCourseSchema.parse(await request.json());

    const [updated] = await db
      .update(schema.courses)
      .set(payload)
      .where(eq(schema.courses.id, courseId))
      .returning();

    if (!updated) {
      return fail("Course not found", 404);
    }

    return ok(updated);
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: courseId } = await params;

    const [deleted] = await db
      .delete(schema.courses)
      .where(eq(schema.courses.id, courseId))
      .returning();

    if (!deleted) {
      return fail("Course not found", 404);
    }

    return ok({ message: "Course deleted successfully" });
  } catch (error) {
    return fromError(error);
  }
}
