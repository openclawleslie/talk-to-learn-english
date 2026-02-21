import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { updateCurriculumTagSchema } from "@/lib/validators";
import { fromError, ok, fail } from "@/lib/http";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: tagId } = await params;

    const payload = updateCurriculumTagSchema.parse(await request.json());

    const [updated] = await db
      .update(schema.curriculumTags)
      .set(payload)
      .where(eq(schema.curriculumTags.id, tagId))
      .returning();

    if (!updated) {
      return fail("Curriculum tag not found", 404);
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
    const { id: tagId } = await params;

    const [deleted] = await db
      .delete(schema.curriculumTags)
      .where(eq(schema.curriculumTags.id, tagId))
      .returning();

    if (!deleted) {
      return fail("Curriculum tag not found", 404);
    }

    return ok({ message: "Curriculum tag deleted successfully" });
  } catch (error) {
    return fromError(error);
  }
}
