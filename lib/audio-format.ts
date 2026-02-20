/**
 * Mapping from MIME type patterns to file extensions.
 * Used to determine the appropriate file extension for audio files.
 */
const MIME_TO_EXTENSION: Array<{ match: RegExp; extension: string }> = [
  { match: /audio\/webm|video\/webm/, extension: "webm" },
  { match: /audio\/ogg|video\/ogg/, extension: "ogg" },
  { match: /audio\/(mpeg|mp3)/, extension: "mp3" },
  { match: /audio\/(mp4|x-m4a)|video\/mp4/, extension: "m4a" },
  { match: /audio\/(wav|x-wav)/, extension: "wav" },
  { match: /audio\/aac/, extension: "aac" },
  { match: /audio\/flac/, extension: "flac" },
];

/**
 * Mapping from file extensions to MIME types.
 * Used to determine the MIME type from a file extension.
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  wav: "audio/wav",
  aac: "audio/aac",
  flac: "audio/flac",
};

/**
 * Ordered list of MIME type candidates for MediaRecorder.
 * The first supported format will be used for recording audio in the browser.
 */
const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "video/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

/**
 * Normalizes a MIME type string by removing codec information and converting to lowercase.
 *
 * Extracts the base MIME type (e.g., "audio/webm") from a full MIME type string
 * that may include codec parameters (e.g., "audio/webm;codecs=opus").
 *
 * @param value - MIME type string to normalize (can be null or undefined)
 * @returns Normalized MIME type (e.g., "audio/webm") or empty string if input is null/undefined
 *
 * @example
 * ```ts
 * normalizeMimeType('audio/webm;codecs=opus') // Returns: 'audio/webm'
 * normalizeMimeType('Audio/MPEG') // Returns: 'audio/mpeg'
 * normalizeMimeType(null) // Returns: ''
 * ```
 */
export function normalizeMimeType(value: string | null | undefined) {
  if (!value) return "";
  return value.split(";")[0].trim().toLowerCase();
}

/**
 * Determines the appropriate file extension for a given MIME type.
 *
 * Maps common audio MIME types to their standard file extensions.
 * Falls back to "webm" if the MIME type is not recognized or is null/undefined.
 *
 * @param mimeType - MIME type string (can be null or undefined)
 * @returns File extension (without dot) - one of: webm, ogg, mp3, m4a, wav, aac, flac
 *
 * @example
 * ```ts
 * extensionFromMimeType('audio/mpeg') // Returns: 'mp3'
 * extensionFromMimeType('audio/webm;codecs=opus') // Returns: 'webm'
 * extensionFromMimeType('audio/unknown') // Returns: 'webm' (default)
 * extensionFromMimeType(null) // Returns: 'webm' (default)
 * ```
 */
export function extensionFromMimeType(mimeType: string | null | undefined) {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) return "webm";

  const mapping = MIME_TO_EXTENSION.find(({ match }) => match.test(normalized));
  return mapping?.extension ?? "webm";
}

/**
 * Extracts the MIME type from a file URL based on its extension.
 *
 * Parses the URL pathname to get the file extension and maps it to a MIME type.
 * Returns an empty string if the URL is invalid, has no extension, or the extension
 * is not recognized.
 *
 * @param fileUrl - URL string containing a file path with extension
 * @returns MIME type string or empty string if not found
 *
 * @example
 * ```ts
 * mimeTypeFromUrl('https://example.com/audio.mp3') // Returns: 'audio/mpeg'
 * mimeTypeFromUrl('https://example.com/audio.webm') // Returns: 'audio/webm'
 * mimeTypeFromUrl('https://example.com/file.unknown') // Returns: ''
 * mimeTypeFromUrl('not-a-url') // Returns: '' (invalid URL)
 * ```
 */
export function mimeTypeFromUrl(fileUrl: string) {
  try {
    const pathname = new URL(fileUrl).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase();
    if (!extension) return "";
    return EXTENSION_TO_MIME[extension] ?? "";
  } catch {
    return "";
  }
}

/**
 * Selects the first browser-supported MIME type for MediaRecorder.
 *
 * Tests a list of preferred audio MIME types (in priority order) to find the first
 * format that the browser's MediaRecorder API supports. Returns an empty string if
 * MediaRecorder is unavailable (e.g., in server-side rendering) or no formats are supported.
 *
 * The priority order is:
 * 1. audio/webm;codecs=opus
 * 2. audio/webm
 * 3. audio/mp4;codecs=mp4a.40.2
 * 4. audio/mp4
 * 5. video/mp4
 * 6. audio/ogg;codecs=opus
 * 7. audio/ogg
 *
 * @returns Supported MIME type string or empty string if none supported
 *
 * @example
 * ```ts
 * const mimeType = chooseSupportedRecorderMimeType();
 * if (mimeType) {
 *   const mediaRecorder = new MediaRecorder(stream, { mimeType });
 * } else {
 *   console.error('No supported audio recording format found');
 * }
 * ```
 */
export function chooseSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  for (const candidate of RECORDER_MIME_CANDIDATES) {
    if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "";
}
