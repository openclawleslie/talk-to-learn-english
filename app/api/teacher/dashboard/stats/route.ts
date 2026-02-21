import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { getCurrentWeekRange } from "@/lib/week";

export async function GET() {
  try {
    const session = await requireTeacher();
    const { weekStart, weekEnd } = getCurrentWeekRange();

    // Get teacher's assigned class courses
    const teacherAssignments = await db
      .select({ classCourseId: schema.teacherAssignments.classCourseId })
      .from(schema.teacherAssignments)
      .where(eq(schema.teacherAssignments.teacherId, session.teacherId));

    const classCourseIds = teacherAssignments.map((item) => item.classCourseId);

    if (!classCourseIds.length) {
      return ok({
        totalSubmissionsThisWeek: 0,
        averageScore: 0,
        starDistribution: { oneStar: 0, twoStar: 0, threeStar: 0 },
        studentsNotSubmitted: [],
        recentCompletions: [],
      });
    }

    // Get all families for these class courses
    const families = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(inArray(schema.families.classCourseId, classCourseIds));

    const familyIds = families.map((item) => item.id);

    if (!familyIds.length) {
      return ok({
        totalSubmissionsThisWeek: 0,
        averageScore: 0,
        starDistribution: { oneStar: 0, twoStar: 0, threeStar: 0 },
        studentsNotSubmitted: [],
        recentCompletions: [],
      });
    }

    // Get all students for these families
    const students = await db
      .select({ id: schema.students.id, name: schema.students.name })
      .from(schema.students)
      .where(inArray(schema.students.familyId, familyIds));

    const studentIds = students.map((item) => item.id);

    if (!studentIds.length) {
      return ok({
        totalSubmissionsThisWeek: 0,
        averageScore: 0,
        starDistribution: { oneStar: 0, twoStar: 0, threeStar: 0 },
        studentsNotSubmitted: [],
        recentCompletions: [],
      });
    }

    // Get submissions for this week
    const weeklySubmissions = await db
      .select({
        studentId: schema.submissions.studentId,
        score: schema.submissions.score,
        stars: schema.submissions.stars,
      })
      .from(schema.submissions)
      .where(
        and(
          inArray(schema.submissions.studentId, studentIds),
          gte(schema.submissions.createdAt, weekStart),
          lte(schema.submissions.createdAt, weekEnd)
        )
      );

    // Calculate statistics
    const totalSubmissionsThisWeek = weeklySubmissions.length;
    const averageScore = totalSubmissionsThisWeek > 0
      ? weeklySubmissions.reduce((sum, s) => sum + s.score, 0) / totalSubmissionsThisWeek
      : 0;

    // Calculate star distribution
    const starDistribution = {
      oneStar: weeklySubmissions.filter((s) => s.stars === 1).length,
      twoStar: weeklySubmissions.filter((s) => s.stars === 2).length,
      threeStar: weeklySubmissions.filter((s) => s.stars === 3).length,
    };

    // Find students who haven't submitted this week
    const studentsWhoSubmitted = new Set(weeklySubmissions.map((s) => s.studentId));
    const studentsNotSubmitted = students
      .filter((student) => !studentsWhoSubmitted.has(student.id))
      .map((student) => ({
        id: student.id,
        name: student.name,
      }));

    // Get recent completions (last 10 submissions)
    const recentCompletionsData = await db
      .select({
        studentId: schema.submissions.studentId,
        studentName: schema.students.name,
        stars: schema.submissions.stars,
        score: schema.submissions.score,
        createdAt: schema.submissions.createdAt,
      })
      .from(schema.submissions)
      .innerJoin(schema.students, eq(schema.submissions.studentId, schema.students.id))
      .where(inArray(schema.submissions.studentId, studentIds))
      .orderBy(desc(schema.submissions.createdAt))
      .limit(10);

    const recentCompletions = recentCompletionsData.map((item) => ({
      studentName: item.studentName,
      stars: item.stars,
      score: item.score,
      completedAt: item.createdAt,
    }));

    return ok({
      totalSubmissionsThisWeek,
      averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal place
      starDistribution,
      studentsNotSubmitted,
      recentCompletions,
    });
  } catch (error) {
    return fromError(error);
  }
}
