"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, Pause, Mic, Square, Star, Volume2, Check, RotateCcw } from "lucide-react";
import type { FamilyData } from "./page";
import { StarCelebration } from "@/components/star-celebration";

import {
  chooseSupportedRecorderMimeType,
  extensionFromMimeType,
  normalizeMimeType,
} from "@/lib/audio-format";

type Student = { id: string; name: string };

type Props = {
  data: FamilyData;
  student: Student;
  token: string;
  onBack: () => void;
  onRefresh: () => void;
};

type PracticeState = "idle" | "playing" | "recording" | "submitting" | "completed";

export function StudentPractice({ data, student, token, onBack, onRefresh }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<PracticeState>("idle");
  const [lastResult, setLastResult] = useState<{ score: number; stars: number; feedback: string } | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showNext, setShowNext] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderMimeTypeRef = useRef("");
  const recorderExtRef = useRef("webm");
  const hasInitializedRef = useRef(false);

  const currentItem = data.items[currentIndex];
  const existingSubmission = data.submissions.find(
    (s) => s.studentId === student.id && s.taskItemId === currentItem?.id
  );

  // Find first incomplete item — only on initial load
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    const firstIncomplete = data.items.findIndex(
      (item) => !data.submissions.find((s) => s.studentId === student.id && s.taskItemId === item.id)
    );
    if (firstIncomplete !== -1) {
      setCurrentIndex(firstIncomplete);
    }
  }, [data.items, data.submissions, student.id]);

  async function playReference() {
    if (!currentItem?.referenceAudioUrl || !audioRef.current) return;
    setState("playing");
    audioRef.current.src = currentItem.referenceAudioUrl;
    audioRef.current.play();
  }

  function handleAudioEnded() {
    setState("idle");
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = chooseSupportedRecorderMimeType();
      const mediaRecorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      const actualMimeType = normalizeMimeType(mediaRecorder.mimeType || preferredMimeType);
      recorderMimeTypeRef.current = actualMimeType;
      recorderExtRef.current = extensionFromMimeType(actualMimeType);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          if (!recorderMimeTypeRef.current) {
            recorderMimeTypeRef.current = normalizeMimeType(e.data.type) || "audio/webm";
            recorderExtRef.current = extensionFromMimeType(e.data.type);
          }
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = normalizeMimeType(
          recorderMimeTypeRef.current || chunksRef.current[0]?.type || "audio/webm"
        );
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setState("recording");
    } catch {
      alert("無法存取麥克風，請檢查權限設定");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && state === "recording") {
      try {
        mediaRecorderRef.current.requestData();
      } catch {
        // Some browsers do not allow requestData right before stop.
      }

      mediaRecorderRef.current.stop();
      setState("idle");
    }
  }

  async function submitRecording() {
    if (!audioBlob || !currentItem) return;
    setState("submitting");

    try {
      if (audioBlob.size === 0) {
        throw new Error("錄音內容為空，請再錄一次");
      }

      // Single request: send audio file + metadata together
      const formData = new FormData();
      const extension = recorderExtRef.current || extensionFromMimeType(audioBlob.type);
      formData.set("file", audioBlob, `recording.${extension}`);
      formData.set("token", token);
      formData.set("studentId", student.id);
      formData.set("taskItemId", currentItem.id);

      const res = await fetch("/api/family/submissions", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) throw new Error("提交失败");

      // 播放提示音
      try { new Audio("/ding.mp3").play(); } catch {}

      setLastResult({
        score: json.data.score,
        stars: json.data.stars,
        feedback: json.data.feedback,
      });
      setState("completed");
      setAudioBlob(null);
      setShowNext(true);
      setShowCelebration(true);
      setIsRetrying(false);
      onRefresh();
    } catch {
      alert("出错了，请稍后再试");
      setState("idle");
    }
  }

  function goNext() {
    if (currentIndex < data.items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setState("idle");
      setLastResult(null);
      setAudioBlob(null);
      setShowNext(false);
      setShowCelebration(false);
      setIsRetrying(false);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setState("idle");
      setLastResult(null);
      setAudioBlob(null);
      setShowNext(false);
      setShowCelebration(false);
      setIsRetrying(false);
    }
  }

  function retry() {
    setState("idle");
    setLastResult(null);
    setAudioBlob(null);
    setShowNext(false);
    setShowCelebration(false);
    setIsRetrying(true);
  }

  // Calculate progress
  const completedCount = data.items.filter((item) =>
    data.submissions.find((s) => s.studentId === student.id && s.taskItemId === item.id)
  ).length;

  if (!currentItem) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <Check className="h-16 w-16 text-success" />
            <h2 className="card-title">全部完成！</h2>
            <p className="text-base-content/60">你已經完成了本週所有的練習</p>
            <button onClick={onBack} className="btn btn-primary mt-4">返回</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* Star celebration overlay */}
      {showCelebration && lastResult && (
        <StarCelebration
          stars={lastResult.stars}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-sky-400 to-sky-500 text-white px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="btn btn-ghost btn-sm btn-circle text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium">跟讀練習</span>
          <div className="w-8" />
        </div>
        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="text-sm opacity-80">進度</div>
          <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(completedCount / data.items.length) * 100}%` }}
            />
          </div>
          <div className="text-sm font-medium">{completedCount}/{data.items.length}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        {/* Question Card */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            {/* Question Number & Type */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm text-base-content/60">第{currentIndex + 1}題</span>
              <span className="badge badge-warning badge-sm">跟讀題</span>
            </div>

            {/* Play Reference Button */}
            {currentItem.referenceAudioUrl && (
              <div className="flex justify-start mb-4">
                <button
                  onClick={playReference}
                  disabled={state === "recording" || state === "submitting"}
                  className={`btn btn-sm gap-2 ${state === "playing" ? "btn-warning" : "btn-ghost"}`}
                >
                  {state === "playing" ? (
                    <>
                      <Pause className="h-4 w-4" />
                      播放中...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      听原音
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Sentence Display */}
            <div className="text-center py-8">
              <p className="text-2xl font-medium leading-relaxed">{currentItem.sentenceText}</p>
            </div>

            {/* Stars Display (for completed or existing) */}
            {(lastResult || existingSubmission) && (
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3].map((i) => (
                  <Star
                    key={i}
                    className={`h-8 w-8 ${
                      i <= (lastResult?.stars ?? existingSubmission?.stars ?? 0)
                        ? "fill-warning text-warning"
                        : "text-base-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col items-center gap-4">
          {(state === "completed" || (existingSubmission && !isRetrying)) ? (
            <>
              {/* Completed State */}
              <div className="text-center text-sm text-base-content/60 mb-2">
                {lastResult?.feedback || existingSubmission?.feedback || "完成得很好！"}
              </div>
              {lastResult && (
                <div className="text-center text-lg font-bold text-primary mb-2">
                  {lastResult.score} 分
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={retry} className="btn btn-outline gap-2">
                  <RotateCcw className="h-4 w-4" />
                  重新錄製
                </button>
                {currentIndex < data.items.length - 1 && (showNext || existingSubmission) && (
                  <button onClick={goNext} className="btn btn-primary gap-2">
                    下一題
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </button>
                )}
              </div>
            </>
          ) : audioBlob ? (
            <>
              {/* Has Recording, Ready to Submit */}
              <div className="text-sm text-base-content/60 mb-2">錄音完成，點擊提交</div>
              <div className="flex gap-3">
                <button onClick={retry} className="btn btn-outline gap-2">
                  <RotateCcw className="h-4 w-4" />
                  重錄
                </button>
                <button
                  onClick={submitRecording}
                  disabled={state === "submitting"}
                  className="btn btn-primary gap-2"
                >
                  {state === "submitting" ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      提交
                    </>
                  )}
                </button>
              </div>
            </>
          ) : state === "recording" ? (
            <>
              {/* Recording State */}
              <div className="text-sm text-error animate-pulse mb-2">正在錄音...</div>
              <button
                onClick={stopRecording}
                className="btn btn-circle btn-lg btn-error animate-pulse"
              >
                <Square className="h-6 w-6" />
              </button>
              <div className="text-xs text-base-content/60">點擊停止錄音</div>
            </>
          ) : (
            <>
              {/* Idle State - Ready to Record */}
              <div className="text-sm text-base-content/60 mb-2">點擊開始錄音</div>
              <button
                onClick={startRecording}
                disabled={state === "playing"}
                className="btn btn-circle btn-lg btn-primary"
              >
                <Mic className="h-6 w-6" />
              </button>
              <div className="text-xs text-base-content/60">先聽原音，再跟讀</div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-4 bg-base-100 border-t flex justify-between items-center">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="btn btn-ghost btn-sm gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          上一題
        </button>
        <div className="text-sm text-base-content/60">
          {currentIndex + 1} / {data.items.length}
        </div>
        <button
          onClick={goNext}
          disabled={currentIndex === data.items.length - 1}
          className="btn btn-ghost btn-sm gap-1"
        >
          下一題
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
      </div>
    </div>
  );
}
