import assert from "node:assert/strict";
import test from "node:test";

import {
  getFamiliesForNotification,
  createNotificationRecords,
  updateNotificationStatus,
  sendTaskPublishedNotification,
  getTaskNotificationStatus,
} from "@/lib/notifications";

test("notification helper functions are exported", () => {
  assert.equal(typeof getFamiliesForNotification, "function");
  assert.equal(typeof createNotificationRecords, "function");
  assert.equal(typeof updateNotificationStatus, "function");
  assert.equal(typeof sendTaskPublishedNotification, "function");
  assert.equal(typeof getTaskNotificationStatus, "function");
});

test("createNotificationRecords returns empty array for empty familyIds", async () => {
  const result = await createNotificationRecords("test-task-id", []);
  assert.deepEqual(result, []);
});
