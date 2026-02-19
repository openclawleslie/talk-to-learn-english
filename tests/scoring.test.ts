import assert from "node:assert/strict";
import test from "node:test";

import { scoreToStars } from "@/lib/scoring";

test("scoreToStars maps score by thresholds", () => {
  const thresholds = { oneStarMax: 70, twoStarMax: 84 };

  assert.equal(scoreToStars(69, thresholds), 1);
  assert.equal(scoreToStars(70, thresholds), 2);
  assert.equal(scoreToStars(84, thresholds), 2);
  assert.equal(scoreToStars(85, thresholds), 3);
});
