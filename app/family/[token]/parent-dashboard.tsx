"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Clock, Star, TrendingUp, ChevronRight, Play, Volume2, AlertTriangle } from "lucide-react";
import type { FamilyData } from "./page";

type Student = { id: string; name: string };
type LowScoreItem = {
  studentId: string;
  taskItemId: string;
  score: number;
  feedback: string;
};

type PerformanceData = {
  averageScore: number;
  completionRate: number;
  lowScoreItems: LowScoreItem[];
  students: Array<{ id: string; name: string }>;
  submissions: Array<{
    id: string;
    studentId: string;
    taskItemId: string;
    score: number;
    stars: number;
    feedback: string;
    createdAt: string;
  }>;
};

type Props = {
  data: FamilyData;
  token: string;
  onBack?: () => void;
  onSelectStudent: (student: Student) => void;
};

export function ParentDashboard({ data, token, onBack, onSelectStudent }: Props) {
  const [activeTab, setActiveTab] = useState<"stats" | "homework" | "progress">("stats");
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    loadPerformance();
  }, [token]);

  async function loadPerformance() {
    try {
      const res = await fetch(`/api/family/performance?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (res.ok) {
        setPerformance(json.data);
      }
    } finally {
      setLoadingPerf(false);
    }
  }

  const weekStart = data.task ? new Date(data.task.weekStart) : new Date();
  const weekDay = weekStart.toLocaleDateString("zh-TW", { weekday: "short" });
  const dateStr = weekStart.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });

  // Calculate stats
  const totalItems = data.items.length;
  const totalStudents = data.students.length;
  const totalExpected = totalItems * totalStudents;
  // Count unique (studentId, taskItemId) pairs for completed items
  const completedSet = new Set(
    data.submissions.map((s) => `${s.studentId}:${s.taskItemId}`)
  );
  const completedCount = completedSet.size;
  const avgScore = data.submissions.length > 0
    ? Math.round(data.submissions.reduce((sum, s) => sum + s.score, 0) / data.submissions.length)
    : 0;

  // Group submissions by student
  const submissionsByStudent = data.students.map((student) => {
    const studentSubs = data.submissions.filter((s) => s.studentId === student.id);
    const studentAvg = studentSubs.length > 0
      ? Math.round(studentSubs.reduce((sum, s) => sum + s.score, 0) / studentSubs.length)
      : 0;
    // Count unique taskItemIds for completed items
    const completedItemIds = new Set(studentSubs.map((s) => s.taskItemId));
    return {
      student,
      submissions: studentSubs,
      avgScore: studentAvg,
      completed: completedItemIds.size,
      total: totalItems,
    };
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-content px-4 pt-4 pb-6">
        <div className="flex items-center gap-2 mb-4">
          {onBack && (
            <button onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <span className="text-lg font-medium">家長中心</span>
        </div>
        <h1 className="text-xl font-bold">{dateStr}({weekDay})英語任務</h1>
      </div>

      {/* Tab Switcher */}
      <div className="bg-base-100 px-4 py-2 shadow-sm sticky top-0 z-10">
        <div className="tabs tabs-boxed bg-base-200">
          <button
            className={`tab flex-1 ${activeTab === "stats" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            資料統計
          </button>
          <button
            className={`tab flex-1 ${activeTab === "homework" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("homework")}
          >
            學生作業
          </button>
          <button
            className={`tab flex-1 ${activeTab === "progress" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("progress")}
          >
            學習進度
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {activeTab === "stats" ? (
          <StatsView
            avgScore={avgScore}
            completedCount={completedCount}
            totalExpected={totalExpected}
            performance={performance}
            loadingPerf={loadingPerf}
            data={data}
          />
        ) : activeTab === "homework" ? (
          <HomeworkView
            data={data}
            submissionsByStudent={submissionsByStudent}
            expandedItem={expandedItem}
            setExpandedItem={setExpandedItem}
            onSelectStudent={onSelectStudent}
          />
        ) : (
          <ProgressView
            data={data}
            performance={performance}
            loadingPerf={loadingPerf}
          />
        )}
      </div>
    </div>
  );
}

function StatsView({
  avgScore,
  completedCount,
  totalExpected,
  performance,
  loadingPerf,
  data,
}: {
  avgScore: number;
  completedCount: number;
  totalExpected: number;
  performance: PerformanceData | null;
  loadingPerf: boolean;
  data: FamilyData;
}) {
  // Build maps for student names and sentence texts
  const studentMap = new Map(performance?.students?.map((s) => [s.id, s.name]) ?? []);
  const sentenceMap = new Map(data.items.map((item) => [item.id, item.sentenceText]));

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="font-semibold text-base-content/70 mb-4">本週資料</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{avgScore}<span className="text-lg">分</span></div>
              <div className="text-sm text-base-content/60">平均分</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success">
                {completedCount}/{totalExpected}
              </div>
              <div className="text-sm text-base-content/60">完成進度</div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Performance */}
      {loadingPerf ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : performance ? (
        <>
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="font-semibold text-base-content/70 mb-4">歷史表現</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-info/20 rounded-full">
                    <TrendingUp className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{Math.round(performance.averageScore)}分</div>
                    <div className="text-xs text-base-content/60">總平均分</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-warning/20 rounded-full">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{performance.submissions.length}</div>
                    <div className="text-xs text-base-content/60">總提交數</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Low Score Items */}
          {performance.lowScoreItems && performance.lowScoreItems.length > 0 && (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="font-semibold text-base-content/70 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-error" />
                  需要加強的句子
                </h3>
                <div className="space-y-3">
                  {performance.lowScoreItems.map((item, index) => (
                    <div key={index} className="border border-error/20 rounded-lg p-3 bg-error/5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge badge-ghost badge-sm">
                          {studentMap.get(item.studentId) || "學生"}
                        </span>
                        <span className="badge badge-error badge-sm">{item.score}分</span>
                      </div>
                      <p className="text-sm font-medium mb-1">
                        {sentenceMap.get(item.taskItemId) || "句子"}
                      </p>
                      {item.feedback && (
                        <p className="text-xs text-base-content/60">{item.feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

type StudentSubmissionData = {
  student: Student;
  submissions: Array<{
    id: string;
    studentId: string;
    taskItemId: string;
    score: number;
    stars: number;
    feedback: string;
    audioUrl?: string;
  }>;
  avgScore: number;
  completed: number;
  total: number;
};

function HomeworkView({
  data,
  submissionsByStudent,
  expandedItem,
  setExpandedItem,
  onSelectStudent,
}: {
  data: FamilyData;
  submissionsByStudent: StudentSubmissionData[];
  expandedItem: string | null;
  setExpandedItem: (id: string | null) => void;
  onSelectStudent: (student: Student) => void;
}) {
  return (
    <div className="space-y-4">
      {submissionsByStudent.map(({ student, submissions, avgScore, completed, total }) => (
        <div key={student.id} className="card bg-base-100 shadow">
          <div className="card-body p-4">
            {/* Student Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-10">
                    <span>{student.name[0]}</span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold">{student.name}</div>
                  <div className="text-xs text-base-content/60">
                    完成 {completed}/{total} · 平均分 {avgScore}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onSelectStudent(student)}
                className="btn btn-primary btn-sm"
              >
                去練習
              </button>
            </div>

            {/* Sentence List */}
            <div className="space-y-2">
              {data.items.map((item) => {
                const sub = submissions.find((s) => s.taskItemId === item.id);
                const isExpanded = expandedItem === `${student.id}-${item.id}`;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border ${sub ? "border-success/30 bg-success/5" : "border-base-300"}`}
                  >
                    <button
                      className="w-full p-3 flex items-center gap-3 text-left"
                      onClick={() => setExpandedItem(isExpanded ? null : `${student.id}-${item.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{item.sentenceText}</div>
                      </div>
                      {sub ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-success">{sub.score}分</span>
                          <div className="flex">
                            {[1, 2, 3].map((i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i <= sub.stars ? "fill-warning text-warning" : "text-base-300"}`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-ghost badge-sm">未完成</span>
                      )}
                      <ChevronRight
                        className={`h-4 w-4 text-base-content/40 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                    {isExpanded && sub && (
                      <div className="px-3 pb-3 pt-0 space-y-2">
                        {sub.audioUrl && (
                          <div className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4 text-base-content/60" />
                            <audio src={sub.audioUrl} controls className="h-8 flex-1" />
                          </div>
                        )}
                        <div className="text-xs text-base-content/60 bg-base-200 rounded p-2">
                          {sub.feedback || "尚無回饋"}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressView({
  data,
  performance,
  loadingPerf,
}: {
  data: FamilyData;
  performance: PerformanceData | null;
  loadingPerf: boolean;
}) {
  if (loadingPerf) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Placeholder for charts - will be implemented in subsequent subtasks */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="font-semibold text-base-content/70 mb-4">學習進度</h3>
          <p className="text-base-content/60">圖表即將推出...</p>
        </div>
      </div>
    </div>
  );
}
