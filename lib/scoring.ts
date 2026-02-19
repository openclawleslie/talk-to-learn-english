export function scoreToStars(score: number, thresholds: { oneStarMax: number; twoStarMax: number }) {
  if (score < thresholds.oneStarMax) {
    return 1;
  }

  if (score <= thresholds.twoStarMax) {
    return 2;
  }

  return 3;
}
