"use client";

import { useState } from "react";

type Props = {
  title: string;
  endpoint: string;
};

export function FamilyTokenPanel({ title, endpoint }: Props) {
  const [token, setToken] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setResult("");
    try {
      const response = await fetch(`${endpoint}?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <input
        className="w-full rounded border border-zinc-300 px-3 py-2"
        placeholder="Paste family token"
        value={token}
        onChange={(event) => setToken(event.target.value)}
      />
      <button onClick={load} disabled={loading || !token} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">
        {loading ? "Loading..." : "Load"}
      </button>
      {result ? <pre className="overflow-x-auto rounded bg-zinc-100 p-3 text-xs">{result}</pre> : null}
    </section>
  );
}
