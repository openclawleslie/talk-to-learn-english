"use client";

import { useState, useEffect } from "react";
import { Calendar, BookOpen, Volume2, CheckCircle, Clock, Bell } from "lucide-react";

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

interface NotificationSummary {
  total: number;
  sent: number;
  pending: number;
  failed: number;
}

interface NotificationRecord {
  id: string;
  family_id: string;
  parent_name: string | null;
  email: string | null;
  status: "pending" | "sent" | "failed";
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export default function TeacherWeeklyTasksPage() {
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<WeeklyTask | null>(null);
  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary | null>(null);
  const [notificationRecords, setNotificationRecords] = useState<NotificationRecord[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

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

  const openTaskDetail = async (task: WeeklyTask) => {
    setSelectedTask(task);
    setNotificationSummary(null);
    setNotificationRecords([]);

    if (task.status === "published") {
      setLoadingNotifications(true);
      try {
        const response = await fetch(`/api/admin/weekly-tasks/${task.id}/notifications`);
        if (response.ok) {
          const data = await response.json();
          setNotificationSummary(data.data.summary);
          setNotificationRecords(data.data.notifications || []);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoadingNotifications(false);
      }
    }
  };

  const closeTaskDetail = () => {
    setSelectedTask(null);
    setNotificationSummary(null);
    setNotificationRecords([]);
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
            return (
              <div
                key={task.id}
                className={`card bg-base-100 shadow-xl ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="card-title">
                        {task.className} - {task.courseName}
                      </h2>
                      <p className="text-sm text-base-content/60 mt-1">
                        第{task.weekNumber}週: {formatDate(task.startDate)} ~ {formatDate(task.endDate)}
                      </p>
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

                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-base-content/70">
                      共 {task.items.length} 個句子
                    </div>
                    {task.status === "published" && (
                      <div className="flex items-center gap-1 text-sm text-base-content/60">
                        <Bell className="h-4 w-4" />
                        <span>已通知</span>
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => openTaskDetail(task)}
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

            {selectedTask.status === "published" && (
              <div className="mt-6">
                <h4 className="font-semibold text-base mb-3">通知狀態</h4>

                {loadingNotifications ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                ) : notificationSummary && notificationSummary.total > 0 ? (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="bg-base-200 rounded p-3 text-center">
                        <div className="text-2xl font-bold">{notificationSummary.total}</div>
                        <div className="text-xs text-base-content/60">總計</div>
                      </div>
                      <div className="bg-success/20 rounded p-3 text-center">
                        <div className="text-2xl font-bold text-success">{notificationSummary.sent}</div>
                        <div className="text-xs text-base-content/60">已發送</div>
                      </div>
                      <div className="bg-warning/20 rounded p-3 text-center">
                        <div className="text-2xl font-bold text-warning">{notificationSummary.pending}</div>
                        <div className="text-xs text-base-content/60">待發送</div>
                      </div>
                      <div className="bg-error/20 rounded p-3 text-center">
                        <div className="text-2xl font-bold text-error">{notificationSummary.failed}</div>
                        <div className="text-xs text-base-content/60">失敗</div>
                      </div>
                    </div>

                    {notificationRecords.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-base-content/70">家長通知清單</div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {notificationRecords.map((record) => (
                            <div key={record.id} className="rounded border p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{record.parent_name || "未設定姓名"}</div>
                                  <div className="text-xs text-base-content/60">{record.email || "未設定信箱"}</div>
                                </div>
                                <div>
                                  <span
                                    className={`badge badge-sm ${
                                      record.status === "sent"
                                        ? "badge-success"
                                        : record.status === "failed"
                                        ? "badge-error"
                                        : "badge-warning"
                                    }`}
                                  >
                                    {record.status === "sent" ? "已發送" : record.status === "failed" ? "失敗" : "待發送"}
                                  </span>
                                </div>
                              </div>
                              {record.sent_at && (
                                <div className="text-xs text-base-content/60 mt-1">
                                  發送時間: {new Date(record.sent_at).toLocaleString("zh-TW")}
                                </div>
                              )}
                              {record.error && (
                                <div className="text-xs text-error mt-1">
                                  錯誤: {record.error}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-base-content/60">尚無通知記錄</div>
                )}
              </div>
            )}

            <div className="modal-action">
              <button className="btn" onClick={closeTaskDetail}>
                關閉
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeTaskDetail}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}