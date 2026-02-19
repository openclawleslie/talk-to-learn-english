import { desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { scoreSpokenSentence, transcribeAudio } from "@/lib/ai";
import { db, schema } from "@/lib/db/client";
import { fromError, ok } from "@/lib/http";
import { scoreToStars } from "@/lib/scoring";

const schemaBody = z.object({
  sentenceText: z.string().min(1),
  transcript: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let sentenceText = "";
    let transcript = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      sentenceText = String(form.get("sentenceText") ?? "");
      transcript = String(form.get("transcript") ?? "");
      const file = form.get("file");
      if (!transcript && file instanceof File) {
        transcript = await transcribeAudio(file);
      }
    } else {
      const body = schemaBody.parse(await request.json());
      sentenceText = body.sentenceText;
      transcript = body.transcript ?? "";
    }

    const [config] = await db.select().from(schema.adminConfig).orderBy(desc(schema.adminConfig.createdAt)).limit(1);
    const result = await scoreSpokenSentence({ sentence: sentenceText, transcript });
    const thresholds = config?.scoringThresholds ?? { oneStarMax: 70, twoStarMax: 84 };
    const stars = scoreToStars(result.score, thresholds);

    return ok({
      transcript,
      score: result.score,
      feedback: result.feedback,
      stars,
    });
  } catch (error) {
    return fromError(error);
  }
}
