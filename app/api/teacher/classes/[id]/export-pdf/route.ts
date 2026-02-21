import { and, eq, inArray, lt } from "drizzle-orm";
import jsPDF from "jspdf";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { createCanvas } from "canvas";

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

    // Generate chart image for PDF
    let chartImage = "";
    if (studentStats.length > 0) {
      const canvas = createCanvas(400, 300);
      const ctx = canvas.getContext("2d");

      const chartConfig: ChartConfiguration = {
        type: "bar",
        data: {
          labels: studentStats.map((s) => s.studentName),
          datasets: [
            {
              label: "Average Score",
              data: studentStats.map((s) => s.averageScore),
              backgroundColor: "rgba(54, 162, 235, 0.5)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
            {
              label: "Completion Rate (%)",
              data: studentStats.map((s) => (s.completedTasks / s.totalTasks) * 100),
              backgroundColor: "rgba(75, 192, 192, 0.5)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
            },
          },
        },
      };

      const chart = new Chart(ctx, chartConfig);
      chartImage = canvas.toDataURL("image/png");
      chart.destroy(); // Clean up
    }

    // Generate PDF
    const pdf = new jsPDF();
    let yPosition = 20;

    // Title
    pdf.setFontSize(18);
    pdf.text("Class Progress Report", 105, yPosition, { align: "center" });
    yPosition += 15;

    // Class and Course Info
    pdf.setFontSize(12);
    pdf.text(`Class: ${className}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Course: ${courseName}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 15;

    // Overall Stats
    pdf.setFontSize(14);
    pdf.text("Overall Statistics", 20, yPosition);
    yPosition += 10;
    pdf.setFontSize(11);
    pdf.text(`Total Students: ${totalStudents}`, 20, yPosition);
    yPosition += 7;
    pdf.text(`Completion Rate: ${completionRate.toFixed(1)}%`, 20, yPosition);
    yPosition += 7;
    pdf.text(`Average Score: ${averageScore.toFixed(1)}`, 20, yPosition);
    yPosition += 15;

    // Add performance chart
    if (chartImage && studentStats.length > 0) {
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text("Performance Chart", 20, yPosition);
      yPosition += 10;

      // Add chart image to PDF
      pdf.addImage(chartImage, "PNG", 20, yPosition, 170, 120);
      yPosition += 130;
    }

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
    if (lowScoreItemsWithDetails.length > 0) {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text("Items Needing Attention (Score < 70)", 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(9);

      for (const item of lowScoreItemsWithDetails) {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }

        const text = `${item.studentName} (${item.score}): ${item.sentenceText.substring(0, 60)}${item.sentenceText.length > 60 ? "..." : ""}`;
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
        "Content-Disposition": `attachment; filename="class-report-${className.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}
