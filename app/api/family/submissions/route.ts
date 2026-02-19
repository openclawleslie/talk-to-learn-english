import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { transcribeAudio, scoreSpokenSentence } from "@/lib/ai";
import { uploadAudio } from "@/lib/blob";
import { db, schema } from "@/lib/db/client";
import { extensionFromMimeType, normalizeMimeType } from "@/lib/audio-format";
import { resolveFamilyByToken } from "@/lib/family-link";
import { fromError, fail, ok } from "@/lib/http";
import { scoreToStars } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const token = formData.get("token") as string;
    const studentId = formData.get("studentId") as string;
    const taskItemId = formData.get("taskItemId") as string;

    if (!token || !studentId || !taskItemId) {
      return fail("Missing required fields", 400);
    }
    if (!(file instanceof File) || file.size === 0) {
      return fail("Audio file is required", 400);
    }

    // Phase 1: 廉价校验并行，快速拒绝无效请求
    const [link, taskItem, config] = await Promise.all([
      resolveFamilyByToken(token),
      db.select().from(schema.taskItems).where(eq(schema.taskItems.id, taskItemId)).limit(1)
        .then((rows) => rows[0]),
      db.select().from(schema.adminConfig).orderBy(desc(schema.adminConfig.createdAt)).limit(1)
        .then((rows) => rows[0]),
    ]);

    if (!link) {
      return fail("Invalid link", 404);
    }
    if (!taskItem) {
      return fail("Task item not found", 404);
    }

    // Phase 2: student 校验（依赖 link.familyId，仍是廉价 DB 查询）
    const [student] = await db.select().from(schema.students)
      .where(and(eq(schema.students.id, studentId), eq(schema.students.familyId, link.familyId)))
      .limit(1);

    if (!student) {
      return fail("Student not found", 404);
    }

    // Phase 3: 所有校验通过，重操作并行
    const mimeType = normalizeMimeType(file.type) || "audio/webm";
    const extension = extensionFromMimeType(mimeType);
    const blobPath = `submissions/${Date.now()}-recording.${extension}`;

    const [uploaded, transcript] = await Promise.all([
      uploadAudio(blobPath, file),
      transcribeAudio(file),
    ]);

    // Phase 4: 评分（依赖 transcript + sentenceText）
    const scoring = await scoreSpokenSentence({
      sentence: taskItem.sentenceText,
      transcript,
    });

    const thresholds = config?.scoringThresholds ?? { oneStarMax: 70, twoStarMax: 84 };
    const stars = scoreToStars(scoring.score, thresholds);

    // Phase 5: 写入
    const [submission] = await db
      .insert(schema.submissions)
      .values({
        studentId,
        taskItemId,
        audioUrl: uploaded.url,
        transcript,
        score: scoring.score,
        stars,
        feedback: scoring.feedback,
      })
      .onConflictDoUpdate({
        target: [schema.submissions.studentId, schema.submissions.taskItemId],
        set: {
          audioUrl: uploaded.url,
          transcript,
          score: scoring.score,
          stars,
          feedback: scoring.feedback,
          createdAt: new Date(),
        },
      })
      .returning();

    return ok(submission, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
