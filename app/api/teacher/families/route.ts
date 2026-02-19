import { and, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { issueFamilyLink } from "@/lib/family-link";
import { fromError, fail, ok } from "@/lib/http";
import { createFamilySchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await requireTeacher();

    // Get all class courses assigned to this teacher
    const assignments = await db
      .select({ classCourseId: schema.teacherAssignments.classCourseId })
      .from(schema.teacherAssignments)
      .where(eq(schema.teacherAssignments.teacherId, session.teacherId));

    const classCourseIds = assignments.map((a) => a.classCourseId);

    if (classCourseIds.length === 0) {
      return ok({ families: [] });
    }

    // Get families for these class courses
    const families = await db
      .select({
        id: schema.families.id,
        parentName: schema.families.parentName,
        note: schema.families.note,
        classCourseId: schema.families.classCourseId,
        createdAt: schema.families.createdAt,
        className: schema.classes.name,
        courseName: schema.courses.name,
      })
      .from(schema.families)
      .leftJoin(schema.classCourses, eq(schema.families.classCourseId, schema.classCourses.id))
      .leftJoin(schema.classes, eq(schema.classCourses.classId, schema.classes.id))
      .leftJoin(schema.courses, eq(schema.classCourses.courseId, schema.courses.id))
      .where(inArray(schema.families.classCourseId, classCourseIds));

    // 获取每个家庭的学生和活跃链接 token
    const { getActiveFamilyToken } = await import("@/lib/family-link");
    const familiesWithDetails = await Promise.all(
      families.map(async (family) => {
        // 获取学生列表
        const students = await db
          .select({
            id: schema.students.id,
            name: schema.students.name,
          })
          .from(schema.students)
          .where(eq(schema.students.familyId, family.id));

        // 获取 token
        const token = await getActiveFamilyToken(family.id);

        return {
          ...family,
          students,
          token, // 可能为 null
        };
      })
    );

    return ok({ families: familiesWithDetails });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireTeacher();
    const payload = createFamilySchema.parse(await request.json());

    const [assignment] = await db
      .select({ id: schema.teacherAssignments.id })
      .from(schema.teacherAssignments)
      .where(
        and(
          eq(schema.teacherAssignments.teacherId, session.teacherId),
          eq(schema.teacherAssignments.classCourseId, payload.classCourseId),
        ),
      )
      .limit(1);

    if (!assignment) {
      return fail("Forbidden class/course", 403);
    }

    const [family] = await db
      .insert(schema.families)
      .values({
        parentName: payload.parentName,
        note: payload.note,
        classCourseId: payload.classCourseId,
        createdByTeacherId: session.teacherId,
      })
      .returning();

    await db.insert(schema.students).values(
      payload.students.map((student) => ({
        familyId: family.id,
        name: student.name,
      })),
    );

    const token = await issueFamilyLink(family.id);
    return ok({ familyId: family.id, token }, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
