import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fail, fromError, ok } from "@/lib/http";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id: taskId } = await context.params;

    const [task] = await db
      .select({
        id: schema.weeklyTasks.id,
        class_course_id: schema.weeklyTasks.classCourseId,
        week_start: schema.weeklyTasks.weekStart,
        week_end: schema.weeklyTasks.weekEnd,
        status: schema.weeklyTasks.status,
        created_by_admin: schema.weeklyTasks.createdByAdmin,
      })
      .from(schema.weeklyTasks)
      .where(eq(schema.weeklyTasks.id, taskId))
      .limit(1);

    if (!task) {
      return fail("Weekly task not found", 404, { id: taskId });
    }

    const items = await db
      .select({
        id: schema.taskItems.id,
        order_index: schema.taskItems.orderIndex,
        sentence_text: schema.taskItems.sentenceText,
        reference_audio_url: schema.taskItems.referenceAudioUrl,
        reference_audio_status: schema.taskItems.referenceAudioStatus,
      })
      .from(schema.taskItems)
      .where(eq(schema.taskItems.weeklyTaskId, taskId))
      .orderBy(schema.taskItems.orderIndex);

    return ok({ task, items });
  } catch (error) {
    return fromError(error);
  }
}
