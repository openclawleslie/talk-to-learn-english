import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { createToken, encryptToken, decryptToken, hmacToken } from "@/lib/security";

/**
 * Issues a new family link token and revokes any existing active links.
 *
 * Family links allow parents to access their child's learning progress without
 * requiring a login. Only one active link exists per family at a time - issuing
 * a new link automatically revokes the previous one.
 *
 * The token is stored using both encryption (for retrieval) and HMAC (for lookup).
 *
 * @param familyId - ID of the family to issue a link for
 * @returns Newly created token to share with the family
 * @throws {Error} If database operations fail
 *
 * @example
 * ```ts
 * const token = await issueFamilyLink('family-123');
 * const shareUrl = `https://example.com/family/link/${token}`;
 * // Send shareUrl to parents via email or QR code
 * ```
 */
export async function issueFamilyLink(familyId: string) {
  await db
    .update(schema.familyLinks)
    .set({ status: "revoked" })
    .where(and(eq(schema.familyLinks.familyId, familyId), eq(schema.familyLinks.status, "active")));

  const token = createToken();

  await db.insert(schema.familyLinks).values({
    familyId,
    tokenHash: encryptToken(token),
    tokenHmac: hmacToken(token),
    status: "active",
  });

  return token;
}

/**
 * Resolves a family link token to retrieve family information.
 *
 * Validates the token by computing its HMAC and checking for an active link.
 * Updates the lastUsedAt timestamp asynchronously without blocking the response.
 *
 * @param token - Family link token provided by the user
 * @returns Family link information (id, familyId, status) or null if token is invalid/expired
 *
 * @example
 * ```ts
 * const family = await resolveFamilyByToken(tokenFromUrl);
 * if (!family) {
 *   return redirect('/invalid-link');
 * }
 * // Load family's submissions and progress
 * const submissions = await getSubmissions(family.familyId);
 * ```
 */
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

  // Update lastUsedAt asynchronously without blocking the critical path
  db.update(schema.familyLinks)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.familyLinks.id, link.id))
    .catch((err: unknown) => console.error("Failed to update lastUsedAt:", err));

  return { id: link.id, familyId: link.familyId, status: link.status };
}

/**
 * Retrieves the active family link token for a given family.
 *
 * Decrypts the stored token hash to return the original token.
 * Returns null if no active link exists or decryption fails.
 *
 * @param familyId - ID of the family to retrieve the active token for
 * @returns Active family link token or null if none exists or decryption fails
 *
 * @example
 * ```ts
 * const token = await getActiveFamilyToken('family-123');
 * if (token) {
 *   const qrCodeUrl = generateQRCode(`${baseUrl}/family/link/${token}`);
 *   await sendEmail({ to: parent.email, qrCode: qrCodeUrl });
 * }
 * ```
 */
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
