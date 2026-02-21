"use client";

import { useState, useEffect } from "react";
import { Calendar, BookOpen, Volume2, CheckCircle, Clock, Copy, Eye, EyeOff } from "lucide-react";

interface TaskItem {
  weeklyTaskId: string;
  orderIndex: number;
  sentenceText: string;
  audioUrl: string | null;
}

interface WeeklyTask {
  id: string;
  classCourseId: string;
  className: string;
  courseName: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  status: string;
  items: TaskItem[];
}

export default function TeacherWeeklyTasksPage() {
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<WeeklyTask | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchWeeklyTasks();
  }, []);

  const fetchWeeklyTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/teacher/weekly-tasks");
      if (response.ok) {
        const data = await response.json();
        setWeeklyTasks(data.data?.weeklyTasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch weekly tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-TW");
  };

  const isCurrentWeek = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.length === weeklyTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(weeklyTasks.map((task) => task.id));
    }
  };

  const handleBulkPublish = () => {
    if (selectedTaskIds.length === 0) {
      return;
    }
    setShowPublishModal(true);
  };

  const handleBulkUnpublish = () => {
    if (selectedTaskIds.length === 0) {
      return;
    }
    setShowUnpublishModal(true);
  };

  const confirmBulkPublish = async () => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/teacher/weekly-tasks/bulk-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: selectedTaskIds }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("任務發布成功！");
        setShowPublishModal(false);
        setSelectedTaskIds([]);
        fetchWeeklyTasks();
      } else {
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || "發布失敗");
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBulkUnpublish = async () => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/teacher/weekly-tasks/bulk-unpublish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: selectedTaskIds }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("任務取消發布成功！");
        setShowUnpublishModal(false);
        setSelectedTaskIds([]);
        fetchWeeklyTasks();
      } else {
        setMessage(typeof data.error === 'string' ? data.error : data.error?.message || "取消發布失敗");
      }
    } catch (error) {
      setMessage("網路錯誤，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDuplicate = async () => {
    // TODO: Implement bulk duplicate API call
    alert(`複製 ${selectedTaskIds.length} 個任務 (功能開發中)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            每週任務
          </h1>
          <p className="text-base-content/70">查看您負責課程的每週口說任務</p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {weeklyTasks.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.length === weeklyTasks.length && weeklyTasks.length > 0}
                    onChange={toggleSelectAll}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm">
                    {selectedTaskIds.length > 0
                      ? `已選擇 ${selectedTaskIds.length} 個任務`
                      : "全選"}
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkPublish}
                  disabled={selectedTaskIds.length === 0}
                  className="btn btn-sm btn-success gap-1"
                >
                  <Eye className="h-4 w-4" />
                  發布
                </button>
                <button
                  onClick={handleBulkUnpublish}
                  disabled={selectedTaskIds.length === 0}
                  className="btn btn-sm btn-warning gap-1"
                >
                  <EyeOff className="h-4 w-4" />
                  取消發布
                </button>
                <button
                  onClick={handleBulkDuplicate}
                  disabled={selectedTaskIds.length === 0}
                  className="btn btn-sm btn-outline gap-1"
                >
                  <Copy className="h-4 w-4" />
                  複製
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : weeklyTasks.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-base-content/40 mb-4" />
            <p className="text-base-content/60">目前沒有每週任務</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {weeklyTasks.map((task) => {
            const isCurrent = isCurrentWeek(task.startDate, task.endDate);
            const isSelected = selectedTaskIds.includes(task.id);
            return (
              <div
                key={task.id}
                className={`card bg-base-100 shadow-xl ${isCurrent ? "ring-2 ring-primary" : ""} ${isSelected ? "ring-2 ring-accent" : ""}`}
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="checkbox checkbox-sm mt-1"
                      />
                      <div>
                        <h2 className="card-title">
                          {task.className} - {task.courseName}
                        </h2>
                        <p className="text-sm text-base-content/60 mt-1">
                          第{task.weekNumber}週: {formatDate(task.startDate)} ~ {formatDate(task.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span className="badge badge-primary">本週</span>
                      )}
                      {task.status === "published" ? (
                        <span className="badge badge-success gap-1">
                          <CheckCircle className="h-3 w-3" />
                          已發布
                        </span>
                      ) : (
                        <span className="badge badge-warning gap-1">
                          <Clock className="h-3 w-3" />
                          草稿
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="divider my-2" />

                  <div className="text-sm text-base-content/70 mb-2">
                    共 {task.items.length} 個句子
                  </div>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setSelectedTask(task)}
                  >
                    查看詳情
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {selectedTask.className} - {selectedTask.courseName} (第{selectedTask.weekNumber}週)
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedTask.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 bg-base-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-neutral">{index + 1}</span>
                  </div>
                  <p className="text-base">{item.sentenceText}</p>
                  {item.audioUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-base-content/60" />
                      <audio src={item.audioUrl} controls className="h-8 flex-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setSelectedTask(null)}>
                關閉
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setSelectedTask(null)}>close</button>
          </form>
        </dialog>
      )}

      {/* Bulk Publish Confirmation Modal */}
      {showPublishModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">確認發布任務</h3>
            <p className="mb-4">您即將發布以下 {selectedTaskIds.length} 個任務：</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {weeklyTasks
                .filter((task) => selectedTaskIds.includes(task.id))
                .map((task) => (
                  <div key={task.id} className="border rounded p-2 bg-base-200">
                    <div className="font-medium">
                      {task.className} - {task.courseName}
                    </div>
                    <div className="text-sm text-base-content/60">
                      第{task.weekNumber}週: {formatDate(task.startDate)} ~ {formatDate(task.endDate)}
                    </div>
                  </div>
                ))}
            </div>
            {message && (
              <div className={`alert ${message.includes("成功") ? "alert-success" : "alert-error"} mb-4`}>
                {message}
              </div>
            )}
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowPublishModal(false);
                  setMessage("");
                }}
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                className="btn btn-success"
                onClick={confirmBulkPublish}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    發布中...
                  </>
                ) : (
                  "確認發布"
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              onClick={() => {
                setShowPublishModal(false);
                setMessage("");
              }}
              disabled={isSubmitting}
            >
              close
            </button>
          </form>
        </dialog>
      )}

      {/* Bulk Unpublish Confirmation Modal */}
      {showUnpublishModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">確認取消發布任務</h3>
            <p className="mb-4">您即將取消發布以下 {selectedTaskIds.length} 個任務：</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {weeklyTasks
                .filter((task) => selectedTaskIds.includes(task.id))
                .map((task) => (
                  <div key={task.id} className="border rounded p-2 bg-base-200">
                    <div className="font-medium">
                      {task.className} - {task.courseName}
                    </div>
                    <div className="text-sm text-base-content/60">
                      第{task.weekNumber}週: {formatDate(task.startDate)} ~ {formatDate(task.endDate)}
                    </div>
                  </div>
                ))}
            </div>
            {message && (
              <div className={`alert ${message.includes("成功") ? "alert-success" : "alert-error"} mb-4`}>
                {message}
              </div>
            )}
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowUnpublishModal(false);
                  setMessage("");
                }}
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                className="btn btn-warning"
                onClick={confirmBulkUnpublish}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    處理中...
                  </>
                ) : (
                  "確認取消發布"
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              onClick={() => {
                setShowUnpublishModal(false);
                setMessage("");
              }}
              disabled={isSubmitting}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}