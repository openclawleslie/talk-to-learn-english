import { and, avg, eq, inArray, lt } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db, schema } from "@/lib/db/client";
import { resolveFamilyByToken } from "@/lib/family-link";
import { fromError, fail, ok } from "@/lib/http";

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

    const students = await db
      .select({ id: schema.students.id, name: schema.students.name })
      .from(schema.students)
      .where(eq(schema.students.familyId, link.familyId));

    if (!students.length) {
      return ok({ averageScore: 0, completionRate: 0, lowScoreItems: [], students: [] });
    }

    const studentIds = students.map((student) => student.id);

    const submissions = await db
      .select({
        id: schema.submissions.id,
        studentId: schema.submissions.studentId,
        taskItemId: schema.submissions.taskItemId,
        score: schema.submissions.score,
        stars: schema.submissions.stars,
        feedback: schema.submissions.feedback,
        createdAt: schema.submissions.createdAt,
      })
      .from(schema.submissions)
      .where(inArray(schema.submissions.studentId, studentIds));

    const [scoreRow] = await db
      .select({ averageScore: avg(schema.submissions.score) })
      .from(schema.submissions)
      .where(inArray(schema.submissions.studentId, studentIds));

    const lowScoreItems = await db
      .select({
        studentId: schema.submissions.studentId,
        taskItemId: schema.submissions.taskItemId,
        score: schema.submissions.score,
        feedback: schema.submissions.feedback,
      })
      .from(schema.submissions)
      .where(and(inArray(schema.submissions.studentId, studentIds), lt(schema.submissions.score, 70)))
      .limit(20);

    const completionRate = submissions.length / (students.length * 10);

    return ok({
      averageScore: Number(scoreRow.averageScore ?? 0),
      completionRate,
      lowScoreItems,
      students,
      submissions,
    });
  } catch (error) {
    return fromError(error);
  }
}
