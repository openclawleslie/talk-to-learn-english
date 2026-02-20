import { z } from "zod";

/**
 * Validation schema for admin login requests.
 *
 * Validates admin credentials with non-empty username and password.
 *
 * @example
 * ```ts
 * const input = adminLoginSchema.parse({
 *   username: "admin",
 *   password: "secret123"
 * });
 * ```
 */
export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Validation schema for teacher login requests.
 *
 * Validates teacher credentials with a valid email address and non-empty password.
 *
 * @example
 * ```ts
 * const input = teacherLoginSchema.parse({
 *   email: "teacher@example.com",
 *   password: "secret123"
 * });
 * ```
 */
export const teacherLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Validation schema for creating a new class.
 *
 * Requires a class name and optional timezone (defaults to "Asia/Shanghai").
 *
 * @example
 * ```ts
 * const input = createClassSchema.parse({
 *   name: "Grade 5A",
 *   timezone: "America/New_York"
 * });
 * ```
 */
export const createClassSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1).default("Asia/Shanghai"),
});

/**
 * Validation schema for creating a new course.
 *
 * Requires a course name and level (e.g., "beginner", "intermediate", "advanced").
 *
 * @example
 * ```ts
 * const input = createCourseSchema.parse({
 *   name: "English Pronunciation",
 *   level: "intermediate"
 * });
 * ```
 */
export const createCourseSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1),
});

/**
 * Validation schema for creating a new teacher.
 *
 * Validates teacher details with name, email, password (min 6 characters),
 * and optional array of class-course assignments.
 *
 * @example
 * ```ts
 * const input = createTeacherSchema.parse({
 *   name: "Jane Smith",
 *   email: "jane@example.com",
 *   password: "secure123",
 *   classCourseIds: ["f47ac10b-58cc-4372-a567-0e02b2c3d479"]
 * });
 * ```
 */
export const createTeacherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  classCourseIds: z.array(z.string().uuid()).default([]),
});

/**
 * Validation schema for pronunciation scoring configuration.
 *
 * Defines score thresholds for 1-star and 2-star ratings.
 * Values must be integers between 1 and 99. Scores above twoStarMax earn 3 stars.
 *
 * @example
 * ```ts
 * const config = scoringConfigSchema.parse({
 *   oneStarMax: 40,  // Scores 0-40: 1 star
 *   twoStarMax: 70   // Scores 41-70: 2 stars, 71+: 3 stars
 * });
 * ```
 */
export const scoringConfigSchema = z.object({
  oneStarMax: z.number().int().min(1).max(99),
  twoStarMax: z.number().int().min(1).max(99),
});

/**
 * Validation schema for creating a weekly pronunciation task.
 *
 * Defines a task with 10 sentences for students to practice. Each task is assigned
 * to one or more class-courses and has a specific time range and status.
 *
 * @example
 * ```ts
 * const task = weeklyTaskSchema.parse({
 *   classCourseIds: ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
 *   weekStart: "2026-02-17T00:00:00Z",
 *   weekEnd: "2026-02-23T23:59:59Z",
 *   status: "published",
 *   items: [
 *     {
 *       orderIndex: 1,
 *       sentenceText: "The quick brown fox jumps over the lazy dog",
 *       referenceAudioUrl: "https://example.com/audio1.mp3"
 *     },
 *     // ... 9 more items
 *   ]
 * });
 * ```
 */
export const weeklyTaskSchema = z.object({
  classCourseIds: z.array(z.string().uuid()).min(1),
  weekStart: z.string().datetime(),
  weekEnd: z.string().datetime(),
  status: z.enum(["draft", "published"]).default("published"),
  items: z
    .array(
      z.object({
        orderIndex: z.number().int().min(1).max(10),
        sentenceText: z.string().min(1),
        referenceAudioUrl: z.string().url().optional(),
      }),
    )
    .length(10),
});

/**
 * Validation schema for creating a new family.
 *
 * Creates a family with parent information, optional notes, class-course assignment,
 * and one or more students. Used for family account registration.
 *
 * @example
 * ```ts
 * const family = createFamilySchema.parse({
 *   parentName: "John Doe",
 *   note: "Twins in the same class",
 *   classCourseId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
 *   students: [
 *     { name: "Alice Doe" },
 *     { name: "Bob Doe" }
 *   ]
 * });
 * ```
 */
export const createFamilySchema = z.object({
  parentName: z.string().min(1),
  note: z.string().default(""),
  classCourseId: z.string().uuid(),
  students: z.array(z.object({ name: z.string().min(1) })).min(1),
});

/**
 * Validation schema for creating a pronunciation submission.
 *
 * Students submit their pronunciation attempts with an audio URL.
 * Requires a family link token, student ID, task item ID, and the recorded audio URL.
 * Optional transcript field for the AI-generated transcription.
 *
 * @example
 * ```ts
 * const submission = createSubmissionSchema.parse({
 *   token: "xK9mP2vQ7wR4yT6uZ8aB3cD5fG1hJ0kL",
 *   studentId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
 *   taskItemId: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
 *   audioUrl: "https://blob.example.com/submissions/audio123.mp3",
 *   transcript: "The quick brown fox jumps"
 * });
 * ```
 */
export const createSubmissionSchema = z.object({
  token: z.string().min(8),
  studentId: z.string().uuid(),
  taskItemId: z.string().uuid(),
  audioUrl: z.string().url(),
  transcript: z.string().optional(),
});
