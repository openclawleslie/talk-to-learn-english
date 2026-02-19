import assert from "node:assert/strict";
import test from "node:test";

import { getCurrentWeekRange } from "@/lib/week";

test("getCurrentWeekRange returns Monday to Sunday", () => {
  const { weekStart, weekEnd } = getCurrentWeekRange(new Date("2026-02-10T12:00:00"));

  assert.equal(weekStart.getDay(), 1);
  assert.equal(weekEnd.getDay(), 0);
  assert.equal(weekStart.getHours(), 0);
});
