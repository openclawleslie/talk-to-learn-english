import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const teacherLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createClassSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1).default("Asia/Shanghai"),
});

export const createCourseSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1),
});

export const createTeacherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  classCourseIds: z.array(z.string().uuid()).default([]),
});

export const scoringConfigSchema = z.object({
  oneStarMax: z.number().int().min(1).max(99),
  twoStarMax: z.number().int().min(1).max(99),
});

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

export const createFamilySchema = z.object({
  parentName: z.string().min(1),
  note: z.string().default(""),
  classCourseId: z.string().uuid(),
  students: z.array(z.object({ name: z.string().min(1) })).min(1),
});

export const createSubmissionSchema = z.object({
  token: z.string().min(8),
  studentId: z.string().uuid(),
  taskItemId: z.string().uuid(),
  audioUrl: z.string().url(),
  transcript: z.string().optional(),
});
