import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

async function deleteTask() {
  const taskId = process.argv[2];

  if (!taskId) {
    console.error("Usage: npx tsx scripts/delete-weekly-task.ts <task-id>");
    process.exit(1);
  }

  try {
    await db.delete(schema.weeklyTasks).where(eq(schema.weeklyTasks.id, taskId));
    console.log(`✓ Deleted weekly task: ${taskId}`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

deleteTask();
