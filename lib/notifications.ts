import { Resend } from "resend";
import { env } from "./env";

/**
 * Resend email service client.
 *
 * Initialized with the RESEND_API_KEY from environment variables.
 * Used for sending notification emails to parents and teachers.
 *
 * @internal
 */
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Data required for formatting a practice completion notification email.
 */
export interface CompletionEmailData {
  studentName: string;
  stars: number;
  timestamp: Date;
  sentenceText: string;
}

/**
 * Formats a practice completion notification email in Traditional Chinese.
 *
 * Creates an HTML email with the student's name, star rating earned,
 * completion timestamp, and the practice sentence. All text is in
 * Traditional Chinese (Taiwan).
 *
 * @param data - Completion data including student name, stars, timestamp, and sentence
 * @returns HTML string for the email body
 *
 * @example
 * ```ts
 * const html = formatNotificationEmail({
 *   studentName: "小明",
 *   stars: 3,
 *   timestamp: new Date(),
 *   sentenceText: "Hello, how are you?"
 * });
 * ```
 */
export function formatNotificationEmail(data: CompletionEmailData): string {
  const { studentName, stars, timestamp, sentenceText } = data;

  // Format timestamp in Traditional Chinese locale
  const formattedDate = timestamp.toLocaleString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Taipei",
  });

  // Create star rating display (★★★ or ★★☆ etc.)
  const starDisplay = "★".repeat(stars) + "☆".repeat(3 - stars);

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>練習完成通知</title>
</head>
<body style="font-family: 'Microsoft JhengHei', 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">🎉 練習完成通知</h1>
    <p style="font-size: 16px; margin-bottom: 8px;">
      <strong>${studentName}</strong> 已完成一項練習！
    </p>
  </div>

  <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">練習詳情</h2>

    <div style="margin-bottom: 16px;">
      <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">練習內容</p>
      <p style="margin: 4px 0; font-size: 16px; font-style: italic;">"${sentenceText}"</p>
    </div>

    <div style="margin-bottom: 16px;">
      <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">星級評分</p>
      <p style="margin: 4px 0; font-size: 28px; color: #fbbf24;">${starDisplay}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">${stars} / 3 顆星</p>
    </div>

    <div style="margin-bottom: 0;">
      <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">完成時間</p>
      <p style="margin: 4px 0; font-size: 16px;">${formattedDate}</p>
    </div>
  </div>

  <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 20px;">
    <p style="margin: 0; font-size: 14px; color: #166534;">
      <strong>太棒了！</strong> 繼續保持練習，英語能力會越來越好！
    </p>
  </div>

  <div style="text-align: center; color: #9ca3af; font-size: 12px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 4px 0;">此為系統自動發送的通知郵件</p>
    <p style="margin: 4px 0;">如需調整通知設定，請聯繫您的老師</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends a practice completion notification email to a parent.
 *
 * Sends an email notification when a student completes a practice item.
 * Only sends if Resend is configured (RESEND_API_KEY is set).
 * Returns the Resend email ID on success, or null if email service is not configured.
 *
 * @param to - Recipient email address (parent email)
 * @param data - Completion data to include in the email
 * @returns Promise resolving to the Resend email ID or null if not configured
 * @throws {Error} If email sending fails
 *
 * @example
 * ```ts
 * await sendCompletionNotification("parent@example.com", {
 *   studentName: "小明",
 *   stars: 3,
 *   timestamp: new Date(),
 *   sentenceText: "Hello, how are you?"
 * });
 * ```
 */
export async function sendCompletionNotification(
  to: string,
  data: CompletionEmailData,
): Promise<string | null> {
  if (!resend) {
    console.warn("Resend not configured - skipping notification email");
    return null;
  }

  const html = formatNotificationEmail(data);

  try {
    const result = await resend.emails.send({
      from: "Talk to Learn English <notifications@yourdomain.com>",
      to,
      subject: `🎉 ${data.studentName} 完成了練習！`,
      html,
    });

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    return result.data?.id || null;
  } catch (error) {
    console.error("Error sending completion notification:", error);
    throw error;
  }
}
