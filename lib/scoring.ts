/**
 * Converts a numeric score to a star rating (1-3 stars) based on configurable thresholds.
 *
 * The star rating algorithm:
 * - 1 star: score < oneStarMax
 * - 2 stars: oneStarMax <= score <= twoStarMax
 * - 3 stars: score > twoStarMax
 *
 * @param score - The numeric score to convert
 * @param thresholds - Score thresholds for star ratings
 * @param thresholds.oneStarMax - Maximum score for 1 star (exclusive upper bound)
 * @param thresholds.twoStarMax - Maximum score for 2 stars (inclusive upper bound)
 * @returns Star rating from 1 to 3
 *
 * @example
 * ```ts
 * // Configure thresholds: 1 star if < 60, 2 stars if 60-80, 3 stars if > 80
 * const thresholds = { oneStarMax: 60, twoStarMax: 80 };
 *
 * scoreToStars(45, thresholds);  // returns 1
 * scoreToStars(70, thresholds);  // returns 2
 * scoreToStars(95, thresholds);  // returns 3
 * scoreToStars(80, thresholds);  // returns 2 (boundary case)
 * ```
 */
export function scoreToStars(score: number, thresholds: { oneStarMax: number; twoStarMax: number }) {
  if (score < thresholds.oneStarMax) {
    return 1;
  }

  if (score <= thresholds.twoStarMax) {
    return 2;
  }

  return 3;
}
