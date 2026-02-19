"use client";

import { FormEvent, useState } from "react";

type Payload = {
  token: string;
  studentId: string;
  taskItemId: string;
  audioUrl: string;
  transcript?: string;
};

export function FamilySubmitPanel() {
  const [payload, setPayload] = useState<Payload>({
    token: "",
    studentId: "",
    taskItemId: "",
    audioUrl: "",
    transcript: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");

    try {
      let audioUrl = payload.audioUrl;

      if (file) {
        const form = new FormData();
        form.set("file", file);
        form.set("folder", "submissions");
        const uploadResponse = await fetch("/api/audio/upload", { method: "POST", body: form });
        const uploadData = await uploadResponse.json();
        audioUrl = uploadData?.data?.url ?? "";
      }

      const response = await fetch("/api/family/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, audioUrl }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">提交录音</h2>
      <input className="w-full rounded border px-3 py-2" placeholder="token" value={payload.token} onChange={(e) => setPayload({ ...payload, token: e.target.value })} />
      <input className="w-full rounded border px-3 py-2" placeholder="studentId" value={payload.studentId} onChange={(e) => setPayload({ ...payload, studentId: e.target.value })} />
      <input className="w-full rounded border px-3 py-2" placeholder="taskItemId" value={payload.taskItemId} onChange={(e) => setPayload({ ...payload, taskItemId: e.target.value })} />
      <input className="w-full rounded border px-3 py-2" placeholder="audioUrl (optional when file selected)" value={payload.audioUrl} onChange={(e) => setPayload({ ...payload, audioUrl: e.target.value })} />
      <input className="w-full rounded border px-3 py-2" placeholder="transcript (optional)" value={payload.transcript} onChange={(e) => setPayload({ ...payload, transcript: e.target.value })} />
      <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>
      {result ? <pre className="overflow-x-auto rounded bg-zinc-100 p-3 text-xs">{result}</pre> : null}
    </form>
  );
}
