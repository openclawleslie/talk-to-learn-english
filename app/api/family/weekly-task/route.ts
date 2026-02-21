import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db, schema } from "@/lib/db/client";
import { resolveFamilyByToken } from "@/lib/family-link";
import { fromError, fail, ok } from "@/lib/http";
import { getCurrentWeekRange } from "@/lib/week";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return fail("token is required", 400);
    }

    const link = await resolveFamilyByToken(token);
    if (!link) {
      return fail("Invalid link", 404);
    }

    const [family] = await db
      .select({ classCourseId: schema.families.classCourseId })
      .from(schema.families)
      .where(eq(schema.families.id, link.familyId))
      .limit(1);

    if (!family) {
      return fail("Family not found", 404);
    }

    const { weekStart, weekEnd } = getCurrentWeekRange();
    const [task] = await db
      .select()
      .from(schema.weeklyTasks)
      .where(
        and(
          eq(schema.weeklyTasks.classCourseId, family.classCourseId),
          gte(schema.weeklyTasks.weekStart, weekStart),
          lte(schema.weeklyTasks.weekEnd, weekEnd),
          eq(schema.weeklyTasks.status, "published"),
        ),
      )
      .orderBy(desc(schema.weeklyTasks.weekStart))
      .limit(1);

    if (!task) {
      return ok({ task: null, items: [], students: [] });
    }

    const items = await db
      .select()
      .from(schema.taskItems)
      .where(eq(schema.taskItems.weeklyTaskId, task.id))
      .orderBy(schema.taskItems.orderIndex);

    const students = await db
      .select({ id: schema.students.id, name: schema.students.name })
      .from(schema.students)
      .where(eq(schema.students.familyId, link.familyId));

    const studentIds = students.map((student) => student.id);
    const submissions = studentIds.length
      ? await db
          .select({
            id: schema.submissions.id,
            studentId: schema.submissions.studentId,
            taskItemId: schema.submissions.taskItemId,
            score: schema.submissions.score,
            stars: schema.submissions.stars,
            feedback: schema.submissions.feedback,
            audioUrl: schema.submissions.audioUrl,
            createdAt: schema.submissions.createdAt,
          })
          .from(schema.submissions)
          .where(and(inArray(schema.submissions.studentId, studentIds), inArray(schema.submissions.taskItemId, items.map((i) => i.id))))
          .orderBy(desc(schema.submissions.createdAt))
      : [];

    return ok({ task, items, students, submissions });
  } catch (error) {
    return fromError(error);
  }
}
