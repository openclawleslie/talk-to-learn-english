import { and, eq, gte, inArray } from "drizzle-orm";
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
      return ok({ weeks: [], studentNames: {} });
    }

    const studentIds = students.map((student) => student.id);
    const studentNames = Object.fromEntries(students.map((s) => [s.id, s.name]));

    // Calculate date 8 weeks ago
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7);

    // Get all submissions with their weekly task info from the past 8 weeks
    const submissionsWithWeeks = await db
      .select({
        submissionId: schema.submissions.id,
        studentId: schema.submissions.studentId,
        score: schema.submissions.score,
        stars: schema.submissions.stars,
        weekStart: schema.weeklyTasks.weekStart,
        weekEnd: schema.weeklyTasks.weekEnd,
      })
      .from(schema.submissions)
      .innerJoin(schema.taskItems, eq(schema.submissions.taskItemId, schema.taskItems.id))
      .innerJoin(schema.weeklyTasks, eq(schema.taskItems.weeklyTaskId, schema.weeklyTasks.id))
      .where(
        and(
          inArray(schema.submissions.studentId, studentIds),
          gte(schema.weeklyTasks.weekStart, eightWeeksAgo),
        ),
      );

    // Group submissions by week
    const weekMap = new Map<
      string,
      {
        weekStart: Date;
        weekEnd: Date;
        scores: number[];
        stars: number[];
        submissionCount: number;
      }
    >();

    for (const sub of submissionsWithWeeks) {
      const weekKey = sub.weekStart.toISOString();
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekStart: sub.weekStart,
          weekEnd: sub.weekEnd,
          scores: [],
          stars: [],
          submissionCount: 0,
        });
      }
      const week = weekMap.get(weekKey)!;
      week.scores.push(sub.score);
      week.stars.push(sub.stars);
      week.submissionCount++;
    }

    // Calculate weekly averages and completion rates
    const weeks = Array.from(weekMap.values())
      .map((week) => {
        const avgScore = week.scores.length > 0 ? week.scores.reduce((a, b) => a + b, 0) / week.scores.length : 0;
        const avgStars = week.stars.length > 0 ? week.stars.reduce((a, b) => a + b, 0) / week.stars.length : 0;

        // Completion rate: submissions / (students * task items per week)
        // For now, we'll use a simple ratio based on submissions
        const completionRate = week.submissionCount / students.length;

        return {
          weekStart: week.weekStart.toISOString(),
          weekEnd: week.weekEnd.toISOString(),
          avgScore: Math.round(avgScore * 100) / 100,
          avgStars: Math.round(avgStars * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100,
          submissionCount: week.submissionCount,
        };
      })
      .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());

    return ok({
      weeks,
      studentNames,
    });
  } catch (error) {
    return fromError(error);
  }
}
