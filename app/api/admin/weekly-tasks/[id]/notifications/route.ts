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
      .select({ id: schema.weeklyTasks.id })
      .from(schema.weeklyTasks)
      .where(eq(schema.weeklyTasks.id, taskId))
      .limit(1);

    if (!task) {
      return fail("Weekly task not found", 404, { id: taskId });
    }

    const notifications = await db
      .select({
        id: schema.taskNotifications.id,
        family_id: schema.taskNotifications.familyId,
        status: schema.taskNotifications.status,
        sent_at: schema.taskNotifications.sentAt,
        error: schema.taskNotifications.error,
        created_at: schema.taskNotifications.createdAt,
      })
      .from(schema.taskNotifications)
      .where(eq(schema.taskNotifications.weeklyTaskId, taskId));

    return ok({ notifications });
  } catch (error) {
    return fromError(error);
  }
}
