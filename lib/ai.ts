import OpenAI from "openai";

import { extensionFromMimeType, mimeTypeFromUrl, normalizeMimeType } from "@/lib/audio-format";
import { env } from "@/lib/env";

function getClient() {
  if (!env.AI_API_KEY || !env.AI_BASE_URL) {
    return null;
  }

  return new OpenAI({
    apiKey: env.AI_API_KEY,
    baseURL: env.AI_BASE_URL,
  });
}

function requireClient() {
  const client = getClient();
  if (!client) {
    throw new Error("AI service is not configured (missing AI_API_KEY or AI_BASE_URL)");
  }
  return client;
}

export async function transcribeAudio(file: File) {
  const client = requireClient();

  const response = await client.audio.transcriptions.create({
    file,
    model: env.AI_TRANSCRIBE_MODEL,
  });

  return response.text;
}

export async function transcribeAudioFromUrl(audioUrl: string) {
  const client = requireClient();

  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType =
    normalizeMimeType(response.headers.get("content-type")) ||
    normalizeMimeType(mimeTypeFromUrl(audioUrl)) ||
    "audio/webm";
  const extension = extensionFromMimeType(mimeType);
  const file = new File([arrayBuffer], `audio.${extension}`, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: env.AI_TRANSCRIBE_MODEL,
  });

  return transcription.text;
}

export async function scoreSpokenSentence(input: { sentence: string; transcript: string }) {
  const client = requireClient();

  const prompt = [
    "You are an English speaking evaluator for children.",
    "Return strict JSON with keys: score (0-100 integer), feedback (short sentence).",
    `Target sentence: ${input.sentence}`,
    `Transcript: ${input.transcript}`,
  ].join("\n");

  const response = await client.responses.create({
    model: env.AI_SCORING_MODEL,
    input: prompt,
  });

  if (!response.output_text) {
    throw new Error("Scoring model returned empty response");
  }

  const parsed = JSON.parse(response.output_text) as { score: number; feedback: string };
  return {
    score: Math.min(100, Math.max(0, Math.round(parsed.score))),
    feedback: parsed.feedback,
  };
}

export async function createReferenceSpeech(text: string) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const audio = await client.audio.speech.create({
    model: env.AI_TTS_MODEL,
    voice: "alloy",
    input: text,
  });

  const buffer = Buffer.from(await audio.arrayBuffer());
  return buffer;
}
