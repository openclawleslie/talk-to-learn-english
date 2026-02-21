import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fail, fromError, ok } from "@/lib/http";
import { copyTaskItemsSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await requireTeacher();
    const payload = copyTaskItemsSchema.parse(await request.json());

    // Get teacher's assigned class courses
    const assignments = await db
      .select({ classCourseId: schema.teacherAssignments.classCourseId })
      .from(schema.teacherAssignments)
      .where(eq(schema.teacherAssignments.teacherId, session.teacherId));

    const assignedClassCourseIds = assignments.map((a) => a.classCourseId);

    if (!assignedClassCourseIds.length) {
      return fail("Teacher has no class assignments", 403);
    }

    // Verify source task exists and teacher has access to it
    const [sourceTask] = await db
      .select({
        id: schema.weeklyTasks.id,
        classCourseId: schema.weeklyTasks.classCourseId,
      })
      .from(schema.weeklyTasks)
      .where(eq(schema.weeklyTasks.id, payload.sourceTaskId))
      .limit(1);

    if (!sourceTask) {
      return fail("Source task not found", 404, { sourceTaskId: payload.sourceTaskId });
    }

    if (!assignedClassCourseIds.includes(sourceTask.classCourseId)) {
      return fail("Teacher does not have access to source task", 403);
    }

    // Verify target task exists and teacher has access to it
    const [targetTask] = await db
      .select({
        id: schema.weeklyTasks.id,
        classCourseId: schema.weeklyTasks.classCourseId,
      })
      .from(schema.weeklyTasks)
      .where(eq(schema.weeklyTasks.id, payload.targetTaskId))
      .limit(1);

    if (!targetTask) {
      return fail("Target task not found", 404, { targetTaskId: payload.targetTaskId });
    }

    if (!assignedClassCourseIds.includes(targetTask.classCourseId)) {
      return fail("Teacher does not have access to target task", 403);
    }

    // Fetch source task items
    const sourceItems = await db
      .select({
        orderIndex: schema.taskItems.orderIndex,
        sentenceText: schema.taskItems.sentenceText,
        referenceAudioUrl: schema.taskItems.referenceAudioUrl,
        referenceAudioStatus: schema.taskItems.referenceAudioStatus,
      })
      .from(schema.taskItems)
      .where(eq(schema.taskItems.weeklyTaskId, sourceTask.id))
      .orderBy(schema.taskItems.orderIndex);

    if (!sourceItems.length) {
      return fail("Source task has no items", 400, { sourceTaskId: payload.sourceTaskId });
    }

    // Delete existing items from target task
    await db
      .delete(schema.taskItems)
      .where(eq(schema.taskItems.weeklyTaskId, targetTask.id));

    // Copy task items to the target task
    const newItems = sourceItems.map((item) => ({
      weeklyTaskId: targetTask.id,
      orderIndex: item.orderIndex,
      sentenceText: item.sentenceText,
      referenceAudioUrl: item.referenceAudioUrl,
      referenceAudioStatus: item.referenceAudioStatus,
    }));

    await db.insert(schema.taskItems).values(newItems);

    return ok({ message: "Task items copied successfully", itemCount: newItems.length });
  } catch (error) {
    return fromError(error);
  }
}
