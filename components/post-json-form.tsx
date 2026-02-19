"use client";

import { FormEvent, useState } from "react";

type Props = {
  endpoint: string;
  method?: "POST" | "PUT";
  defaultValue: string;
  title: string;
};

export function PostJsonForm({ endpoint, method = "POST", defaultValue, title }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: value,
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
      <h3 className="text-lg font-semibold">{title}</h3>
      <textarea
        className="h-44 w-full rounded-md border border-zinc-300 p-2 font-mono text-sm"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
      {result ? <pre className="overflow-x-auto rounded-md bg-zinc-100 p-3 text-xs">{result}</pre> : null}
    </form>
  );
}
