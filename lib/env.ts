import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  DEFAULT_TZ: z.string().default("Asia/Shanghai"),
  AI_BASE_URL: z.string().url().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-5"),
  AI_SCORING_MODEL: z.string().default("gpt-4o-mini"),
  AI_TRANSCRIBE_MODEL: z.string().default("gpt-4o-mini-transcribe"),
  AI_TTS_MODEL: z.string().default("gpt-4o-mini-tts"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

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
