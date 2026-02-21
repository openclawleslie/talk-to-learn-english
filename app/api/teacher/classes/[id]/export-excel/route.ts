import { and, eq, inArray, lt } from "drizzle-orm";
import * as XLSX from "xlsx";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, fail } from "@/lib/http";

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

    // Initialize data structure
    const className = classInfo?.name || "";
    const courseName = courseInfo?.name || "";
    let totalStudents = 0;
    let completionRate = 0;
    let averageScore = 0;
    const studentStats: Array<{
      studentId: string;
      studentName: string;
      completedTasks: number;
      totalTasks: number;
      averageScore: number;
      lowScoreSentences: number;
    }> = [];
    const lowScoreItemsWithDetails: Array<{
      taskItemId: string;
      studentId: string;
      score: number;
      feedback: string | null;
      audioUrl: string | null;
      sentenceText: string;
      studentName: string;
    }> = [];

    if (familyIds.length > 0) {
      const students = await db
        .select({ id: schema.students.id, name: schema.students.name })
        .from(schema.students)
        .where(inArray(schema.students.familyId, familyIds));

      const studentIds = students.map((item) => item.id);

      if (studentIds.length > 0) {
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
        studentStats.push(
          ...students.map((student) => {
            const studentSubs = allSubmissions.filter((s) => s.studentId === student.id);
            const avgScore =
              studentSubs.length > 0 ? studentSubs.reduce((sum, s) => sum + s.score, 0) / studentSubs.length : 0;
            const lowScoreCount = studentSubs.filter((s) => s.score < 70).length;
            return {
              studentId: student.id,
              studentName: student.name,
              completedTasks: studentSubs.length,
              totalTasks: taskItemsCount,
              averageScore: avgScore,
              lowScoreSentences: lowScoreCount,
            };
          })
        );

        // Overall metrics
        const totalSubmissions = allSubmissions.length;
        const overallAvg =
          totalSubmissions > 0 ? allSubmissions.reduce((sum, s) => sum + s.score, 0) / totalSubmissions : 0;
        const completedStudents = new Set(allSubmissions.map((s) => s.studentId)).size;
        totalStudents = students.length;
        completionRate = students.length > 0 ? (completedStudents / students.length) * 100 : 0;
        averageScore = overallAvg;

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
        const taskItems =
          taskItemIds.length > 0
            ? await db
                .select({ id: schema.taskItems.id, sentenceText: schema.taskItems.sentenceText })
                .from(schema.taskItems)
                .where(inArray(schema.taskItems.id, taskItemIds))
            : [];

        const taskItemMap = new Map(taskItems.map((t) => [t.id, t.sentenceText]));
        const studentMap = new Map(students.map((s) => [s.id, s.name]));

        lowScoreItemsWithDetails.push(
          ...lowScoreItems.map((item) => ({
            ...item,
            sentenceText: taskItemMap.get(item.taskItemId) || "",
            studentName: studentMap.get(item.studentId) || "",
          }))
        );
      }
    }

    // Generate Excel workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Class Progress Report"],
      [],
      ["Class:", className],
      ["Course:", courseName],
      ["Generated:", new Date().toLocaleDateString()],
      [],
      ["Overall Statistics"],
      ["Total Students:", totalStudents],
      ["Completion Rate:", `${completionRate.toFixed(1)}%`],
      ["Average Score:", averageScore.toFixed(1)],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Student Performance sheet
    if (studentStats.length > 0) {
      const studentData = [
        ["Student Name", "Completed Tasks", "Total Tasks", "Average Score", "Low Score Sentences"],
        ...studentStats.map((s) => [
          s.studentName,
          s.completedTasks,
          s.totalTasks,
          s.averageScore.toFixed(1),
          s.lowScoreSentences,
        ]),
      ];
      const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
      XLSX.utils.book_append_sheet(workbook, studentSheet, "Student Performance");
    }

    // Low Score Items sheet
    if (lowScoreItemsWithDetails.length > 0) {
      const lowScoreData = [
        ["Student Name", "Score", "Sentence Text", "Feedback"],
        ...lowScoreItemsWithDetails.map((item) => [
          item.studentName,
          item.score,
          item.sentenceText,
          item.feedback || "",
        ]),
      ];
      const lowScoreSheet = XLSX.utils.aoa_to_sheet(lowScoreData);
      XLSX.utils.book_append_sheet(workbook, lowScoreSheet, "Items Needing Attention");
    }

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return Excel response
    return new Response(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="class-report-${className.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}
