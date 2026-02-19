import { eq } from "drizzle-orm";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireTeacher();

    const classCourses = await db
      .select({
        id: schema.classCourses.id,
        class_id: schema.classCourses.classId,
        course_id: schema.classCourses.courseId,
        class_name: schema.classes.name,
        course_name: schema.courses.name,
      })
      .from(schema.teacherAssignments)
      .innerJoin(
        schema.classCourses,
        eq(schema.teacherAssignments.classCourseId, schema.classCourses.id)
      )
      .innerJoin(schema.classes, eq(schema.classCourses.classId, schema.classes.id))
      .innerJoin(schema.courses, eq(schema.classCourses.courseId, schema.courses.id))
      .where(eq(schema.teacherAssignments.teacherId, session.teacherId));

    // 计算每个班级课程的学生数量
    const classCoursesWithCount = await Promise.all(
      classCourses.map(async (cc) => {
        // 获取该班级课程下的所有家庭
        const families = await db
          .select({ id: schema.families.id })
          .from(schema.families)
          .where(eq(schema.families.classCourseId, cc.id));

        // 计算所有家庭的学生总数
        let studentCount = 0;
        for (const family of families) {
          const students = await db
            .select({ id: schema.students.id })
            .from(schema.students)
            .where(eq(schema.students.familyId, family.id));
          studentCount += students.length;
        }

        return {
          ...cc,
          student_count: studentCount,
        };
      })
    );

    return ok({ classCourses: classCoursesWithCount });
  } catch (error) {
    return fromError(error);
  }
}
