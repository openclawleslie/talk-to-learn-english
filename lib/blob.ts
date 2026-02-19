import { put } from "@vercel/blob";

export async function uploadAudio(path: string, file: File) {
  const result = await put(path, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return result;
}

export async function uploadBuffer(path: string, data: Buffer, contentType: string) {
  const blob = new Blob([new Uint8Array(data)], { type: contentType });
  const result = await put(path, blob, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });

  return result;
}
