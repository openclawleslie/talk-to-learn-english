"use client";

import type { DetailedFeedback } from "@/lib/types/pronunciation";

type Props = {
  feedback: DetailedFeedback;
  referenceSentence?: string;
};

export function PronunciationFeedback({ feedback, referenceSentence }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      {/* Reference Sentence */}
      {referenceSentence ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-zinc-600">參考句子</h3>
          <p className="text-base text-zinc-800">{referenceSentence}</p>
        </div>
      ) : null}

      {/* Word-by-word feedback */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-600">發音分析</h3>
        <div className="flex flex-wrap gap-2">
          {feedback.words.map((word, idx) => {
            const colorClass =
              word.status === "correct"
                ? "bg-green-100 text-green-800 border-green-300"
                : "bg-red-100 text-red-800 border-red-300";

            return (
              <span
                key={idx}
                className={`rounded border px-2 py-1 text-sm font-medium ${colorClass}`}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      </div>

      {/* Pronunciation tips */}
      {feedback.tips.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-600">改進建議</h3>
          <ul className="space-y-2">
            {feedback.tips.map((tip, idx) => (
              <li key={idx} className="rounded bg-blue-50 p-3 text-sm">
                <p className="text-zinc-800">{tip.message}</p>
                {tip.example ? (
                  <p className="mt-1 text-xs text-zinc-600">
                    例如: <span className="font-mono">{tip.example}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
