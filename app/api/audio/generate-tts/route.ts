import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { uploadAudio } from "@/lib/blob";
import { fromError, ok } from "@/lib/http";

const generateTTSSchema = z.object({
  text: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const payload = generateTTSSchema.parse(await request.json());

    // Use OpenAI TTS API (or compatible endpoint)
    const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    const ttsModel = process.env.AI_TTS_MODEL || "tts-1";

    if (!apiKey) {
      throw new Error("API Key is missing. Please set AI_API_KEY or OPENAI_API_KEY in environment variables.");
    }

    // Call OpenAI TTS API
    const ttsEndpoint = `${baseUrl}/audio/speech`;

    console.log(`[TTS] Calling ${ttsEndpoint} with model ${ttsModel}`);
    console.log(`[TTS] Input text: "${payload.text}"`);

    const response = await fetch(ttsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ttsModel,
        input: payload.text,
        voice: "alloy",
        response_format: "mp3",
      }),
    }).catch((err) => {
      console.error("[TTS] Fetch error:", err);
      throw new Error(`Network error: ${err.message}`);
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS] API error: ${response.status} - ${errorText}`);
      throw new Error(`TTS API error: ${response.status} - ${errorText}`);
    }

    // Log response headers
    console.log("[TTS] Response headers:", {
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    console.log("[TTS] Audio generated successfully, uploading to blob storage...");

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS] Audio buffer size: ${audioBuffer.byteLength} bytes`);

    // Check if the response is actually audio data by inspecting the first few bytes
    const uint8Array = new Uint8Array(audioBuffer);
    const firstBytes = Array.from(uint8Array.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    console.log(`[TTS] First 16 bytes (hex): ${firstBytes}`);

    // MP3 files typically start with FF FB or FF F3 (MPEG audio frame sync)
    // or ID3 tag (49 44 33 = "ID3")
    const isLikelyMP3 = uint8Array[0] === 0xFF ||
                        (uint8Array[0] === 0x49 && uint8Array[1] === 0x44 && uint8Array[2] === 0x33);

    if (!isLikelyMP3) {
      // Try to decode as text to see if it's an error message
      const textDecoder = new TextDecoder();
      const possibleText = textDecoder.decode(audioBuffer.slice(0, 200));
      console.error(`[TTS] Response doesn't look like MP3 data. First 200 chars: ${possibleText}`);
      throw new Error("Received invalid audio data from TTS API");
    }

    if (audioBuffer.byteLength === 0) {
      throw new Error("Received empty audio buffer from TTS API");
    }

    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
    console.log(`[TTS] Audio blob size: ${audioBlob.size} bytes`);

    // Convert Blob to File
    const audioFile = new File(
      [audioBlob],
      `tts-${Date.now()}.mp3`,
      { type: "audio/mpeg" }
    );
    console.log(`[TTS] Audio file size: ${audioFile.size} bytes, name: ${audioFile.name}`);

    // Upload to blob storage
    const uploaded = await uploadAudio(`reference-audio/${audioFile.name}`, audioFile);

    console.log(`[TTS] Upload complete: ${uploaded.url}`);

    return ok({ audioUrl: uploaded.url }, { status: 201 });
  } catch (error) {
    console.error("[TTS] Error:", error);
    return fromError(error);
  }
}
