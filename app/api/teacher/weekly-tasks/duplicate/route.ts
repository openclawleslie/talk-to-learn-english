import { and, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fail, fromError, ok } from "@/lib/http";
import { duplicateTaskSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await requireTeacher();
    const payload = duplicateTaskSchema.parse(await request.json());

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
        status: schema.weeklyTasks.status,
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

    // Verify target class course exists and teacher has access to it
    if (!assignedClassCourseIds.includes(payload.targetClassCourseId)) {
      return fail("Teacher does not have access to target class course", 403);
    }

    const [targetClassCourse] = await db
      .select({ id: schema.classCourses.id })
      .from(schema.classCourses)
      .where(eq(schema.classCourses.id, payload.targetClassCourseId))
      .limit(1);

    if (!targetClassCourse) {
      return fail("Target class course not found", 404, { targetClassCourseId: payload.targetClassCourseId });
    }

    // Check if a task already exists for the target class course and week
    const [existingTask] = await db
      .select({ id: schema.weeklyTasks.id })
      .from(schema.weeklyTasks)
      .where(
        and(
          eq(schema.weeklyTasks.classCourseId, payload.targetClassCourseId),
          eq(schema.weeklyTasks.weekStart, new Date(payload.weekStart)),
        ),
      )
      .limit(1);

    if (existingTask) {
      return fail("Weekly task already exists for target class course and week", 409, {
        targetClassCourseId: payload.targetClassCourseId,
        weekStart: payload.weekStart,
      });
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

    // Create the new task
    const [newTask] = await db
      .insert(schema.weeklyTasks)
      .values({
        classCourseId: payload.targetClassCourseId,
        weekStart: new Date(payload.weekStart),
        weekEnd: new Date(payload.weekEnd),
        status: "draft",
        createdByAdmin: session.teacherId,
      })
      .returning();

    // Copy task items to the new task
    const newItems = sourceItems.map((item) => ({
      weeklyTaskId: newTask.id,
      orderIndex: item.orderIndex,
      sentenceText: item.sentenceText,
      referenceAudioUrl: item.referenceAudioUrl,
      referenceAudioStatus: item.referenceAudioStatus,
    }));

    await db.insert(schema.taskItems).values(newItems);

    return ok({ task: newTask }, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
