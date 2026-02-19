import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { createClassSchema } from "@/lib/validators";
import { fromError, ok } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const classes = await db.select().from(schema.classes).orderBy(schema.classes.name);
    return ok({ classes });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const payload = createClassSchema.parse(await request.json());

    const [row] = await db.insert(schema.classes).values(payload).returning();
    return ok(row, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
