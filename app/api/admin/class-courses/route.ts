import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const createClassCourseSchema = z.object({
  classId: z.string().uuid(),
  courseId: z.string().uuid(),
});

export async function GET() {
  try {
    await requireAdmin();

    // Join class_courses with classes and courses to get readable names
    const classCourses = await db
      .select({
        id: schema.classCourses.id,
        class_id: schema.classCourses.classId,
        course_id: schema.classCourses.courseId,
        class_name: schema.classes.name,
        course_name: schema.courses.name,
      })
      .from(schema.classCourses)
      .leftJoin(schema.classes, eq(schema.classCourses.classId, schema.classes.id))
      .leftJoin(schema.courses, eq(schema.classCourses.courseId, schema.courses.id));

    return ok({ classCourses });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const payload = createClassCourseSchema.parse(await request.json());

    const [classCourse] = await db
      .insert(schema.classCourses)
      .values({
        classId: payload.classId,
        courseId: payload.courseId,
      })
      .returning();

    return ok(classCourse, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
