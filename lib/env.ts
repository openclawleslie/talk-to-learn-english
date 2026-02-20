import "dotenv/config";
import { z } from "zod";

/**
 * Zod schema for validating environment variables.
 *
 * Defines required and optional configuration with defaults:
 * - DATABASE_URL: Required database connection string
 * - ADMIN_USERNAME/PASSWORD: Admin credentials (defaults: "admin"/"admin123")
 * - SESSION_SECRET: Secret for session encryption (default: "dev-session-secret")
 * - DEFAULT_TZ: Default timezone (default: "Asia/Shanghai")
 * - AI_BASE_URL/API_KEY: Optional AI service configuration
 * - AI_MODEL: Main AI model (default: "gpt-5")
 * - AI_SCORING_MODEL: Model for scoring speech (default: "gpt-4o-mini")
 * - AI_TRANSCRIBE_MODEL: Model for audio transcription (default: "gpt-4o-mini-transcribe")
 * - AI_TTS_MODEL: Model for text-to-speech (default: "gpt-4o-mini-tts")
 * - BLOB_READ_WRITE_TOKEN: Optional Vercel Blob storage token
 *
 * @internal
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().default("admin123"),
  SESSION_SECRET: z.string().default("dev-session-secret"),
  DEFAULT_TZ: z.string().default("Asia/Shanghai"),
  AI_BASE_URL: z.string().url().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-5"),
  AI_SCORING_MODEL: z.string().default("gpt-4o-mini"),
  AI_TRANSCRIBE_MODEL: z.string().default("gpt-4o-mini-transcribe"),
  AI_TTS_MODEL: z.string().default("gpt-4o-mini-tts"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

/**
 * Validated environment configuration object.
 *
 * Parses and validates environment variables from process.env using Zod schema.
 * Ensures all required variables are present and have valid values, applies defaults
 * for optional fields, and provides type-safe access to configuration throughout the app.
 *
 * @throws {z.ZodError} If required environment variables are missing or invalid
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env';
 *
 * // Access validated environment variables
 * const dbUrl = env.DATABASE_URL;
 * const apiKey = env.AI_API_KEY; // string | undefined
 * const model = env.AI_MODEL; // "gpt-5" by default
 * ```
 */
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  SESSION_SECRET: process.env.SESSION_SECRET,
  DEFAULT_TZ: process.env.DEFAULT_TZ,
  AI_BASE_URL: process.env.AI_BASE_URL,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  AI_SCORING_MODEL: process.env.AI_SCORING_MODEL,
  AI_TRANSCRIBE_MODEL: process.env.AI_TRANSCRIBE_MODEL,
  AI_TTS_MODEL: process.env.AI_TTS_MODEL,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
});
