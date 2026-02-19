import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { resolveFamilyByToken } from "@/lib/family-link";
import { fromError, fail, ok } from "@/lib/http";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const link = await resolveFamilyByToken(token);

    if (!link) {
      return fail("Invalid link", 404);
    }

    const [family] = await db
      .select({
        id: schema.families.id,
        parentName: schema.families.parentName,
        note: schema.families.note,
      })
      .from(schema.families)
      .where(and(eq(schema.families.id, link.familyId)))
      .limit(1);

    if (!family) {
      return fail("Family not found", 404);
    }

    const students = await db
      .select({ id: schema.students.id, name: schema.students.name })
      .from(schema.students)
      .where(eq(schema.students.familyId, family.id));

    return ok({ family, students });
  } catch (error) {
    return fromError(error);
  }
}
