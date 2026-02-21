import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { createCurriculumTagSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin();
    const curriculumTags = await db.select().from(schema.curriculumTags).orderBy(schema.curriculumTags.name);
    return ok({ curriculumTags });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const payload = createCurriculumTagSchema.parse(await request.json());
    const [row] = await db.insert(schema.curriculumTags).values(payload).returning();
    return ok(row, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
