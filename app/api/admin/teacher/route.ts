import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { createTeacherSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin();
    const teachers = await db
      .select({
        id: schema.teachers.id,
        name: schema.teachers.name,
        email: schema.teachers.email,
        is_active: schema.teachers.isActive,
        created_at: schema.teachers.createdAt,
      })
      .from(schema.teachers)
      .orderBy(schema.teachers.createdAt);

    // Fetch all assignments with class/course names
    const assignments = await db
      .select({
        teacherId: schema.teacherAssignments.teacherId,
        className: schema.classes.name,
        courseName: schema.courses.name,
      })
      .from(schema.teacherAssignments)
      .leftJoin(schema.classCourses, eq(schema.teacherAssignments.classCourseId, schema.classCourses.id))
      .leftJoin(schema.classes, eq(schema.classCourses.classId, schema.classes.id))
      .leftJoin(schema.courses, eq(schema.classCourses.courseId, schema.courses.id));

    // Group assignments by teacher
    const assignmentMap: Record<string, string[]> = {};
    for (const a of assignments) {
      if (!assignmentMap[a.teacherId]) assignmentMap[a.teacherId] = [];
      if (a.className && a.courseName) {
        assignmentMap[a.teacherId].push(`${a.className}-${a.courseName}`);
      }
    }

    const teachersWithAssignments = teachers.map((t) => ({
      ...t,
      classCourseNames: assignmentMap[t.id] || [],
    }));

    return ok({ teachers: teachersWithAssignments });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const payload = createTeacherSchema.parse(await request.json());

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const [teacher] = await db
      .insert(schema.teachers)
      .values({
        name: payload.name,
        email: payload.email,
        passwordHash,
        isActive: true,
        isAdmin: false,
      })
      .returning();

    if (payload.classCourseIds.length) {
      await db.insert(schema.teacherAssignments).values(
        payload.classCourseIds.map((classCourseId) => ({
          teacherId: teacher.id,
          classCourseId,
        })),
      );
    }

    return ok(teacher, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
