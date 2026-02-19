"use client";

import { useState, useEffect, use } from "react";
import { TrendingUp, TrendingDown, Award, Users, Clock, AlertTriangle, Volume2 } from "lucide-react";

interface ClassSummary {
  className: string;
  courseName: string;
  totalStudents: number;
  completionRate: number;
  averageScore: number;
  students: StudentPerformance[];
  lowScoreItems: LowScoreItem[];
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  completedTasks: number;
  totalTasks: number;
  averageScore: number;
  lowScoreSentences: number;
}

interface LowScoreItem {
  taskItemId: string;
  studentId: string;
  studentName: string;
  sentenceText: string;
  score: number;
  feedback: string;
  audioUrl: string;
}

export default function TeacherClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [summary, setSummary] = useState<ClassSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teacher/classes/${id}/summary`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.data);
      } else {
        setError("載入失敗");
      }
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      setError("網路錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="alert alert-error">
        <span>{error || "資料載入失敗"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold">{summary.className}</h1>
          <p className="text-xl text-base-content/70">{summary.courseName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Users className="h-8 w-8" />
          </div>
          <div className="stat-title">學生總數</div>
          <div className="stat-value text-primary">{summary.totalStudents}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <Clock className="h-8 w-8" />
          </div>
          <div className="stat-title">完成率</div>
          <div className="stat-value text-secondary">
            {summary.completionRate.toFixed(1)}%
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <Award className="h-8 w-8" />
          </div>
          <div className="stat-title">平均分數</div>
          <div className="stat-value text-accent">
            {summary.averageScore.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Student Performance */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">
            <TrendingUp className="h-6 w-6" />
            學生表現
          </h2>

          {summary.students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-base-content/40 mb-4" />
              <p className="text-base-content/60">尚無學生資料</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>學生姓名</th>
                    <th>完成進度</th>
                    <th>平均分數</th>
                    <th>低分句數</th>
                    <th>狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.students.map((student) => {
                    const completionPercent =
                      (student.completedTasks / student.totalTasks) * 100;
                    const isGood = student.averageScore >= 85;
                    const isWarning =
                      student.averageScore >= 70 && student.averageScore < 85;

                    return (
                      <tr key={student.studentId}>
                        <td className="font-semibold">{student.studentName}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <progress
                              className="progress progress-primary w-32"
                              value={completionPercent}
                              max="100"
                            />
                            <span className="text-sm">
                              {student.completedTasks}/{student.totalTasks}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {student.averageScore.toFixed(1)}
                            </span>
                            {isGood ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : isWarning ? (
                              <TrendingDown className="h-4 w-4 text-warning" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-error" />
                            )}
                          </div>
                        </td>
                        <td>
                          {student.lowScoreSentences > 0 ? (
                            <span className="badge badge-error">
                              {student.lowScoreSentences}
                            </span>
                          ) : (
                            <span className="badge badge-success">0</span>
                          )}
                        </td>
                        <td>
                          {isGood ? (
                            <span className="badge badge-success">優秀</span>
                          ) : isWarning ? (
                            <span className="badge badge-warning">良好</span>
                          ) : (
                            <span className="badge badge-error">需加強</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Low Score Items */}
      {summary.lowScoreItems.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">
              <AlertTriangle className="h-6 w-6 text-warning" />
              低分句子（需關注）
            </h2>
            <div className="space-y-3">
              {summary.lowScoreItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 bg-base-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge badge-neutral">{item.studentName}</span>
                        <span className="badge badge-error">{item.score}分</span>
                      </div>
                      <p className="text-base font-medium mb-2">{item.sentenceText}</p>
                      {item.feedback && (
                        <p className="text-sm text-base-content/60">{item.feedback}</p>
                      )}
                    </div>
                  </div>
                  {item.audioUrl && (
                    <div className="mt-3 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-base-content/60" />
                      <audio src={item.audioUrl} controls className="h-8 flex-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Alert */}
      <div className="alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="font-semibold">評分標準</p>
          <p className="text-sm">
            優秀：≥85分 | 良好：70-84分 | 需加強：&lt;70分
          </p>
        </div>
      </div>
    </div>
  );
}
