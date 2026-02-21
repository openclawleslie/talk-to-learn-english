import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { createReferenceSpeech } from "@/lib/ai";
import { requireAdmin } from "@/lib/auth";
import { uploadBuffer } from "@/lib/blob";
import { db, schema } from "@/lib/db/client";
import { fail, fromError, ok } from "@/lib/http";
import { weeklyTaskSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin();
    const tasks = await db
      .select({
        id: schema.weeklyTasks.id,
        class_course_id: schema.weeklyTasks.classCourseId,
        class_name: schema.classes.name,
        course_name: schema.courses.name,
        week_start: schema.weeklyTasks.weekStart,
        week_end: schema.weeklyTasks.weekEnd,
        status: schema.weeklyTasks.status,
        created_at: schema.weeklyTasks.weekStart, // Use weekStart as a proxy for created_at
      })
      .from(schema.weeklyTasks)
      .leftJoin(schema.classCourses, eq(schema.weeklyTasks.classCourseId, schema.classCourses.id))
      .leftJoin(schema.classes, eq(schema.classCourses.classId, schema.classes.id))
      .leftJoin(schema.courses, eq(schema.classCourses.courseId, schema.courses.id))
      .orderBy(schema.weeklyTasks.weekStart);
    return ok({ tasks });
  } catch (error) {
    return fromError(error);
  }
}

function formatDbError(error: unknown) {
  if (error instanceof Error) {
    const anyError = error as Error & {
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      schema?: string;
      column?: string;
      cause?: unknown;
    };
    return {
      message: anyError.message,
      code: anyError.code,
      detail: anyError.detail,
      constraint: anyError.constraint,
      table: anyError.table,
      schema: anyError.schema,
      column: anyError.column,
      cause: anyError.cause,
      stack: anyError.stack,
    };
  }

  return { message: "Unknown error type", raw: error };
}

export async function POST(request: NextRequest) {
  let payload: ReturnType<typeof weeklyTaskSchema.parse> | undefined;
  try {
    const session = await requireAdmin();
    payload = weeklyTaskSchema.parse(await request.json());
    let adminId = session.teacherId;

    if (!adminId) {
      const [adminTeacher] = await db
        .select({ id: schema.teachers.id })
        .from(schema.teachers)
        .where(eq(schema.teachers.isAdmin, true))
        .limit(1);
      adminId = adminTeacher?.id;
    }

    if (!adminId) {
      throw new Error("No admin record found for weekly task creator");
    }

    const [adminTeacher] = await db
      .select({ id: schema.teachers.id })
      .from(schema.teachers)
      .where(eq(schema.teachers.id, adminId))
      .limit(1);
    if (!adminTeacher) {
      return fail("Admin teacher not found", 400, { adminId });
    }

    const createdTasks = [];

    for (const classCourseId of payload.classCourseIds) {
      const [classCourse] = await db
        .select({ id: schema.classCourses.id })
        .from(schema.classCourses)
        .where(eq(schema.classCourses.id, classCourseId))
        .limit(1);
      if (!classCourse) {
        return fail("Class course not found", 400, { classCourseId });
      }

      const [existingTask] = await db
        .select({ id: schema.weeklyTasks.id })
        .from(schema.weeklyTasks)
        .where(and(
          eq(schema.weeklyTasks.classCourseId, classCourseId),
          eq(schema.weeklyTasks.weekStart, new Date(payload.weekStart)),
        ))
        .limit(1);
      if (existingTask) {
        return fail("Weekly task already exists", 409, {
          classCourseId,
          weekStart: payload.weekStart,
        });
      }

      const [task] = await db
        .insert(schema.weeklyTasks)
        .values({
          classCourseId,
          weekStart: new Date(payload.weekStart),
          weekEnd: new Date(payload.weekEnd),
          status: payload.status,
          createdByAdmin: adminId,
        })
        .returning();

      const itemRows: Array<{
        weeklyTaskId: string;
        orderIndex: number;
        sentenceText: string;
        referenceAudioUrl?: string;
        referenceAudioStatus: "ready" | "pending" | "failed";
      }> = [];
      for (const item of payload.items) {
        let referenceAudioUrl = item.referenceAudioUrl;
        let status: "ready" | "pending" | "failed" = item.referenceAudioUrl ? "ready" : "pending";

        if (!referenceAudioUrl) {
          const audio = await createReferenceSpeech(item.sentenceText);
          if (audio) {
            const upload = await uploadBuffer(`reference/${task.id}-${item.orderIndex}.mp3`, audio, "audio/mpeg");
            referenceAudioUrl = upload.url;
            status = "ready";
          }
        }

        itemRows.push({
          weeklyTaskId: task.id,
          orderIndex: item.orderIndex,
          sentenceText: item.sentenceText,
          referenceAudioUrl,
          referenceAudioStatus: status,
        });
      }

      const insertedItems = await db.insert(schema.taskItems).values(itemRows).returning();

      const tagRows: Array<{
        taskItemId: string;
        curriculumTagId: string;
      }> = [];
      for (const insertedItem of insertedItems) {
        const payloadItem = payload.items.find((item) => item.orderIndex === insertedItem.orderIndex);
        if (payloadItem) {
          for (const tagId of payloadItem.tagIds) {
            tagRows.push({
              taskItemId: insertedItem.id,
              curriculumTagId: tagId,
            });
          }
        }
      }

      if (tagRows.length > 0) {
        await db.insert(schema.taskItemTags).values(tagRows);
      }

      createdTasks.push(task);
    }

    return ok(createdTasks, { status: 201 });
  } catch (error) {
    const payloadSummary = payload
      ? {
          classCourseIdsCount: payload.classCourseIds.length,
          weekStart: payload.weekStart,
          weekEnd: payload.weekEnd,
          status: payload.status,
          itemsCount: payload.items.length,
        }
      : undefined;

    console.error("[admin.weekly-tasks.POST] failed", {
      error: formatDbError(error),
      payloadSummary,
    });
    return fromError(error);
  }
}
