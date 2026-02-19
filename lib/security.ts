import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { env } from "@/lib/env";

export function createToken() {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// 使用 AES-256-GCM 加密 token
export function encryptToken(token: string): string {
  const key = createHash("sha256").update(env.SESSION_SECRET).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  // 格式: iv.authTag.encrypted
  return `${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted}`;
}

// 确定性 HMAC，用于索引查找
export function hmacToken(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

// 解密 token
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
