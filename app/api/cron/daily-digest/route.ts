import { and, eq, gte, lte } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { sendDailyDigest } from "@/lib/notifications";

export async function GET() {
  try {
    // Calculate yesterday's date range (Asia/Taipei timezone)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get start of yesterday (00:00:00)
    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(0, 0, 0, 0);

    // Get end of yesterday (23:59:59)
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Query all submissions from yesterday with student, task item, and family data
    const yesterdaySubmissions = await db
      .select({
        submissionId: schema.submissions.id,
        studentId: schema.submissions.studentId,
        studentName: schema.students.name,
        stars: schema.submissions.stars,
        createdAt: schema.submissions.createdAt,
        sentenceText: schema.taskItems.sentenceText,
        familyId: schema.families.id,
        parentEmail: schema.families.parentEmail,
        notificationPreference: schema.families.notificationPreference,
      })
      .from(schema.submissions)
      .innerJoin(schema.students, eq(schema.submissions.studentId, schema.students.id))
      .innerJoin(schema.taskItems, eq(schema.submissions.taskItemId, schema.taskItems.id))
      .innerJoin(schema.families, eq(schema.students.familyId, schema.families.id))
      .where(
        and(
          gte(schema.submissions.createdAt, yesterdayStart),
          lte(schema.submissions.createdAt, yesterdayEnd)
        )
      );

    // Group submissions by family
    const familyCompletions = new Map<
      string,
      {
        familyId: string;
        parentEmail: string | null;
        notificationPreference: "all" | "weekly_summary" | "none";
        completions: Array<{
          studentName: string;
          stars: number;
          timestamp: Date;
          sentenceText: string;
        }>;
      }
    >();

    for (const submission of yesterdaySubmissions) {
      if (!familyCompletions.has(submission.familyId)) {
        familyCompletions.set(submission.familyId, {
          familyId: submission.familyId,
          parentEmail: submission.parentEmail,
          notificationPreference: submission.notificationPreference,
          completions: [],
        });
      }

      familyCompletions.get(submission.familyId)!.completions.push({
        studentName: submission.studentName,
        stars: submission.stars,
        timestamp: submission.createdAt,
        sentenceText: submission.sentenceText,
      });
    }

    // Send daily digest emails to families with weekly_summary preference
    const results = {
      totalFamilies: familyCompletions.size,
      emailsSent: 0,
      errors: 0,
    };

    for (const [, familyData] of familyCompletions) {
      // Only send to families with weekly_summary preference and valid parent email
      if (
        familyData.notificationPreference === "weekly_summary" &&
        familyData.parentEmail
      ) {
        try {
          const emailId = await sendDailyDigest(familyData.parentEmail, {
            completions: familyData.completions,
            date: yesterday,
          });

          if (emailId) {
            // Log successful notification
            await db.insert(schema.notificationLogs).values({
              familyId: familyData.familyId,
              notificationType: "weekly_summary",
              sentTo: familyData.parentEmail,
              metadata: {
                emailId,
                date: yesterday.toISOString(),
                completionCount: familyData.completions.length,
              },
            });

            results.emailsSent++;
          }
        } catch (error) {
          console.error(
            `Failed to send daily digest to family ${familyData.familyId}:`,
            error
          );
          results.errors++;
        }
      }
    }

    return ok({
      success: true,
      date: yesterday.toISOString(),
      results,
    });
  } catch (error) {
    return fromError(error);
  }
}
