import { put } from "@vercel/blob";

/**
 * Uploads an audio file to Vercel Blob storage.
 *
 * Files are stored with public access and a random suffix is added to the filename
 * to prevent collisions and enable cache-busting.
 *
 * @param path - Target path/filename in blob storage (e.g., "audio/recordings/file.webm")
 * @param file - Audio file to upload
 * @returns Vercel Blob upload result containing the public URL and metadata
 * @throws {Error} If upload fails or Vercel Blob is not configured
 *
 * @example
 * ```ts
 * const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
 * const result = await uploadAudio('audio/submissions/recording.webm', audioFile);
 * console.log('Uploaded to:', result.url);
 * ```
 */
export async function uploadAudio(path: string, file: File) {
  const result = await put(path, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return result;
}

/**
 * Uploads a buffer to Vercel Blob storage with a specific content type.
 *
 * Useful for uploading generated content like AI-generated audio or images.
 * Files are stored with public access and a random suffix is added to prevent collisions.
 *
 * @param path - Target path/filename in blob storage (e.g., "audio/reference/speech.mp3")
 * @param data - Buffer containing the file data to upload
 * @param contentType - MIME type of the content (e.g., "audio/mpeg", "image/png")
 * @returns Vercel Blob upload result containing the public URL and metadata
 * @throws {Error} If upload fails or Vercel Blob is not configured
 *
 * @example
 * ```ts
 * const audioBuffer = await createReferenceSpeech('Hello world');
 * const result = await uploadBuffer('audio/tts/hello.mp3', audioBuffer, 'audio/mpeg');
 * console.log('TTS audio available at:', result.url);
 * ```
 */
export async function uploadBuffer(path: string, data: Buffer, contentType: string) {
  const blob = new Blob([new Uint8Array(data)], { type: contentType });
  const result = await put(path, blob, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });

  return result;
}
