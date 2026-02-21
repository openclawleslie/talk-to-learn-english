"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Mic,
  MicOff,
  Star,
  AlertCircle,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  Settings,
} from "lucide-react";

import {
  chooseSupportedRecorderMimeType,
  extensionFromMimeType,
  normalizeMimeType,
} from "@/lib/audio-format";

interface TaskItem {
  id: string;
  orderIndex: number;
  sentenceText: string;
  referenceAudioUrl: string | null;
}

interface Student {
  id: string;
  name: string;
}

interface Submission {
  id: string;
  studentId: string;
  taskItemId: string;
  score: number;
  stars: number;
  feedback: string | null;
}

interface TaskData {
  task: { id: string; weekStart: string; weekEnd: string } | null;
  items: TaskItem[];
  students: Student[];
  submissions: Submission[];
}

function TasksContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [data, setData] = useState<TaskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recording state
  const [recordingItemId, setRecordingItemId] = useState<string | null>(null);
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderMimeTypeRef = useRef("");
  const recorderExtRef = useRef("webm");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/family/weekly-task?token=${encodeURIComponent(token)}`
      );
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "無法載入任務");
        return;
      }
      setData(json.data);
      if (json.data.students?.length === 1) {
        setSelectedStudent(json.data.students[0].id);
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("缺少存取權杖");
      setIsLoading(false);
      return;
    }
    fetchTasks();
  }, [token, fetchTasks]);

  const toggleAudio = (url: string, itemId: string) => {
    if (playingAudio === itemId) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.play();
    audioRef.current = audio;
    setPlayingAudio(itemId);
  };

  const startRecording = async (itemId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = chooseSupportedRecorderMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      const actualMimeType = normalizeMimeType(recorder.mimeType || preferredMimeType);
      recorderMimeTypeRef.current = actualMimeType;
      recorderExtRef.current = extensionFromMimeType(actualMimeType);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          if (!recorderMimeTypeRef.current) {
            recorderMimeTypeRef.current = normalizeMimeType(e.data.type) || "audio/webm";
            recorderExtRef.current = extensionFromMimeType(e.data.type);
          }
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        handleSubmit(itemId);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecordingItemId(itemId);
    } catch {
      alert("無法存取麥克風，請確認瀏覽器權限");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      setRecordingItemId(null);
      return;
    }

    try {
      recorder.requestData();
    } catch {
      // Some browsers do not allow requestData right before stop.
    }

    recorder.stop();
    setRecordingItemId(null);
  };

  const handleSubmit = async (itemId: string) => {
    if (!selectedStudent) return;
    setSubmittingItemId(itemId);
    try {
      if (chunksRef.current.length === 0) {
        throw new Error("錄音資料是空的，請再錄一次");
      }

      const mimeType = normalizeMimeType(
        recorderMimeTypeRef.current || chunksRef.current[0]?.type || "audio/webm"
      );
      const extension = recorderExtRef.current || extensionFromMimeType(mimeType);
      const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });

      if (blob.size === 0) {
        throw new Error("錄音內容為空，請再錄一次");
      }

      const formData = new FormData();
      formData.set("file", blob, `recording-${Date.now()}.${extension}`);
      formData.set("token", token);
      formData.set("studentId", selectedStudent);
      formData.set("taskItemId", itemId);

      const res = await fetch("/api/family/submissions", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error("提交失败");

      // Refresh data to show new submission
      await fetchTasks();
    } catch {
      alert("出错了，请稍后再试");
    } finally {
      chunksRef.current = [];
      setSubmittingItemId(null);
    }
  };

  const getSubmissionsForItem = (itemId: string) =>
    data?.submissions.filter((s) => s.taskItemId === itemId) || [];

  const getStudentName = (studentId: string) =>
    data?.students.find((s) => s.id === studentId)?.name || "未知";

  const renderStars = (count: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < count ? "fill-warning text-warning" : "text-base-content/20"}`}
      />
    ));

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="alert alert-error">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Back Navigation */}
      <Link href={`/family/${token}`} className="btn btn-ghost btn-sm gap-1">
        <ArrowLeft className="h-4 w-4" />
        返回首頁
      </Link>

      {/* Header */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl">
        <div className="card-body">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            本週任務
          </h1>
          {data?.task ? (
            <p className="opacity-90">
              {new Date(data.task.weekStart).toLocaleDateString("zh-TW")} ~{" "}
              {new Date(data.task.weekEnd).toLocaleDateString("zh-TW")}
            </p>
          ) : (
            <p className="opacity-90">本週尚未發布任務</p>
          )}
          {/* Link to full practice */}
          <div className="flex gap-2 mt-2">
            {data?.task && (
              <Link href={`/family/${token}`} className="btn btn-sm btn-ghost gap-1 text-primary-content/80 hover:text-primary-content">
                <Mic className="h-4 w-4" />
                前往練習頁面
              </Link>
            )}
            <Link href={`/family/preferences?token=${token}`} className="btn btn-sm btn-ghost gap-1 text-primary-content/80 hover:text-primary-content">
              <Settings className="h-4 w-4" />
              通知設定
            </Link>
          </div>
        </div>
      </div>
      {data && data.students.length > 1 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body py-4">
            <label className="label font-medium">選擇學生</label>
            <select
              className="select select-bordered w-full"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">請選擇學生</option>
              {data.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Task Items */}
      {!data?.task || data.items.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-base-content/40 mb-4" />
            <p className="text-base-content/60">本週尚無練習任務</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((item) => {
            const subs = getSubmissionsForItem(item.id);
            const isRecording = recordingItemId === item.id;
            const isSubmitting = submittingItemId === item.id;
            const studentHasSubmitted =
              selectedStudent &&
              subs.some((s) => s.studentId === selectedStudent);

            return (
              <div key={item.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  {/* Sentence + reference audio */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="badge badge-primary badge-lg font-bold">
                        {item.orderIndex + 1}
                      </div>
                      <p className="text-lg font-medium mt-0.5">
                        {item.sentenceText}
                      </p>
                    </div>
                    {item.referenceAudioUrl && (
                      <button
                        className="btn btn-circle btn-sm btn-ghost"
                        onClick={() =>
                          toggleAudio(item.referenceAudioUrl!, item.id)
                        }
                      >
                        {playingAudio === item.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Practice button */}
                  <div className="mt-3">
                    {isSubmitting ? (
                      <button className="btn btn-disabled btn-block gap-2" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        評分中...
                      </button>
                    ) : isRecording ? (
                      <button
                        className="btn btn-error btn-block gap-2 animate-pulse"
                        onClick={stopRecording}
                      >
                        <MicOff className="h-4 w-4" />
                        停止錄音並提交
                      </button>
                    ) : studentHasSubmitted ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">已完成練習</span>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary btn-block gap-2"
                        disabled={!selectedStudent}
                        onClick={() => startRecording(item.id)}
                      >
                        <Mic className="h-4 w-4" />
                        {selectedStudent ? "開始練習" : "請先選擇學生"}
                      </button>
                    )}
                  </div>

                  {/* Student submissions */}
                  {subs.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-3 bg-base-200 rounded-lg px-3 py-2"
                        >
                          <span className="font-medium text-sm">
                            {getStudentName(sub.studentId)}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {renderStars(sub.stars)}
                          </div>
                          <span className="badge badge-sm">
                            {sub.score} 分
                          </span>
                          {sub.feedback && (
                            <span className="text-xs text-base-content/50 ml-auto">
                              {sub.feedback}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Students who haven't submitted */}
                  {data.students
                    .filter(
                      (st) => !subs.some((sub) => sub.studentId === st.id)
                    )
                    .map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-3 bg-base-200 rounded-lg px-3 py-2 opacity-50"
                      >
                        <span className="font-medium text-sm">{st.name}</span>
                        <span className="badge badge-ghost badge-sm">
                          <Mic className="h-3 w-3 mr-1" />
                          尚未提交
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function FamilyTasksPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-6">
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg" />
          </div>
        </main>
      }
    >
      <TasksContent />
    </Suspense>
  );
}
