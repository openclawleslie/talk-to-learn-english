import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, fail, ok } from "@/lib/http";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateNotificationSettingsSchema = z.object({
  parentEmail: z.string().email().optional().nullable(),
  notificationPreference: z.enum(["all", "weekly_summary", "none"]),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireTeacher();
    const { id } = await params;
    const payload = updateNotificationSettingsSchema.parse(await request.json());

    // 验证家庭是否属于该老师
    const [family] = await db
      .select()
      .from(schema.families)
      .where(and(eq(schema.families.id, id), eq(schema.families.createdByTeacherId, session.teacherId)))
      .limit(1);

    if (!family) {
      return fail("Family not found", 404);
    }

    // 更新通知设置
    await db
      .update(schema.families)
      .set({
        parentEmail: payload.parentEmail,
        notificationPreference: payload.notificationPreference,
      })
      .where(eq(schema.families.id, id));

    return ok({ success: true });
  } catch (error) {
    return fromError(error);
  }
}
