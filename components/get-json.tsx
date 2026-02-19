"use client";

import { useState } from "react";

type Props = {
  endpoint: string;
  title: string;
};

export function GetJson({ endpoint, title }: Props) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setResult("");
    try {
      const response = await fetch(endpoint);
      const json = await response.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      setResult(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <button onClick={load} className="rounded bg-blue-600 px-4 py-2 text-white" disabled={loading}>
        {loading ? "Loading..." : "Load"}
      </button>
      {result ? <pre className="overflow-x-auto rounded bg-zinc-100 p-3 text-xs">{result}</pre> : null}
    </section>
  );
}
