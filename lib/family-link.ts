import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { createToken, encryptToken, decryptToken, hmacToken } from "@/lib/security";

export async function issueFamilyLink(familyId: string) {
  await db
    .update(schema.familyLinks)
    .set({ status: "revoked" })
    .where(and(eq(schema.familyLinks.familyId, familyId), eq(schema.familyLinks.status, "active")));

  const token = createToken();

  await db.insert(schema.familyLinks).values({
    familyId,
    tokenHash: encryptToken(token), // 使用加密而非 hash
    tokenHmac: hmacToken(token),
    status: "active",
  });

  return token;
}

export async function resolveFamilyByToken(token: string) {
  const hmac = hmacToken(token);

  const [link] = await db
    .select({
      id: schema.familyLinks.id,
      familyId: schema.familyLinks.familyId,
      status: schema.familyLinks.status,
    })
    .from(schema.familyLinks)
    .where(and(eq(schema.familyLinks.tokenHmac, hmac), eq(schema.familyLinks.status, "active")))
    .limit(1);

  if (!link) {
    return null;
  }

  // 非阻塞更新 lastUsedAt，不影响关键路径
  db.update(schema.familyLinks)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.familyLinks.id, link.id))
    .catch((err: unknown) => console.error("Failed to update lastUsedAt:", err));

  return { id: link.id, familyId: link.familyId, status: link.status };
}

// 新增：获取家庭的活跃链接 token
export async function getActiveFamilyToken(familyId: string): Promise<string | null> {
  const [link] = await db
    .select({ tokenHash: schema.familyLinks.tokenHash })
    .from(schema.familyLinks)
    .where(and(eq(schema.familyLinks.familyId, familyId), eq(schema.familyLinks.status, "active")))
    .orderBy(desc(schema.familyLinks.createdAt))
    .limit(1);

  if (!link) {
    return null;
  }

  try {
    return decryptToken(link.tokenHash);
  } catch {
    return null;
  }
}
