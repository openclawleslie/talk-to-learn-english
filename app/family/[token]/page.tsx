"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, AlertCircle, Mic, ChevronLeft } from "lucide-react";
import { ParentDashboard } from "./parent-dashboard";
import { StudentPractice } from "./student-practice";

type Student = { id: string; name: string };
type TaskItem = {
  id: string;
  orderIndex: number;
  sentenceText: string;
  referenceAudioUrl: string | null;
};
type Task = {
  id: string;
  weekStart: string;
  weekEnd: string;
  deadline: string | null;
};
type Submission = {
  id: string;
  studentId: string;
  taskItemId: string;
  score: number;
  stars: number;
  feedback: string;
  audioUrl?: string;
};

export type FamilyData = {
  task: Task | null;
  items: TaskItem[];
  students: Student[];
  submissions: Submission[];
};

type ViewMode = "parent" | "select-student" | "student";

export default function FamilyTokenPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<FamilyData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("parent");
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(
        `/api/family/weekly-task?token=${encodeURIComponent(token)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "載入失敗");
        return;
      }
      setData(json.data);
    } catch {
      setError("網路錯誤");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function handleStartPractice() {
    if (data && data.students.length === 1) {
      setSelectedStudent(data.students[0]);
      setViewMode("student");
    } else {
      setViewMode("select-student");
    }
  }

  function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    setViewMode("student");
  }

  function handleBackToParent() {
    setSelectedStudent(null);
    setViewMode("parent");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="alert alert-error max-w-sm">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!data?.task) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-sm w-full">
          <div className="card-body items-center text-center">
            <BookOpen className="h-16 w-16 text-base-content/30" />
            <h2 className="card-title">目前沒有任務</h2>
            <p className="text-base-content/60">
              本週尚未發布新的練習任務
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Student Practice View
  if (viewMode === "student" && selectedStudent) {
    return (
      <StudentPractice
        data={data}
        student={selectedStudent}
        token={token}
        onBack={handleBackToParent}
        onRefresh={() => loadData(true)}
      />
    );
  }

  // Select Student View (multiple students)
  if (viewMode === "select-student") {
    return (
      <div className="min-h-screen p-4 pb-8">
        <div className="mx-auto max-w-md">
          <button
            onClick={handleBackToParent}
            className="btn btn-ghost btn-sm gap-1 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            返回
          </button>
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success rounded-full mb-4">
              <Mic className="h-8 w-8 text-success-content" />
            </div>
            <h1 className="text-2xl font-bold">開始練習</h1>
            <p className="text-base-content/60 mt-1">請選擇學生</p>
          </div>
          <div className="space-y-3">
            {data.students.map((student) => {
              const completedItemIds = new Set(
                data.submissions
                  .filter((s) => s.studentId === student.id)
                  .map((s) => s.taskItemId)
              );
              return (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className="card bg-base-100 shadow-lg w-full hover:shadow-xl transition-shadow"
                >
                  <div className="card-body flex-row items-center gap-4 py-4">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-10">
                        <span>{student.name[0]}</span>
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{student.name}</div>
                      <div className="text-xs text-base-content/60">
                        已完成 {completedItemIds.size}/{data.items.length} 題
                      </div>
                    </div>
                    <ChevronLeft className="h-5 w-5 rotate-180 text-base-content/40" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Default: Parent Dashboard + floating "開始練習" button
  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed bottom-6 left-0 right-0 z-20 flex justify-center px-4">
        <button
          onClick={handleStartPractice}
          className="btn btn-primary btn-lg shadow-2xl gap-2 px-8"
        >
          <Mic className="h-5 w-5" />
          開始練習
        </button>
      </div>

      <ParentDashboard
        data={data}
        token={token}
        onSelectStudent={handleSelectStudent}
      />

      <div className="h-24" />
    </div>
  );
}
