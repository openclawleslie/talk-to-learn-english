"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
}

interface LowScoreItem {
  studentId: string;
  taskItemId: string;
  score: number;
  feedback: string | null;
}

interface PerformanceData {
  averageScore: number;
  completionRate: number;
  lowScoreItems: LowScoreItem[];
  students: Student[];
}

function ReportContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("缺少存取權杖");
      setIsLoading(false);
      return;
    }
    const fetchReport = async () => {
      try {
        const res = await fetch(
          `/api/family/performance?token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (!json.ok) {
          setError(json.error?.message || "無法載入報告");
          return;
        }
        setData(json.data);
      } catch {
        setError("網路錯誤，請稍後再試");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [token]);

  const getStudentName = (studentId: string) =>
    data?.students.find((s) => s.id === studentId)?.name || "未知";

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const response = await fetch(`/api/family/export/pdf?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error("匯出失敗");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `學習報告-${new Date().toLocaleDateString()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("PDF 匯出失敗，請稍後再試");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const response = await fetch(`/api/family/export/excel?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error("匯出失敗");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `學習報告-${new Date().toLocaleDateString()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Excel 匯出失敗，請稍後再試");
    } finally {
      setIsExportingExcel(false);
    }
  };

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

  if (!data) return null;

  const scorePercent = Math.round(data.averageScore);
  const completionPercent = Math.round(data.completionRate * 100);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Back Navigation */}
      <Link
        href={`/family/${token}`}
        className="btn btn-ghost btn-sm gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        返回首頁
      </Link>

      {/* Header */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                學習報告
              </h1>
              <p className="opacity-90">查看孩子的學習表現與成績統計</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="btn btn-primary gap-2"
              >
                {isExportingPdf ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                匯出 PDF
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className="btn btn-secondary gap-2"
              >
                {isExportingExcel ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                匯出 Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div className="stat-title">平均分數</div>
          <div className="stat-value text-primary">{scorePercent}</div>
          <div className="stat-desc">滿分 100</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div className="stat-title">完成率</div>
          <div className="stat-value text-secondary">
            {completionPercent}%
          </div>
          <div className="stat-desc">已提交的練習比例</div>
        </div>
      </div>

      {/* Low Score Items */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-xl mb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            需加強練習的句子
          </h2>

          {data.lowScoreItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-success mb-3" />
              <p className="text-base-content/60">
                表現優秀，沒有低分項目！
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.lowScoreItems.map((item, idx) => (
                <div
                  key={`${item.studentId}-${item.taskItemId}-${idx}`}
                  className="bg-base-200 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {getStudentName(item.studentId)}
                    </span>
                    <span className="badge badge-warning badge-sm">
                      {item.score} 分
                    </span>
                  </div>
                  {item.feedback && (
                    <p className="text-sm text-base-content/60 mt-1">
                      {item.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function FamilyReportPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-3xl p-6">
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </main>
    }>
      <ReportContent />
    </Suspense>
  );
}
