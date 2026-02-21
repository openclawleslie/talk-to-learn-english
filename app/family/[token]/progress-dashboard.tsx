"use client";

import { useState, useEffect } from "react";
import { TrendingUp, AlertCircle } from "lucide-react";
import { ProgressChart, type WeekData, type ProgressStats } from "@/components/progress-chart";

type Props = {
  token: string;
};

type ProgressHistoryResponse = {
  weeks: Array<{
    weekStart: string;
    weekEnd: string;
    avgScore: number;
    avgStars: number;
    completionRate: number;
    submissionCount: number;
  }>;
  studentNames: Record<string, string>;
};

export function ProgressDashboard({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProgressHistoryResponse | null>(null);

  useEffect(() => {
    loadProgressHistory();
  }, [token]);

  async function loadProgressHistory() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/family/progress-history?token=${encodeURIComponent(token)}`
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message || "無法載入進度資料");
        return;
      }

      setData(json.data);
      setError(null);
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="alert alert-error">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!data || data.weeks.length === 0) {
    return (
      <div className="p-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto text-base-content/30 mb-3" />
            <h3 className="text-lg font-semibold text-base-content/70">
              尚無學習記錄
            </h3>
            <p className="text-base-content/60">
              完成更多練習後，這裡將顯示進度統計
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Transform API data to ProgressChart format
  const chartData: WeekData[] = data.weeks.map((week) => {
    const weekStart = new Date(week.weekStart);
    const weekLabel = weekStart.toLocaleDateString("zh-TW", {
      month: "numeric",
      day: "numeric",
    });

    return {
      week: weekLabel,
      averageStars: week.avgStars,
      completionRate: week.completionRate * 100, // Convert to percentage
      practiceTime: 0, // Not available in current API, could be added later
      submissions: week.submissionCount,
    };
  });

  // Calculate stats
  const stats: ProgressStats = calculateStats(chartData);

  return (
    <div className="p-4 space-y-4">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-gradient-to-br from-primary to-primary-focus text-primary-content shadow">
          <div className="card-body p-4">
            <div className="text-sm opacity-90">總練習次數</div>
            <div className="text-3xl font-bold">
              {chartData.reduce((sum, week) => sum + week.submissions, 0)}
            </div>
            <div className="text-xs opacity-80">過去 {data.weeks.length} 週</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-secondary to-secondary-focus text-secondary-content shadow">
          <div className="card-body p-4">
            <div className="text-sm opacity-90">最佳星等</div>
            <div className="text-3xl font-bold">
              {stats.bestWeek?.stars.toFixed(1) || "-"}
              <span className="text-sm ml-1">★</span>
            </div>
            <div className="text-xs opacity-80">
              {stats.bestWeek?.week || "尚無資料"}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Charts */}
      <ProgressChart data={chartData} stats={stats} chartType="line" />

      {/* Performance Comparison */}
      {stats.bestWeek && stats.recentWeek && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-base-content/70 mb-3">表現對比</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">最佳表現</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">
                    {stats.bestWeek.stars.toFixed(1)} ★
                  </span>
                  <span className="text-xs text-base-content/60">
                    ({stats.bestWeek.week})
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">最近表現</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-secondary">
                    {stats.recentWeek.stars.toFixed(1)} ★
                  </span>
                  <span className="text-xs text-base-content/60">
                    ({stats.recentWeek.week})
                  </span>
                </div>
              </div>
              {stats.bestWeek.stars > stats.recentWeek.stars && (
                <div className="alert alert-info py-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">
                    繼續努力！你曾達到 {stats.bestWeek.stars.toFixed(1)} 星的好成績
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateStats(data: WeekData[]): ProgressStats {
  if (data.length === 0) {
    return {
      bestWeek: null,
      recentWeek: null,
      totalPracticeTime: 0,
      averageCompletionRate: 0,
    };
  }

  // Find best week by average stars
  const bestWeek = data.reduce((best, current) => {
    return current.averageStars > best.averageStars ? current : best;
  });

  // Recent week is the last week with data
  const recentWeek = data[data.length - 1];

  // Calculate total practice time
  const totalPracticeTime = data.reduce(
    (sum, week) => sum + week.practiceTime,
    0
  );

  // Calculate average completion rate
  const averageCompletionRate =
    data.reduce((sum, week) => sum + week.completionRate, 0) / data.length;

  return {
    bestWeek: {
      week: bestWeek.week,
      stars: bestWeek.averageStars,
    },
    recentWeek: {
      week: recentWeek.week,
      stars: recentWeek.averageStars,
    },
    totalPracticeTime,
    averageCompletionRate,
  };
}
