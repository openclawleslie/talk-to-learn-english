/**
 * Deadline notification utilities for checking upcoming deadlines and generating notification messages.
 *
 * This module provides functions to:
 * - Check if a deadline is approaching (within 24 hours)
 * - Check if a deadline has passed
 * - Generate localized notification messages
 *
 * @example
 * ```ts
 * // Check if deadline requires notification
 * const deadline = new Date('2026-02-22T23:59:59Z');
 * const shouldNotify = isDeadlineApproaching(deadline);
 * if (shouldNotify) {
 *   const notification = getDeadlineNotification(deadline);
 *   console.log(notification.message); // "作業即將截止！剩餘 23 小時"
 * }
 *
 * // Check if submission is late
 * const isPast = isDeadlinePassed(deadline);
 * if (isPast) {
 *   console.log("Deadline has passed");
 * }
 * ```
 */

export type DeadlineNotification = {
  /**
   * Whether the notification should be displayed
   */
  shouldShow: boolean;
  /**
   * Localized message to display (Chinese)
   */
  message: string;
  /**
   * Urgency level: "high" (< 6h), "medium" (6-24h), or "low" (> 24h)
   */
  urgency: "high" | "medium" | "low";
  /**
   * Hours remaining until deadline (rounded)
   */
  hoursRemaining: number;
};

/**
 * Checks if a deadline is approaching within the next 24 hours.
 *
 * Returns true if the deadline:
 * - Has not yet passed
 * - Is within the next 24 hours from now
 *
 * @param deadline - The deadline to check (Date object or ISO 8601 string)
 * @param now - The reference time for comparison (defaults to current time)
 * @returns True if deadline is within 24 hours and has not passed
 *
 * @example
 * ```ts
 * // Deadline in 12 hours
 * const deadline = new Date(Date.now() + 12 * 60 * 60 * 1000);
 * isDeadlineApproaching(deadline); // Returns: true
 *
 * // Deadline in 48 hours
 * const farDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
 * isDeadlineApproaching(farDeadline); // Returns: false
 *
 * // Deadline already passed
 * const pastDeadline = new Date(Date.now() - 1000);
 * isDeadlineApproaching(pastDeadline); // Returns: false
 * ```
 */
export function isDeadlineApproaching(
  deadline: Date | string,
  now: Date = new Date()
): boolean {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const nowTime = now.getTime();
  const deadlineTime = deadlineDate.getTime();
  const diffMs = deadlineTime - nowTime;

  // Not approaching if deadline has passed
  if (diffMs <= 0) {
    return false;
  }

  // Check if within 24 hours (24 * 60 * 60 * 1000 = 86400000 ms)
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return diffMs <= twentyFourHoursMs;
}

/**
 * Checks if a deadline has already passed.
 *
 * @param deadline - The deadline to check (Date object or ISO 8601 string)
 * @param now - The reference time for comparison (defaults to current time)
 * @returns True if the deadline is in the past
 *
 * @example
 * ```ts
 * const pastDeadline = new Date('2026-02-20T00:00:00Z');
 * isDeadlinePassed(pastDeadline); // Returns: true
 *
 * const futureDeadline = new Date('2026-12-31T23:59:59Z');
 * isDeadlinePassed(futureDeadline); // Returns: false
 * ```
 */
export function isDeadlinePassed(
  deadline: Date | string,
  now: Date = new Date()
): boolean {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  return deadlineDate.getTime() <= now.getTime();
}

/**
 * Generates a deadline notification with localized message and urgency level.
 *
 * The urgency levels are:
 * - high: Less than 6 hours remaining
 * - medium: 6-24 hours remaining
 * - low: More than 24 hours (notification not needed)
 *
 * @param deadline - The deadline to check (Date object or ISO 8601 string)
 * @param now - The reference time for comparison (defaults to current time)
 * @returns Notification object with message, urgency, and display flag
 *
 * @example
 * ```ts
 * // Deadline in 3 hours
 * const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000);
 * const notification = getDeadlineNotification(deadline);
 * // Returns: {
 * //   shouldShow: true,
 * //   message: "作業即將截止！剩餘 3 小時",
 * //   urgency: "high",
 * //   hoursRemaining: 3
 * // }
 *
 * // Deadline in 12 hours
 * const deadline2 = new Date(Date.now() + 12 * 60 * 60 * 1000);
 * const notification2 = getDeadlineNotification(deadline2);
 * // Returns: {
 * //   shouldShow: true,
 * //   message: "作業將在 12 小時後截止",
 * //   urgency: "medium",
 * //   hoursRemaining: 12
 * // }
 *
 * // Deadline already passed
 * const pastDeadline = new Date(Date.now() - 1000);
 * const notification3 = getDeadlineNotification(pastDeadline);
 * // Returns: {
 * //   shouldShow: false,
 * //   message: "",
 * //   urgency: "low",
 * //   hoursRemaining: 0
 * // }
 * ```
 */
export function getDeadlineNotification(
  deadline: Date | string,
  now: Date = new Date()
): DeadlineNotification {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const nowTime = now.getTime();
  const deadlineTime = deadlineDate.getTime();
  const diffMs = deadlineTime - nowTime;

  // Deadline has passed or is now - no notification needed
  if (diffMs <= 0) {
    return {
      shouldShow: false,
      message: "",
      urgency: "low",
      hoursRemaining: 0,
    };
  }

  const hoursRemaining = Math.ceil(diffMs / (60 * 60 * 1000));

  // More than 24 hours - no notification needed
  if (hoursRemaining > 24) {
    return {
      shouldShow: false,
      message: "",
      urgency: "low",
      hoursRemaining,
    };
  }

  // Less than 6 hours - high urgency
  if (hoursRemaining < 6) {
    return {
      shouldShow: true,
      message: `作業即將截止！剩餘 ${hoursRemaining} 小時`,
      urgency: "high",
      hoursRemaining,
    };
  }

  // 6-24 hours - medium urgency
  return {
    shouldShow: true,
    message: `作業將在 ${hoursRemaining} 小時後截止`,
    urgency: "medium",
    hoursRemaining,
  };
}

/**
 * Checks if a submission was made after the deadline.
 *
 * @param submissionTime - When the submission was created (Date object or ISO 8601 string)
 * @param deadline - The deadline for the task (Date object or ISO 8601 string)
 * @returns True if the submission was made after the deadline
 *
 * @example
 * ```ts
 * const deadline = new Date('2026-02-22T23:59:59Z');
 * const submission = new Date('2026-02-23T10:30:00Z');
 * isSubmissionLate(submission, deadline); // Returns: true
 *
 * const earlySubmission = new Date('2026-02-22T20:00:00Z');
 * isSubmissionLate(earlySubmission, deadline); // Returns: false
 * ```
 */
export function isSubmissionLate(
  submissionTime: Date | string,
  deadline: Date | string
): boolean {
  const submissionDate = typeof submissionTime === "string" ? new Date(submissionTime) : submissionTime;
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  return submissionDate.getTime() > deadlineDate.getTime();
}
