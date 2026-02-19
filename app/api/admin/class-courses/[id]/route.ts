import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db
      .delete(schema.classCourses)
      .where(eq(schema.classCourses.id, id));

    return ok({ message: "Class course deleted successfully" });
  } catch (error) {
    return fromError(error);
  }
}
