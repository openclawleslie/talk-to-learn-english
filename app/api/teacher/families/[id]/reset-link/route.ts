import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { issueFamilyLink } from "@/lib/family-link";
import { fromError, fail, ok } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireTeacher();
    const { id } = await params;

    const [family] = await db
      .select({
        id: schema.families.id,
        classCourseId: schema.families.classCourseId,
      })
      .from(schema.families)
      .where(and(eq(schema.families.id, id), eq(schema.families.createdByTeacherId, session.teacherId)))
      .limit(1);

    if (!family) {
      return fail("Family not found", 404);
    }

    const token = await issueFamilyLink(family.id);
    return ok({ familyId: family.id, token });
  } catch (error) {
    return fromError(error);
  }
}
