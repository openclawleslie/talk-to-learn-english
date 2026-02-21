import { and, eq, inArray, lt } from "drizzle-orm";
import jsPDF from "jspdf";
import { NextRequest } from "next/server";

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

    // Generate PDF
    const pdf = new jsPDF();
    let yPosition = 20;

    // Title
    pdf.setFontSize(18);
    pdf.text("Family Progress Report", 105, yPosition, { align: "center" });
    yPosition += 15;

    // Report Info
    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 15;

    // Overall Stats
    pdf.setFontSize(14);
    pdf.text("Overall Statistics", 20, yPosition);
    yPosition += 10;
    pdf.setFontSize(11);
    pdf.text(`Total Students: ${students.length}`, 20, yPosition);
    yPosition += 7;
    pdf.text(`Completion Rate: ${completionRate.toFixed(1)}%`, 20, yPosition);
    yPosition += 7;
    pdf.text(`Average Score: ${overallAvg.toFixed(1)}`, 20, yPosition);
    yPosition += 15;

    // Student Details
    if (studentStats.length > 0) {
      pdf.setFontSize(14);
      pdf.text("Student Performance", 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(9);

      for (const student of studentStats) {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.text(
          `${student.studentName}: ${student.completedTasks}/${student.totalTasks} tasks, Avg: ${student.averageScore.toFixed(1)}, Low scores: ${student.lowScoreSentences}`,
          20,
          yPosition
        );
        yPosition += 6;
      }
      yPosition += 10;
    }

    // Low Score Items
    if (lowScoreItems.length > 0) {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text("Items Needing Attention (Score < 70)", 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(9);

      for (const item of lowScoreItems) {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }

        const studentName = studentMap.get(item.studentId) || "";
        const sentenceText = taskItemMap.get(item.taskItemId) || "";
        const text = `${studentName} (${item.score}): ${sentenceText.substring(0, 60)}${sentenceText.length > 60 ? "..." : ""}`;
        pdf.text(text, 20, yPosition);
        yPosition += 6;
      }
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    // Return PDF response
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="family-report-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}
