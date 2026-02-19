import bcrypt from "bcryptjs";

import { db, schema } from "@/lib/db/client";
import { env } from "@/lib/env";

async function main() {
  const adminPasswordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);

  const [admin] = await db
    .insert(schema.teachers)
    .values({
      name: "System Admin",
      email: env.ADMIN_USERNAME,
      passwordHash: adminPasswordHash,
      isActive: true,
      isAdmin: true,
    })
    .onConflictDoNothing()
    .returning();

  const [teacher] = await db
    .insert(schema.teachers)
    .values({
      name: "Teacher Demo",
      email: "teacher@example.com",
      passwordHash: teacherPasswordHash,
      isActive: true,
      isAdmin: false,
    })
    .onConflictDoNothing()
    .returning();

  await db.insert(schema.adminConfig).values({
    scoringThresholds: { oneStarMax: 70, twoStarMax: 84 },
  });

  const [classRow] = await db
    .insert(schema.classes)
    .values({ name: "Class A", timezone: env.DEFAULT_TZ })
    .returning();

  const [courseRow] = await db
    .insert(schema.courses)
    .values({ name: "English Speaking", level: "L1" })
    .returning();

  const [classCourse] = await db
    .insert(schema.classCourses)
    .values({ classId: classRow.id, courseId: courseRow.id })
    .returning();

  const teacherId = teacher?.id ?? admin?.id;

  if (!teacherId) {
    throw new Error("Unable to resolve teacher for seed data");
  }

  await db.insert(schema.teacherAssignments).values({
    teacherId,
    classCourseId: classCourse.id,
  });

  console.log("Seed complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
