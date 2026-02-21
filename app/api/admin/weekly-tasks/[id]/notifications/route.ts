import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fail, fromError, ok } from "@/lib/http";
import { getTaskNotificationStatus } from "@/lib/notifications";

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

    const { summary, notifications } = await getTaskNotificationStatus(taskId);

    return ok({
      summary,
      notifications: notifications.map((n) => ({
        id: n.id,
        family_id: n.familyId,
        parent_name: n.parentName,
        email: n.email,
        status: n.status,
        sent_at: n.sentAt,
        error: n.error,
        created_at: n.createdAt,
      }))
    });
  } catch (error) {
    return fromError(error);
  }
}
