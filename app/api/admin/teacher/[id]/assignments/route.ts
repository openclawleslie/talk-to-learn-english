import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const assignments = await db
      .select()
      .from(schema.teacherAssignments)
      .where(eq(schema.teacherAssignments.teacherId, id));

    return ok({ assignments });
  } catch (error) {
    return fromError(error);
  }
}
