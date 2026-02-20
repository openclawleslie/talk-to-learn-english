import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Generates a cryptographically secure random token.
 *
 * Creates a 24-byte random token encoded as base64url.
 * Suitable for use as API keys, family link tokens, or one-time codes.
 *
 * @returns Random token string (32 characters, URL-safe)
 *
 * @example
 * ```ts
 * const apiKey = createToken();
 * console.log(apiKey); // e.g., "xK9mP2vQ7wR4yT6uZ8aB3cD5fG1hJ0kL"
 * ```
 */
export function createToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * Creates a SHA-256 hash of a token.
 *
 * Use this to hash tokens before storing them in the database.
 * This is a one-way hash - the original token cannot be recovered.
 *
 * @param token - Token to hash
 * @returns Hex-encoded SHA-256 hash (64 characters)
 *
 * @example
 * ```ts
 * const token = createToken();
 * const hashed = hashToken(token);
 * // Store hashed in database, give token to user
 * await db.insert(apiKeys).values({ hash: hashed });
 * ```
 */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Encrypts a token using AES-256-GCM authenticated encryption.
 *
 * The encrypted output includes the initialization vector (IV), authentication tag,
 * and ciphertext, formatted as: `iv.authTag.encrypted` (all hex-encoded).
 * This provides both confidentiality and authenticity.
 *
 * @param token - Plain text token to encrypt
 * @returns Encrypted token in format: `iv.authTag.encrypted` (hex-encoded)
 *
 * @example
 * ```ts
 * const token = createToken();
 * const encrypted = encryptToken(token);
 * console.log(encrypted); // e.g., "a1b2c3...def.123456...789.abc123..."
 * // Store encrypted in database
 * await db.insert(familyLinks).values({ encryptedToken: encrypted });
 * ```
 */
export function encryptToken(token: string): string {
  const key = createHash("sha256").update(env.SESSION_SECRET).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted}`;
}

/**
 * Creates a deterministic HMAC-SHA256 hash of a token.
 *
 * Unlike `hashToken`, this uses HMAC with a secret key, making it suitable
 * for database indexing and lookups. The same token always produces the same
 * HMAC, enabling efficient searches without storing plain text tokens.
 *
 * @param token - Token to hash with HMAC
 * @returns Hex-encoded HMAC-SHA256 hash (64 characters)
 *
 * @example
 * ```ts
 * const token = createToken();
 * const hmac = hmacToken(token);
 * // Store HMAC in database for lookup
 * await db.insert(familyLinks).values({ hmac });
 * // Later, verify token by computing HMAC
 * const userToken = request.query.token;
 * const link = await db.query.familyLinks.findFirst({
 *   where: eq(familyLinks.hmac, hmacToken(userToken))
 * });
 * ```
 */
export function hmacToken(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

/**
 * Decrypts a token that was encrypted with `encryptToken`.
 *
 * Validates the authentication tag to ensure the ciphertext has not been
 * tampered with. Throws an error if the format is invalid or authentication fails.
 *
 * @param encryptedData - Encrypted token in format: `iv.authTag.encrypted` (hex-encoded)
 * @returns Decrypted plain text token
 * @throws {Error} If the encrypted data format is invalid or authentication fails
 *
 * @example
 * ```ts
 * const encrypted = "a1b2c3...def.123456...789.abc123...";
 * try {
 *   const token = decryptToken(encrypted);
 *   console.log('Decrypted token:', token);
 * } catch (error) {
 *   console.error('Invalid or tampered encrypted data');
 * }
 * ```
 */
export function decryptToken(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(".");
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }

  const key = createHash("sha256").update(env.SESSION_SECRET).digest();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
