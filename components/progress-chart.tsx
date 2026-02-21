"use client";

import { TrendingUp, Calendar, Clock, Star } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

export interface WeekData {
  week: string;
  averageStars: number;
  completionRate: number;
  practiceTime: number;
  submissions: number;
}

export interface ProgressStats {
  bestWeek: {
    week: string;
    stars: number;
  } | null;
  recentWeek: {
    week: string;
    stars: number;
  } | null;
  totalPracticeTime: number;
  averageCompletionRate: number;
}

interface ProgressChartProps {
  data: WeekData[];
  stats?: ProgressStats;
  chartType?: "line" | "area";
}

export function ProgressChart({
  data,
  stats,
  chartType = "line",
}: ProgressChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base-content/70">學習進度</h3>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto text-base-content/30 mb-3" />
            <p className="text-base-content/60">尚無學習資料</p>
          </div>
        </div>
      </div>
    );
  }

  const maxStars = Math.max(...data.map((d) => d.averageStars));
  const maxCompletionRate = Math.max(...data.map((d) => d.completionRate));

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-warning" />
                <span className="text-sm text-base-content/70">最佳表現</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {stats.bestWeek?.stars.toFixed(1) || "-"}
                <span className="text-sm ml-1">星</span>
              </div>
              {stats.bestWeek && (
                <div className="text-xs text-base-content/60">
                  {stats.bestWeek.week}
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm text-base-content/70">最近表現</span>
              </div>
              <div className="text-2xl font-bold text-secondary">
                {stats.recentWeek?.stars.toFixed(1) || "-"}
                <span className="text-sm ml-1">星</span>
              </div>
              {stats.recentWeek && (
                <div className="text-xs text-base-content/60">
                  {stats.recentWeek.week}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Star Rating Chart */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base-content/70 mb-4">
            <Star className="h-5 w-5 text-warning" />
            平均星等趨勢
          </h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorStars" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FCD34D" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FCD34D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 12 }}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={[0, 5]}
                    tick={{ fontSize: 12 }}
                    tickMargin={8}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--b1))",
                      border: "1px solid hsl(var(--bc) / 0.2)",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(1)} 星`,
                      "平均星等",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="averageStars"
                    stroke="#FCD34D"
                    strokeWidth={2}
                    fill="url(#colorStars)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 12 }}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={[0, 5]}
                    tick={{ fontSize: 12 }}
                    tickMargin={8}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--b1))",
                      border: "1px solid hsl(var(--bc) / 0.2)",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(1)} 星`,
                      "平均星等",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageStars"
                    stroke="#FCD34D"
                    strokeWidth={2}
                    dot={{ fill: "#FCD34D", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Completion Rate Chart */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base-content/70 mb-4">
            <Calendar className="h-5 w-5 text-success" />
            完成率趨勢
          </h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} tickMargin={8} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--b1))",
                    border: "1px solid hsl(var(--bc) / 0.2)",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(value: number) => [`${value.toFixed(0)}%`, "完成率"]}
                />
                <Line
                  type="monotone"
                  dataKey="completionRate"
                  stroke="hsl(var(--su))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--su))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      {stats && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-base-content/70 mb-4">統計資料</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-info" />
                <div>
                  <div className="text-sm text-base-content/60">總練習時間</div>
                  <div className="text-lg font-bold">
                    {Math.round(stats.totalPracticeTime)} 分鐘
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-success" />
                <div>
                  <div className="text-sm text-base-content/60">平均完成率</div>
                  <div className="text-lg font-bold">
                    {stats.averageCompletionRate.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
