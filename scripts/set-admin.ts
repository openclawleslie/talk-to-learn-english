import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

async function setAdmin() {
  try {
    // Get the first teacher
    const [teacher] = await db
      .select()
      .from(schema.teachers)
      .limit(1);

    if (!teacher) {
      console.error("No teachers found in database");
      process.exit(1);
    }

    console.log(`Setting teacher ${teacher.name} (${teacher.email}) as admin...`);

    // Update the teacher to be admin
    await db
      .update(schema.teachers)
      .set({ isAdmin: true })
      .where(eq(schema.teachers.id, teacher.id));

    console.log("✓ Teacher is now an admin");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

setAdmin();
