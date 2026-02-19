"use client";

import { useState, useEffect } from "react";
import { Calendar, BookOpen, Volume2, CheckCircle, Clock } from "lucide-react";

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
    </div>
  );
}