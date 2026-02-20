"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, BookOpen, TrendingUp, Clock, Award, Star, AlertTriangle } from "lucide-react";

interface ClassCourse {
  id: string;
  class_name: string;
  course_name: string;
  student_count?: number;
}

interface DashboardStats {
  totalSubmissionsThisWeek: number;
  averageScore: number;
  starDistribution: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
  };
  studentsNotSubmitted: {
    id: string;
    name: string;
  }[];
}

export default function TeacherDashboardPage() {
  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    fetchClassCourses();
    fetchStats();
  }, []);

  const fetchClassCourses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/teacher/class-courses");
      if (response.ok) {
        const data = await response.json();
        setClassCourses(data.data?.classCourses || []);
      }
    } catch (error) {
      console.error("Failed to fetch class courses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setIsStatsLoading(true);
      const response = await fetch("/api/teacher/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold">歡迎回來！</h1>
          <p className="text-lg opacity-90">
            這是您的教師工作台，管理您的班級和學生
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="stat-title">我的班級課程</div>
          <div className="stat-value text-primary">{classCourses.length}</div>
          <div className="stat-desc">已分配的班級課程數量</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <Users className="h-8 w-8" />
          </div>
          <div className="stat-title">學生總數</div>
          <div className="stat-value text-secondary">
            {classCourses.reduce((sum, cc) => sum + (cc.student_count || 0), 0)}
          </div>
          <div className="stat-desc">所有班級的學生數</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <Clock className="h-8 w-8" />
          </div>
          <div className="stat-title">本週提交數</div>
          <div className="stat-value text-accent">
            {isStatsLoading ? (
              <span className="loading loading-spinner loading-md" />
            ) : (
              stats?.totalSubmissionsThisWeek || 0
            )}
          </div>
          <div className="stat-desc">Total Submissions This Week</div>
        </div>
      </div>

      {/* Weekly Performance Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Award className="h-8 w-8" />
          </div>
          <div className="stat-title">平均分數</div>
          <div className="stat-value text-primary">
            {isStatsLoading ? (
              <span className="loading loading-spinner loading-md" />
            ) : (
              stats?.averageScore.toFixed(1) || "0.0"
            )}
          </div>
          <div className="stat-desc">Average Score</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-warning">
            <Star className="h-8 w-8 fill-current" />
          </div>
          <div className="stat-title">⭐ 一顆星</div>
          <div className="stat-value text-warning">
            {isStatsLoading ? (
              <span className="loading loading-spinner loading-md" />
            ) : (
              stats?.starDistribution.oneStar || 0
            )}
          </div>
          <div className="stat-desc">1 Star Submissions</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <Star className="h-8 w-8 fill-current" />
          </div>
          <div className="stat-title">⭐⭐ 兩顆星</div>
          <div className="stat-value text-info">
            {isStatsLoading ? (
              <span className="loading loading-spinner loading-md" />
            ) : (
              stats?.starDistribution.twoStar || 0
            )}
          </div>
          <div className="stat-desc">2 Star Submissions</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-success">
            <Star className="h-8 w-8 fill-current" />
          </div>
          <div className="stat-title">⭐⭐⭐ 三顆星</div>
          <div className="stat-value text-success">
            {isStatsLoading ? (
              <span className="loading loading-spinner loading-md" />
            ) : (
              stats?.starDistribution.threeStar || 0
            )}
          </div>
          <div className="stat-desc">3 Star Submissions</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/teacher/families" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="card-title">家庭管理</h2>
                <p className="text-base-content/60">
                  建立家庭、新增學生、產生存取連結
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/teacher/weekly-tasks" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Clock className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h2 className="card-title">每週任務</h2>
                <p className="text-base-content/60">查看和管理每週口說任務</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Students Not Submitted This Week */}
      {!isStatsLoading && stats && stats.studentsNotSubmitted.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">
              <AlertTriangle className="h-6 w-6 text-warning" />
              本週未提交學生
            </h2>
            <div className="alert alert-warning">
              <AlertTriangle className="h-5 w-5" />
              <span>以下學生本週尚未提交任何作業</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
              {stats.studentsNotSubmitted.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-2 p-3 bg-base-200 rounded-lg"
                >
                  <Users className="h-5 w-5 text-base-content/60" />
                  <span className="text-sm font-medium">{student.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My Class Courses */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">
            <BookOpen className="h-6 w-6" />
            我的班級課程
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : classCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto text-base-content/40 mb-4" />
              <p className="text-base-content/60">
                目前沒有分配的班級課程，請聯繫管理員
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classCourses.map((cc) => (
                <Link
                  key={cc.id}
                  href={`/teacher/class/${cc.id}`}
                  className="card bg-base-200 hover:bg-base-300 transition-colors"
                >
                  <div className="card-body">
                    <h3 className="card-title text-lg">{cc.class_name}</h3>
                    <p className="text-base-content/70">{cc.course_name}</p>
                    <div className="card-actions justify-end mt-2">
                      <div className="badge badge-outline">
                        {cc.student_count || 0} 學生
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
