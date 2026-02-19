import { isNull, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { decryptToken, hmacToken } from "@/lib/security";

async function main() {
  const rows = await db
    .select({ id: schema.familyLinks.id, tokenHash: schema.familyLinks.tokenHash })
    .from(schema.familyLinks)
    .where(isNull(schema.familyLinks.tokenHmac));

  console.log(`Found ${rows.length} family links without tokenHmac`);

  let updated = 0;
  for (const row of rows) {
    try {
      const token = decryptToken(row.tokenHash);
      await db
        .update(schema.familyLinks)
        .set({ tokenHmac: hmacToken(token) })
        .where(eq(schema.familyLinks.id, row.id));
      updated++;
    } catch {
      console.warn(`Skipped link ${row.id}: failed to decrypt`);
    }
  }

  console.log(`Backfilled ${updated}/${rows.length} records`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
