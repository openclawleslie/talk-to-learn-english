import { NextRequest } from "next/server";

import { uploadAudio } from "@/lib/blob";
import { fromError, fail, ok } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "submissions");

    if (!(file instanceof File)) {
      return fail("file is required", 400);
    }

    const uploaded = await uploadAudio(`${folder}/${Date.now()}-${file.name}`, file);
    return ok(uploaded, { status: 201 });
  } catch (error) {
    return fromError(error);
  }
}
