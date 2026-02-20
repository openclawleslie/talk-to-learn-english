/**
 * Calculates the start and end dates of the current week (Monday to Sunday).
 *
 * The week is defined as:
 * - Start: Monday at 00:00:00.000
 * - End: Sunday at 23:59:59.999
 *
 * The algorithm handles Sunday (day 0) by going back 6 days to reach Monday,
 * and other days by calculating the difference from Monday (day 1).
 *
 * @param now - The reference date for calculating the week range (defaults to current date)
 * @returns Object containing weekStart (Monday 00:00) and weekEnd (Sunday 23:59)
 *
 * @example
 * ```ts
 * // Get current week range
 * const { weekStart, weekEnd } = getCurrentWeekRange();
 * console.log(`Week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`);
 *
 * // Get week range for a specific date (e.g., Wednesday, Feb 19, 2026)
 * const range = getCurrentWeekRange(new Date('2026-02-19'));
 * // Returns: weekStart = Mon Feb 17 00:00:00, weekEnd = Sun Feb 23 23:59:59
 *
 * // Query database for weekly tasks
 * const tasks = await db.query.weeklyTasks.findMany({
 *   where: and(
 *     gte(weeklyTasks.createdAt, weekStart),
 *     lte(weeklyTasks.createdAt, weekEnd)
 *   )
 * });
 * ```
 */
export function getCurrentWeekRange(now = new Date()) {
  const date = new Date(now);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}
