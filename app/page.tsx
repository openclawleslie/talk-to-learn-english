import Link from "next/link";
import { Shield, GraduationCap, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-4 shadow-lg">
            <BookOpen className="h-10 w-10 text-primary-content" />
          </div>
          <h1 className="text-4xl font-bold text-base-content mb-2">
            Talk to Learn
          </h1>
          <p className="text-base-content/60">
            每週英語口說作業系統
          </p>
        </div>

        {/* Entry Cards */}
        <div className="space-y-4">
          {/* Admin Entry */}
          <Link
            href="/admin/login"
            className="card bg-base-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="card-body flex-row items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 bg-error/20 rounded-full">
                <Shield className="h-7 w-7 text-error" />
              </div>
              <div className="flex-1">
                <h2 className="card-title text-lg">管理員入口</h2>
                <p className="text-sm text-base-content/60">
                  管理班級、課程、教師和任務
                </p>
              </div>
            </div>
          </Link>

          {/* Teacher Entry */}
          <Link
            href="/teacher/login"
            className="card bg-base-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="card-body flex-row items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 bg-primary/20 rounded-full">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="card-title text-lg">教師入口</h2>
                <p className="text-sm text-base-content/60">
                  管理學生、查看學習進度
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-10 text-center">
          <p className="text-sm text-base-content/40">
            家長和學生透過教師分享的專屬連結存取
          </p>
        </div>
      </div>
    </main>
  );
}
