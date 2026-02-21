import { and, eq, inArray, lt } from "drizzle-orm";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

import { db, schema } from "@/lib/db/client";
import { resolveFamilyByToken } from "@/lib/family-link";
import { fromError, fail } from "@/lib/http";

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
      return fail("No students found", 404);
    }

    const studentIds = students.map((student) => student.id);

    const submissions = await db
      .select({
        studentId: schema.submissions.studentId,
        taskItemId: schema.submissions.taskItemId,
        score: schema.submissions.score,
        feedback: schema.submissions.feedback,
        createdAt: schema.submissions.createdAt,
      })
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

    // Calculate per-student stats
    const studentStats = students.map((student) => {
      const studentSubs = submissions.filter((s) => s.studentId === student.id);
      const avgScore = studentSubs.length > 0 ? studentSubs.reduce((sum, s) => sum + s.score, 0) / studentSubs.length : 0;
      const lowScoreCount = studentSubs.filter((s) => s.score < 70).length;
      return {
        studentName: student.name,
        completedTasks: studentSubs.length,
        totalTasks: 10,
        averageScore: avgScore,
        lowScoreSentences: lowScoreCount,
      };
    });

    // Overall metrics
    const totalSubmissions = submissions.length;
    const overallAvg = totalSubmissions > 0 ? submissions.reduce((sum, s) => sum + s.score, 0) / totalSubmissions : 0;
    const completionRate = students.length > 0 ? (submissions.length / (students.length * 10)) * 100 : 0;

    // Generate Excel workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Family Progress Report"],
      [],
      ["Generated:", new Date().toLocaleDateString()],
      [],
      ["Overall Statistics"],
      ["Total Students:", students.length],
      ["Completion Rate:", `${completionRate.toFixed(1)}%`],
      ["Average Score:", overallAvg.toFixed(1)],
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
    if (lowScoreItems.length > 0) {
      const lowScoreData = [
        ["Student Name", "Score", "Sentence Text", "Feedback"],
        ...lowScoreItems.map((item) => [
          studentMap.get(item.studentId) || "",
          item.score,
          taskItemMap.get(item.taskItemId) || "",
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
        "Content-Disposition": `attachment; filename="family-report-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}
