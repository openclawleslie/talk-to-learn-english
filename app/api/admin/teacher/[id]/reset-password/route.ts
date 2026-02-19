import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "密码至少6位"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = resetPasswordSchema.parse(await request.json());

    const passwordHash = await bcrypt.hash(payload.password, 10);

    await db
      .update(schema.teachers)
      .set({ passwordHash })
      .where(eq(schema.teachers.id, id));

    return ok({ message: "Password reset successfully" });
  } catch (error) {
    return fromError(error);
  }
}
