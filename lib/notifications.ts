import { renderToStaticMarkup } from "react-dom/server";
import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { resend, isEmailConfigured } from "@/lib/email";
import { getActiveFamilyToken } from "@/lib/family-link";
import { TaskPublishedEmail } from "@/lib/email-templates/task-published";

/**
 * Get all families enrolled in a specific class-course who have email notifications enabled.
 *
 * @param classCourseId - ID of the class-course to get families for
 * @returns Array of family records with email, parent name, and preferences
 *
 * @example
 * ```ts
 * const families = await getFamiliesForNotification('class-course-123');
 * console.log(`Found ${families.length} families to notify`);
 * ```
 */
export async function getFamiliesForNotification(classCourseId: string) {
  const families = await db
    .select({
      id: schema.families.id,
      email: schema.families.email,
      parentName: schema.families.parentName,
      emailEnabled: schema.notificationPreferences.emailEnabled,
    })
    .from(schema.families)
    .leftJoin(
      schema.notificationPreferences,
      eq(schema.notificationPreferences.familyId, schema.families.id),
    )
    .where(eq(schema.families.classCourseId, classCourseId));

  // Filter families that have email and haven't opted out
  return families.filter((family) => {
    // If no preferences record exists, default to emailEnabled: true
    const emailEnabled = family.emailEnabled ?? true;
    return family.email && emailEnabled;
  });
}

/**
 * Create notification tracking records for a weekly task.
 *
 * Creates a record in task_notifications table for each family that should
 * receive a notification. Initial status is 'pending'.
 *
 * @param weeklyTaskId - ID of the weekly task
 * @param familyIds - Array of family IDs to create notifications for
 * @returns Array of created notification records
 *
 * @example
 * ```ts
 * const notifications = await createNotificationRecords('task-123', ['family-1', 'family-2']);
 * console.log(`Created ${notifications.length} notification records`);
 * ```
 */
export async function createNotificationRecords(weeklyTaskId: string, familyIds: string[]) {
  if (familyIds.length === 0) {
    return [];
  }

  const notificationValues = familyIds.map((familyId) => ({
    weeklyTaskId,
    familyId,
    status: "pending" as const,
  }));

  return await db
    .insert(schema.taskNotifications)
    .values(notificationValues)
    .returning();
}

/**
 * Update notification status to 'sent' or 'failed'.
 *
 * @param notificationId - ID of the notification record to update
 * @param status - New status ('sent' or 'failed')
 * @param error - Optional error message if status is 'failed'
 *
 * @example
 * ```ts
 * await updateNotificationStatus('notif-123', 'sent');
 * await updateNotificationStatus('notif-456', 'failed', 'Invalid email address');
 * ```
 */
export async function updateNotificationStatus(
  notificationId: string,
  status: "sent" | "failed",
  error?: string,
) {
  const updateData: {
    status: "sent" | "failed";
    sentAt?: Date;
    error?: string;
  } = {
    status,
  };

  if (status === "sent") {
    updateData.sentAt = new Date();
  }

  if (error) {
    updateData.error = error;
  }

  await db
    .update(schema.taskNotifications)
    .set(updateData)
    .where(eq(schema.taskNotifications.id, notificationId));
}

/**
 * Send email notification for a published weekly task.
 *
 * This function:
 * 1. Fetches the weekly task details
 * 2. Gets all families in the class-course with notifications enabled
 * 3. Creates notification tracking records
 * 4. Sends emails to each family with their unique portal link
 * 5. Updates notification status (sent/failed)
 *
 * @param weeklyTaskId - ID of the weekly task that was published
 * @returns Object with total families, emails sent, and failed count
 * @throws {Error} If weekly task is not found or email service is not configured
 *
 * @example
 * ```ts
 * const result = await sendTaskPublishedNotification('task-123');
 * console.log(`Sent ${result.sent} emails, ${result.failed} failed`);
 * ```
 */
