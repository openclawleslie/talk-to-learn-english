import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { z } from "zod";

const updateTeacherSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  classCourseIds: z.array(z.string().uuid()).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = updateTeacherSchema.parse(await request.json());

    // Update teacher basic info
    const updateData: any = {};
    if (payload.name) updateData.name = payload.name;
    if (payload.email) updateData.email = payload.email;
    if (payload.password) {
      updateData.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    if (Object.keys(updateData).length > 0) {
      await db
        .update(schema.teachers)
        .set(updateData)
        .where(eq(schema.teachers.id, id));
    }

    // Update class course assignments if provided
    if (payload.classCourseIds !== undefined) {
      // Delete existing assignments
      await db
        .delete(schema.teacherAssignments)
        .where(eq(schema.teacherAssignments.teacherId, id));

      // Insert new assignments
      if (payload.classCourseIds.length > 0) {
        await db.insert(schema.teacherAssignments).values(
          payload.classCourseIds.map((classCourseId) => ({
            teacherId: id,
            classCourseId,
          }))
        );
      }
    }

    const [teacher] = await db
      .select()
      .from(schema.teachers)
      .where(eq(schema.teachers.id, id));

    return ok(teacher);
  } catch (error) {
    return fromError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = await request.json();

    await db
      .update(schema.teachers)
      .set(payload)
      .where(eq(schema.teachers.id, id));

    return ok({ message: "Teacher updated successfully" });
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db.delete(schema.teachers).where(eq(schema.teachers.id, id));

    return ok({ message: "Teacher deleted successfully" });
  } catch (error) {
    return fromError(error);
  }
}