import { and, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fail, fromError, ok } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const session = await requireTeacher();
    const body = await request.json();
    const { taskIds } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return fail("taskIds array is required and must not be empty", 400);
    }

    // Get teacher's assigned class courses
    const assignments = await db
      .select({ classCourseId: schema.teacherAssignments.classCourseId })
      .from(schema.teacherAssignments)
      .where(eq(schema.teacherAssignments.teacherId, session.teacherId));

    if (!assignments.length) {
      return fail("No class courses assigned to teacher", 403);
    }

    const classCourseIds = assignments.map((a) => a.classCourseId);

    // Get the tasks to verify they exist and belong to teacher's class courses
    const tasks = await db
      .select({
        id: schema.weeklyTasks.id,
        classCourseId: schema.weeklyTasks.classCourseId,
        status: schema.weeklyTasks.status,
      })
      .from(schema.weeklyTasks)
      .where(and(
        inArray(schema.weeklyTasks.id, taskIds),
        inArray(schema.weeklyTasks.classCourseId, classCourseIds)
      ));

    if (tasks.length === 0) {
      return fail("No tasks found or teacher does not have access to these tasks", 404);
    }

    // Check if any tasks are not found or not accessible
    if (tasks.length !== taskIds.length) {
      const foundTaskIds = tasks.map(t => t.id);
      const notFoundIds = taskIds.filter(id => !foundTaskIds.includes(id));
      return fail("Some tasks were not found or are not accessible", 403, {
        notFoundIds,
      });
    }

    // Update all tasks to published status
    const updatedTasks = await db
      .update(schema.weeklyTasks)
      .set({ status: "published" })
      .where(inArray(schema.weeklyTasks.id, taskIds))
      .returning();

    return ok({
      updatedCount: updatedTasks.length,
      tasks: updatedTasks,
    });
  } catch (error) {
    return fromError(error);
  }
}
