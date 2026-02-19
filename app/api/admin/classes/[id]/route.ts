import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { createClassSchema } from "@/lib/validators";
import { fromError, ok, fail } from "@/lib/http";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: classId } = await params;

    const payload = createClassSchema.parse(await request.json());

    const [updated] = await db
      .update(schema.classes)
      .set(payload)
      .where(eq(schema.classes.id, classId))
      .returning();

    if (!updated) {
      return fail("Class not found", 404);
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
    const { id: classId } = await params;

    const [deleted] = await db
      .delete(schema.classes)
      .where(eq(schema.classes.id, classId))
      .returning();

    if (!deleted) {
      return fail("Class not found", 404);
    }

    return ok({ message: "Class deleted successfully" });
  } catch (error) {
    return fromError(error);
  }
}
