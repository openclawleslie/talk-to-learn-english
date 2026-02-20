import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

/**
 * PostgreSQL connection pool using the DATABASE_URL environment variable.
 *
 * @internal
 */
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

/**
 * Drizzle ORM database client instance.
 *
 * Provides type-safe database access with the application's schema.
 * Uses a connection pool for efficient connection management.
 *
 * @example
 * ```ts
 * import { db, schema } from '@/lib/db/client';
 *
 * // Query with type safety
 * const families = await db.select().from(schema.families);
 *
 * // Insert data
 * await db.insert(schema.submissions).values({
 *   familyId: 'family-123',
 *   audioUrl: 'https://...',
 *   // ...
 * });
 * ```
 */
export const db = drizzle({ client: pool, schema });

/**
 * Database schema containing all table definitions.
 *
 * Re-exported for convenient access to table references and types.
 *
 * @example
 * ```ts
 * import { schema } from '@/lib/db/client';
 * import { eq } from 'drizzle-orm';
 *
 * const family = await db.query.families.findFirst({
 *   where: eq(schema.families.id, familyId)
 * });
 * ```
 */
export { schema };
