import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { scoringConfigSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin();
    const [latest] = await db.select().from(schema.adminConfig).orderBy(desc(schema.adminConfig.createdAt)).limit(1);

    if (latest) {
      return ok({ config: latest.scoringThresholds });
    }

    // Return default values if no config exists
    return ok({ config: { oneStarMax: 70, twoStarMax: 84 } });
  } catch (error) {
    return fromError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const payload = scoringConfigSchema.parse(await request.json());

    const [latest] = await db.select().from(schema.adminConfig).orderBy(desc(schema.adminConfig.createdAt)).limit(1);

    if (latest) {
      const [updated] = await db
        .update(schema.adminConfig)
        .set({ scoringThresholds: payload })
        .where(eq(schema.adminConfig.id, latest.id))
        .returning();
      return ok(updated);
    }

    const [created] = await db.insert(schema.adminConfig).values({ scoringThresholds: payload }).returning();
    return ok(created);
  } catch (error) {
    return fromError(error);
  }
}
