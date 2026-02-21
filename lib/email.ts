import { Resend } from "resend";
import { env } from "./env";

/**
 * Resend email client instance.
 *
 * Configured with API key from environment variables. Used for sending
 * transactional emails such as task publication notifications to families.
 *
 * @example
 * ```ts
 * import { resend } from '@/lib/email';
 *
 * await resend.emails.send({
 *   from: 'notifications@yourdomain.com',
 *   to: 'family@example.com',
 *   subject: '新任務已發布',
 *   html: '<p>您的孩子有新的學習任務</p>'
 * });
 * ```
 *
 * @throws {Error} If RESEND_API_KEY is not configured when attempting to send emails
 */
export const resend = new Resend(env.RESEND_API_KEY);

/**
 * Check if email service is configured and available.
 *
 * @returns {boolean} True if Resend API key is configured, false otherwise
 *
 * @example
 * ```ts
 * import { isEmailConfigured } from '@/lib/email';
 *
 * if (isEmailConfigured()) {
 *   // Send email
 * } else {
 *   console.warn('Email service not configured');
 * }
 * ```
 */
export function isEmailConfigured(): boolean {
  return !!env.RESEND_API_KEY;
}
