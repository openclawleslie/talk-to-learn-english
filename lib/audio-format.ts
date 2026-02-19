const MIME_TO_EXTENSION: Array<{ match: RegExp; extension: string }> = [
  { match: /audio\/webm|video\/webm/, extension: "webm" },
  { match: /audio\/ogg|video\/ogg/, extension: "ogg" },
  { match: /audio\/(mpeg|mp3)/, extension: "mp3" },
  { match: /audio\/(mp4|x-m4a)|video\/mp4/, extension: "m4a" },
  { match: /audio\/(wav|x-wav)/, extension: "wav" },
  { match: /audio\/aac/, extension: "aac" },
  { match: /audio\/flac/, extension: "flac" },
];

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

const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "video/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export function normalizeMimeType(value: string | null | undefined) {
  if (!value) return "";
  return value.split(";")[0].trim().toLowerCase();
}

export function extensionFromMimeType(mimeType: string | null | undefined) {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) return "webm";

  const mapping = MIME_TO_EXTENSION.find(({ match }) => match.test(normalized));
  return mapping?.extension ?? "webm";
}

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
