import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { requireTeacher } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, fail, ok } from "@/lib/http";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateFamilySchema = z.object({
  parentName: z.string().min(1),
  note: z.string(),
  students: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
    })
  ).min(1),
});

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireTeacher();
    const { id } = await params;
    const payload = updateFamilySchema.parse(await request.json());

    // 验证家庭是否属于该老师
    const [family] = await db
      .select()
      .from(schema.families)
      .where(and(eq(schema.families.id, id), eq(schema.families.createdByTeacherId, session.teacherId)))
      .limit(1);

    if (!family) {
      return fail("Family not found", 404);
    }

    // 更新家庭信息
    await db
      .update(schema.families)
      .set({
        parentName: payload.parentName,
        note: payload.note,
      })
      .where(eq(schema.families.id, id));

    // 获取现有学生
    const existingStudents = await db
      .select()
      .from(schema.students)
      .where(eq(schema.students.familyId, id));

    // 处理学生更新
    const existingIds = new Set(existingStudents.map((s) => s.id));
    const payloadIds = new Set(payload.students.filter((s) => s.id).map((s) => s.id!));

    // 删除不在新列表中的学生
    for (const student of existingStudents) {
      if (!payloadIds.has(student.id)) {
        await db.delete(schema.students).where(eq(schema.students.id, student.id));
      }
    }

    // 更新或新增学生
    for (const student of payload.students) {
      if (student.id && existingIds.has(student.id)) {
        // 更新现有学生
        await db
          .update(schema.students)
          .set({ name: student.name })
          .where(eq(schema.students.id, student.id));
      } else {
        // 新增学生
        await db.insert(schema.students).values({
          familyId: id,
          name: student.name,
        });
      }
    }

    return ok({ success: true });
  } catch (error) {
    return fromError(error);
  }
}