export async function sendTaskPublishedNotification(weeklyTaskId: string) {
  // Check if email service is configured
  if (!isEmailConfigured()) {
    throw new Error("Email service not configured. Set RESEND_API_KEY in environment.");
  }

  // Fetch weekly task details with class-course information
  const [weeklyTask] = await db
    .select({
      id: schema.weeklyTasks.id,
      classCourseId: schema.weeklyTasks.classCourseId,
      weekStart: schema.weeklyTasks.weekStart,
      weekEnd: schema.weeklyTasks.weekEnd,
      status: schema.weeklyTasks.status,
      className: schema.classes.name,
      courseName: schema.courses.name,
    })
    .from(schema.weeklyTasks)
    .innerJoin(schema.classCourses, eq(schema.weeklyTasks.classCourseId, schema.classCourses.id))
    .innerJoin(schema.classes, eq(schema.classCourses.classId, schema.classes.id))
    .innerJoin(schema.courses, eq(schema.classCourses.courseId, schema.courses.id))
    .where(eq(schema.weeklyTasks.id, weeklyTaskId))
    .limit(1);

  if (!weeklyTask) {
    throw new Error(`Weekly task ${weeklyTaskId} not found`);
  }

  // Get families eligible for notification
  const families = await getFamiliesForNotification(weeklyTask.classCourseId);

  if (families.length === 0) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      message: "No families with email addresses found for this class-course",
    };
  }

  // Create notification tracking records
  const familyIds = families.map((f) => f.id);
  const notifications = await createNotificationRecords(weeklyTaskId, familyIds);

  // Create a map of familyId -> notificationId for status updates
  const notificationMap = new Map(notifications.map((n) => [n.familyId, n.id]));

  // Send emails
  let sent = 0;
  let failed = 0;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const family of families) {
    const notificationId = notificationMap.get(family.id);
    if (!notificationId) {
      continue; // Should not happen, but safety check
    }

    try {
      // Get or create family portal token
      const token = await getActiveFamilyToken(family.id);
      if (!token) {
        throw new Error("Failed to retrieve family portal token");
      }

      const familyPortalUrl = `${baseUrl}/family/${token}`;
      const optOutUrl = `${baseUrl}/family/preferences?token=${token}`;

      // Format dates for display
      const taskWeekStart = weeklyTask.weekStart.toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const taskWeekEnd = weeklyTask.weekEnd.toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const classCourse = `${weeklyTask.className} - ${weeklyTask.courseName}`;

      // Render email template
      const emailHtml = renderToStaticMarkup(
        TaskPublishedEmail({
          parentName: family.parentName,
          taskWeekStart,
          taskWeekEnd,
          classCourse,
          familyPortalUrl,
          optOutUrl,
        }),
      );

      // Send email via Resend
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "notifications@example.com",
        to: family.email!,
        subject: "新任務已發布 - 本週英語學習任務",
        html: emailHtml,
      });

      // Update notification status to sent
      await updateNotificationStatus(notificationId, "sent");
      sent++;
    } catch (error) {
      // Update notification status to failed with error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await updateNotificationStatus(notificationId, "failed", errorMessage);
      failed++;

      // Log error but continue sending to other families
      console.error(`Failed to send notification to family ${family.id}:`, errorMessage);
    }
  }

  return {
    total: families.length,
    sent,
    failed,
    message: `Sent ${sent} notifications, ${failed} failed`,
  };
}

/**
 * Get notification status for a specific weekly task.
 *
 * Returns a summary of notification status including counts by status
 * and detailed records for each family.
 *
 * @param weeklyTaskId - ID of the weekly task
 * @returns Notification status summary and detailed records
 *
 * @example
 * ```ts
 * const status = await getTaskNotificationStatus('task-123');
 * console.log(`Sent: ${status.summary.sent}, Pending: ${status.summary.pending}`);
 * ```
 */
export async function getTaskNotificationStatus(weeklyTaskId: string) {
  const notifications = await db
    .select({
      id: schema.taskNotifications.id,
      familyId: schema.taskNotifications.familyId,
      status: schema.taskNotifications.status,
      sentAt: schema.taskNotifications.sentAt,
      error: schema.taskNotifications.error,
      createdAt: schema.taskNotifications.createdAt,
      parentName: schema.families.parentName,
      email: schema.families.email,
    })
    .from(schema.taskNotifications)
    .innerJoin(schema.families, eq(schema.taskNotifications.familyId, schema.families.id))
    .where(eq(schema.taskNotifications.weeklyTaskId, weeklyTaskId));

  const summary = {
    total: notifications.length,
    sent: notifications.filter((n) => n.status === "sent").length,
    pending: notifications.filter((n) => n.status === "pending").length,
    failed: notifications.filter((n) => n.status === "failed").length,
  };

  return {
    summary,
    notifications,
  };
}
