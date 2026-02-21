"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, CheckCircle, Clock, Volume2, Loader2 } from "lucide-react";

interface WeeklyTask {
  id: string;
  class_course_id: string;
  class_name: string | null;
  course_name: string | null;
  week_start: string;
  week_end: string;
  status: string;
  created_at: string;
}

interface ClassCourse {
  id: string;
  class_id: string;
  course_id: string;
  class_name: string | null;
  course_name: string | null;
}

interface TaskItem {
  orderIndex: number;
  sentenceText: string;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
}

interface TaskPreview {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
}

interface TaskPreviewItem {
  id: string;
  order_index: number;
  sentence_text: string;
  reference_audio_url?: string | null;
  reference_audio_status: "ready" | "pending" | "failed";
}

export default function AdminWeeklyTasksPage() {
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedClassCourseIds, setSelectedClassCourseIds] = useState<string[]>([]);
  const [previewTask, setPreviewTask] = useState<TaskPreview | null>(null);
  const [previewItems, setPreviewItems] = useState<TaskPreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday.toISOString().split("T")[0];
  });
  const [weekEnd, setWeekEnd] = useState(() => {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay() + 7);
    return sunday.toISOString().split("T")[0];
  });
  const [deadline, setDeadline] = useState("");
  const [items, setItems] = useState<TaskItem[]>(
    Array.from({ length: 10 }).map((_, i) => ({
      orderIndex: i + 1,
      sentenceText: "",
    }))
  );

  useEffect(() => {
    fetchTasks();
    fetchClassCourses();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/weekly-tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassCourses = async () => {
    try {
      const response = await fetch("/api/admin/class-courses");
      if (response.ok) {
        const data = await response.json();
        setClassCourses(data.data.classCourses || []);
      }
    } catch (error) {
      console.error("Failed to fetch class courses:", error);
    }
  };

  const handleGenerateAudio = async (index: number) => {
    const item = items[index];
    if (!item.sentenceText.trim()) {
      alert("請先輸入句子內容");
      return;
    }

    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, isGeneratingAudio: true } : it))
    );

    try {
      // Call TTS API to generate audio
      const response = await fetch("/api/audio/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: item.sentenceText }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store the audio URL in the item
        setItems((prev) =>
          prev.map((it, i) => (i === index ? { ...it, audioUrl: data.data.audioUrl } : it))
        );
        setMessage(`句子 ${index + 1} 的音訊已產生`);
      } else {
        setMessage(`句子 ${index + 1} 音訊產生失敗`);
      }
    } catch (error) {
      setMessage("網路錯誤");
    } finally {
      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, isGeneratingAudio: false } : it))
      );
    }
  };

  const handleSubmit = async (status: "draft" | "published") => {
    if (selectedClassCourseIds.length === 0) {
      alert("請選擇至少一個班級課程");
      return;
    }

    const emptyItems = items.filter((item) => !item.sentenceText.trim());
    if (emptyItems.length > 0) {
      alert("請填寫所有10個句子");
      return;
    }

    const missingAudioItems = items.filter((item) => !item.audioUrl);
    if (missingAudioItems.length > 0) {
      alert("請先為所有句子產生音訊");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/weekly-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classCourseIds: selectedClassCourseIds,
          weekStart: new Date(weekStart).toISOString(),
          weekEnd: new Date(weekEnd).toISOString(),
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          status,
          items: items.map((item) => ({
            orderIndex: item.orderIndex,
            sentenceText: item.sentenceText,
            referenceAudioUrl: item.audioUrl,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`任務${status === "published" ? "發布" : "儲存"}成功！`);
        setShowModal(false);
        resetForm();
        fetchTasks();
      } else {
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || "操作失敗");
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedClassCourseIds([]);
    setDeadline("");
    setItems(
      Array.from({ length: 10 }).map((_, i) => ({
        orderIndex: i + 1,
        sentenceText: "",
      }))
    );
  };

  const toggleClassCourse = (id: string) => {
    setSelectedClassCourseIds((prev) =>
      prev.includes(id) ? prev.filter((ccId) => ccId !== id) : [...prev, id]
    );
  };

  const openPreview = async (taskId: string) => {
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewItems([]);
    setShowPreviewModal(true);
    try {
      const response = await fetch(`/api/admin/weekly-tasks/${taskId}`);
      const data = await response.json();
      if (response.ok) {
        setPreviewTask(data.data.task);
        setPreviewItems(data.data.items || []);
      } else {
        setPreviewError(data.error?.message || "載入失敗");
      }
    } catch (error) {
      setPreviewError("網路錯誤");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setShowPreviewModal(false);
    setPreviewTask(null);
    setPreviewItems([]);
    setPreviewError("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">每週任務管理</h1>
          <p className="text-base-content/60 mt-2">建立和管理每週的口說練習任務</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
        >
          <Plus className="h-5 w-5" />
          建立任務
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="alert alert-info">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="btn btn-sm btn-ghost">
            ×
          </button>
        </div>
      )}

      {/* Tasks List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base-content/60">尚無任務，點擊上方按鈕建立</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>班級課程</th>
                    <th>週期</th>
                    <th>狀態</th>
                    <th>建立時間</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.id}</td>
                      <td>
                        <span className="font-medium">
                          {task.class_name || "未設定班級"} - {task.course_name || "未設定課程"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(task.week_start).toLocaleDateString()} -{" "}
                          {new Date(task.week_end).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            task.status === "published" ? "badge-success" : "badge-warning"
                          }`}
                        >
                          {task.status === "published" ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              已發布
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              草稿
                            </>
                          )}
                        </span>
                      </td>
                      <td>{new Date(task.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => openPreview(task.id)}
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">建立每週任務</h3>

            <div className="space-y-6">
              {/* Week Period */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">開始日期（週一）</span>
                  </label>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="input input-bordered"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">結束日期（週日）</span>
                  </label>
                  <input
                    type="date"
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    className="input input-bordered"
                  />
                </div>
              </div>

              {/* Deadline */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">截止時間（選填）</span>
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input input-bordered"
                />
              </div>

              {/* Class Courses Selection */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">選擇班級課程</span>
                </label>
                <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                  {classCourses.length === 0 ? (
                    <p className="text-sm text-base-content/60">尚無可選班級課程</p>
                  ) : (
                    <div className="space-y-2">
                      {classCourses.map((cc) => (
                        <label key={cc.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedClassCourseIds.includes(cc.id)}
                            onChange={() => toggleClassCourse(cc.id)}
                            className="checkbox checkbox-sm"
                          />
                          <span>
                            {cc.class_name} - {cc.course_name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Task Items (10 sentences) */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">練習句子（共10句）</span>
                </label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="badge badge-neutral">{index + 1}</div>
                      <input
                        type="text"
                        value={item.sentenceText}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === index ? { ...it, sentenceText: e.target.value } : it
                            )
                          )
                        }
                        placeholder={`句子 ${index + 1}`}
                        className="input input-bordered input-sm flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateAudio(index)}
                        className="btn btn-sm btn-ghost"
                        disabled={item.isGeneratingAudio || !item.sentenceText.trim()}
                        title="產生音訊"
                      >
                        {item.isGeneratingAudio ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                      {item.audioUrl && (
                        <audio
                          src={item.audioUrl}
                          controls
                          className="h-8"
                          style={{ maxWidth: "200px" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn"
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit("draft")}
                  className="btn btn-outline"
                  disabled={isSubmitting}
                >
                  儲存草稿
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit("published")}
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "發布中..." : "發布任務"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">作業預覽</h3>
              <button type="button" className="btn btn-sm btn-ghost" onClick={closePreview}>
                ×
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {previewTask ? (
                <div className="text-sm text-base-content/70">
                  <span className="mr-3">ID: {previewTask.id}</span>
                  <span className="mr-3">
                    週期: {new Date(previewTask.week_start).toLocaleDateString()} -{" "}
                    {new Date(previewTask.week_end).toLocaleDateString()}
                  </span>
                  <span>狀態: {previewTask.status === "published" ? "已發布" : "草稿"}</span>
                </div>
              ) : null}

              {previewLoading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-spinner loading-md" />
                </div>
              ) : previewError ? (
                <div className="alert alert-error">
                  <span>{previewError}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {previewItems.length === 0 ? (
                    <div className="text-sm text-base-content/60">尚無句子</div>
                  ) : (
                    previewItems.map((item) => (
                      <div key={item.id} className="rounded border p-4">
                        <div className="flex items-center gap-3">
                          <div className="badge badge-neutral">{item.order_index}</div>
                          <div className="text-base font-medium">{item.sentence_text}</div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {item.reference_audio_url ? (
                            <>
                              <audio src={item.reference_audio_url} controls className="h-10 w-full" />
                              <div>
                                <div className="text-xs text-base-content/60">音訊 URL</div>
                                <div className="rounded bg-base-200 px-2 py-1 text-xs font-mono break-all">
                                  {item.reference_audio_url}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-base-content/60">
                              參考音訊狀態: {item.reference_audio_status}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
