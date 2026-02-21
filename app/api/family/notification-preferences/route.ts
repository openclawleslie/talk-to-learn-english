import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db, schema } from "@/lib/db/client";
import { resolveFamilyByToken } from "@/lib/family-link";
import { fromError, fail, ok } from "@/lib/http";
import { updateNotificationPreferencesSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return fail("token is required", 400);
    }

    const link = await resolveFamilyByToken(token);
    if (!link) {
      return fail("Invalid link", 404);
    }

    const [preferences] = await db
      .select()
      .from(schema.notificationPreferences)
      .where(eq(schema.notificationPreferences.familyId, link.familyId))
      .limit(1);

    // Return default preferences if none exist
    if (!preferences) {
      return ok({ emailEnabled: true });
    }

    return ok({ emailEnabled: preferences.emailEnabled });
  } catch (error) {
    return fromError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = updateNotificationPreferencesSchema.parse(body);

    const link = await resolveFamilyByToken(data.token);
    if (!link) {
      return fail("Invalid link", 404);
    }

    // Check if preferences already exist
    const [existing] = await db
      .select()
      .from(schema.notificationPreferences)
      .where(eq(schema.notificationPreferences.familyId, link.familyId))
      .limit(1);

    if (existing) {
      // Update existing preferences
      await db
        .update(schema.notificationPreferences)
        .set({
          emailEnabled: data.emailEnabled,
          updatedAt: new Date(),
        })
        .where(eq(schema.notificationPreferences.familyId, link.familyId));
    } else {
      // Create new preferences
      await db.insert(schema.notificationPreferences).values({
        familyId: link.familyId,
        emailEnabled: data.emailEnabled,
      });
    }

    return ok({ emailEnabled: data.emailEnabled });
  } catch (error) {
    return fromError(error);
  }
}
