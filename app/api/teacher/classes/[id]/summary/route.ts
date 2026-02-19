import { and, avg, count, eq, inArray, lt, sql } from "drizzle-orm";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, fail, ok } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireTeacher();
    const { id } = await params;

    const [assignment] = await db
      .select({ id: schema.teacherAssignments.id })
      .from(schema.teacherAssignments)
      .where(and(eq(schema.teacherAssignments.teacherId, session.teacherId), eq(schema.teacherAssignments.classCourseId, id)))
      .limit(1);

    if (!assignment) {
      return fail("Forbidden class/course", 403);
    }

    // Get class and course info
    const [classCourse] = await db
      .select({
        classId: schema.classCourses.classId,
        courseId: schema.classCourses.courseId,
      })
      .from(schema.classCourses)
      .where(eq(schema.classCourses.id, id))
      .limit(1);

    const [classInfo] = await db
      .select({ name: schema.classes.name })
      .from(schema.classes)
      .where(eq(schema.classes.id, classCourse.classId))
      .limit(1);

    const [courseInfo] = await db
      .select({ name: schema.courses.name })
      .from(schema.courses)
      .where(eq(schema.courses.id, classCourse.courseId))
      .limit(1);

    const families = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.classCourseId, id));

    const familyIds = families.map((item) => item.id);

    if (!familyIds.length) {
      return ok({
        className: classInfo?.name || "",
        courseName: courseInfo?.name || "",
        totalStudents: 0,
        completionRate: 0,
        averageScore: 0,
        students: [],
        lowScoreItems: [],
      });
    }

    const students = await db
      .select({ id: schema.students.id, name: schema.students.name })
      .from(schema.students)
      .where(inArray(schema.students.familyId, familyIds));

    const studentIds = students.map((item) => item.id);
    if (!studentIds.length) {
      return ok({
        className: classInfo?.name || "",
        courseName: courseInfo?.name || "",
        totalStudents: 0,
        completionRate: 0,
        averageScore: 0,
        students: [],
        lowScoreItems: [],
      });
    }

    // Get all submissions for these students
    const allSubmissions = await db
      .select({
        studentId: schema.submissions.studentId,
        score: schema.submissions.score,
      })
      .from(schema.submissions)
      .where(inArray(schema.submissions.studentId, studentIds));

    // Get current week task items count
    const taskItemsCount = 10; // Fixed 10 items per week

    // Calculate per-student stats
    const studentStats = students.map((student) => {
      const studentSubs = allSubmissions.filter((s) => s.studentId === student.id);
      const avgScore = studentSubs.length > 0
        ? studentSubs.reduce((sum, s) => sum + s.score, 0) / studentSubs.length
        : 0;
      const lowScoreCount = studentSubs.filter((s) => s.score < 70).length;
      return {
        studentId: student.id,
        studentName: student.name,
        completedTasks: studentSubs.length,
        totalTasks: taskItemsCount,
        averageScore: avgScore,
        lowScoreSentences: lowScoreCount,
      };
    });

    // Overall metrics
    const totalSubmissions = allSubmissions.length;
    const overallAvg = totalSubmissions > 0
      ? allSubmissions.reduce((sum, s) => sum + s.score, 0) / totalSubmissions
      : 0;
    const completedStudents = new Set(allSubmissions.map((s) => s.studentId)).size;
    const completionRate = students.length > 0 ? (completedStudents / students.length) * 100 : 0;

    // Get low score items with details
    const lowScoreItems = await db
      .select({
        taskItemId: schema.submissions.taskItemId,
        studentId: schema.submissions.studentId,
        score: schema.submissions.score,
        feedback: schema.submissions.feedback,
        audioUrl: schema.submissions.audioUrl,
      })
      .from(schema.submissions)
      .where(and(inArray(schema.submissions.studentId, studentIds), lt(schema.submissions.score, 70)))
      .limit(20);

    // Get task item texts for low score items
    const taskItemIds = [...new Set(lowScoreItems.map((i) => i.taskItemId))];
    const taskItems = taskItemIds.length > 0
      ? await db
          .select({ id: schema.taskItems.id, sentenceText: schema.taskItems.sentenceText })
          .from(schema.taskItems)
          .where(inArray(schema.taskItems.id, taskItemIds))
      : [];

    const taskItemMap = new Map(taskItems.map((t) => [t.id, t.sentenceText]));
    const studentMap = new Map(students.map((s) => [s.id, s.name]));

    const lowScoreItemsWithDetails = lowScoreItems.map((item) => ({
      ...item,
      sentenceText: taskItemMap.get(item.taskItemId) || "",
      studentName: studentMap.get(item.studentId) || "",
    }));

    return ok({
      className: classInfo?.name || "",
      courseName: courseInfo?.name || "",
      totalStudents: students.length,
      completionRate,
      averageScore: overallAvg,
      students: studentStats,
      lowScoreItems: lowScoreItemsWithDetails,
    });
  } catch (error) {
    return fromError(error);
  }
}
