import OpenAI from "openai";

import { extensionFromMimeType, mimeTypeFromUrl, normalizeMimeType } from "@/lib/audio-format";
import { env } from "@/lib/env";
import type { DetailedFeedback, PronunciationTip } from "@/lib/types/pronunciation";
import { alignWords } from "@/lib/word-alignment";

/**
 * Creates an OpenAI client instance if API credentials are configured.
 *
 * @returns OpenAI client instance or null if credentials are missing
 * @internal
 */
function getClient() {
  if (!env.AI_API_KEY || !env.AI_BASE_URL) {
    return null;
  }

  return new OpenAI({
    apiKey: env.AI_API_KEY,
    baseURL: env.AI_BASE_URL,
  });
}

/**
 * Gets an OpenAI client instance, throwing an error if not configured.
 *
 * @returns OpenAI client instance
 * @throws {Error} If AI_API_KEY or AI_BASE_URL environment variables are not set
 * @internal
 */
function requireClient() {
  const client = getClient();
  if (!client) {
    throw new Error("AI service is not configured (missing AI_API_KEY or AI_BASE_URL)");
  }
  return client;
}

/**
 * Transcribes an audio file to text using the configured AI transcription model.
 *
 * @param file - Audio file to transcribe (supports formats: mp3, mp4, mpeg, mpga, m4a, wav, webm)
 * @returns Transcribed text from the audio
 * @throws {Error} If AI service is not configured or transcription fails
 *
 * @example
 * ```ts
 * const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
 * const transcript = await transcribeAudio(audioFile);
 * console.log('User said:', transcript);
 * ```
 */
export async function transcribeAudio(file: File) {
  const client = requireClient();

  const response = await client.audio.transcriptions.create({
    file,
    model: env.AI_TRANSCRIBE_MODEL,
  });

  return response.text;
}

/**
 * Downloads an audio file from a URL and transcribes it to text.
 *
 * The function automatically detects the audio format from the Content-Type header
 * or URL extension, defaulting to audio/webm if neither is available.
 *
 * @param audioUrl - URL of the audio file to download and transcribe
 * @returns Transcribed text from the audio
 * @throws {Error} If audio download fails, AI service is not configured, or transcription fails
 *
 * @example
 * ```ts
 * const transcript = await transcribeAudioFromUrl('https://example.com/recording.mp3');
 * console.log('Transcription:', transcript);
 * ```
 */
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

/**
 * Generates pronunciation improvement tips in Traditional Chinese based on error patterns.
 *
 * @param words - Aligned words from word alignment
 * @returns Array of pronunciation tips
 * @internal
 */
function generatePronunciationTips(words: DetailedFeedback["words"]): PronunciationTip[] {
  const tips: PronunciationTip[] = [];
  const incorrectWords = words.filter((w) => w.status === "incorrect");
  const missingWords = words.filter((w) => w.status === "missing");
  const extraWords = words.filter((w) => w.status === "extra");

  // Tip for incorrect words
  if (incorrectWords.length > 0) {
    const examples = incorrectWords.slice(0, 3).map((w) => w.text);
    tips.push({
      message: `注意這些字的發音：${examples.join("、")}。請再聽一次示範音檔，仔細模仿發音。`,
      example: examples.join(", "),
    });
  }

  // Tip for missing words
  if (missingWords.length > 0) {
    const examples = missingWords.slice(0, 3).map((w) => w.text);
    tips.push({
      message: `您漏掉了一些字：${examples.join("、")}。請確保說出完整的句子。`,
      example: examples.join(", "),
    });
  }

  // Tip for extra words
  if (extraWords.length > 0) {
    tips.push({
      message: "您說了一些多餘的字。請只說出題目要求的句子內容。",
    });
  }

  // General encouragement tip if doing well
  if (incorrectWords.length === 0 && missingWords.length === 0 && extraWords.length === 0) {
    tips.push({
      message: "太棒了！您的發音非常準確。繼續保持！",
    });
  } else if (incorrectWords.length + missingWords.length + extraWords.length <= 2) {
    tips.push({
      message: "做得很好！再多練習幾次，您會越來越進步的。",
    });
  }

  return tips;
}

/**
 * Evaluates how accurately a child spoke a target English sentence using AI scoring.
 *
 * The AI model compares the target sentence with the actual transcript and returns
 * a score (0-100), feedback message, and detailed word-level analysis with
 * pronunciation tips in Traditional Chinese.
 *
 * @param input - Object containing the target sentence and actual transcript
 * @param input.sentence - The target English sentence the child should speak
 * @param input.transcript - The actual transcribed text from the child's speech
 * @returns Object containing score (0-100), feedback message, and detailed feedback
 * @throws {Error} If AI service is not configured, scoring fails, or response is invalid
 *
 * @example
 * ```ts
 * const result = await scoreSpokenSentence({
 *   sentence: 'Hello, how are you today?',
 *   transcript: 'Hello how are you today'
 * });
 * console.log(`Score: ${result.score}/100`);
 * console.log(`Feedback: ${result.feedback}`);
 * console.log(`Words:`, result.detailedFeedback.words);
 * console.log(`Tips:`, result.detailedFeedback.tips);
 * ```
 */
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

  // Generate detailed word-level feedback
  const words = alignWords({
    reference: input.sentence,
    transcript: input.transcript,
  });

  const tips = generatePronunciationTips(words);

  const detailedFeedback: DetailedFeedback = {
    words,
    tips,
  };

  return {
    score: Math.min(100, Math.max(0, Math.round(parsed.score))),
    feedback: parsed.feedback,
    detailedFeedback,
  };
}

/**
 * Generates reference speech audio from text using AI text-to-speech.
 *
 * Creates an audio file of the given text spoken by the "alloy" voice.
 * Returns null if AI service is not configured (graceful degradation).
 *
 * @param text - Text to convert to speech
 * @returns Audio buffer containing the generated speech, or null if AI not configured
 * @throws {Error} If TTS generation fails (but not if service is unconfigured)
 *
 * @example
 * ```ts
 * const audioBuffer = await createReferenceSpeech('Hello, how are you today?');
 * if (audioBuffer) {
 *   // Save or stream the audio buffer
 *   await uploadBuffer(audioBuffer, 'reference-speech.mp3');
 * }
 * ```
 */
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
