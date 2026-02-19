"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  endpoint: string;
  title: string;
  payloadTemplate: string;
  redirectTo: string;
};

export function LoginForm({ endpoint, title, payloadTemplate, redirectTo }: Props) {
  const [payload, setPayload] = useState(payloadTemplate);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data?.error?.message ?? "Login failed");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-16 max-w-xl space-y-3 rounded-lg border border-zinc-200 p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <textarea
        className="h-36 w-full rounded-md border border-zinc-300 p-2 font-mono text-sm"
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
      />
      <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60">
        {loading ? "Logging in..." : "Login"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
