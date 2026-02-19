"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Users, BookOpen, LogOut, Calendar } from "lucide-react";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // 如果是登入頁面，不顯示導覽
  if (pathname === "/teacher/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/teacher/logout", { method: "POST" });
      window.location.href = "/teacher/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    { href: "/teacher/dashboard", icon: Home, label: "工作台" },
    { href: "/teacher/families", icon: Users, label: "家庭管理" },
    { href: "/teacher/weekly-tasks", icon: Calendar, label: "每週任務" },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <Link href="/teacher/dashboard" className="btn btn-ghost text-xl">
            <BookOpen className="h-6 w-6 mr-2" />
            教師工作台
          </Link>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={pathname === item.href ? "active" : ""}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button onClick={handleLogout} className="text-error">
                <LogOut className="h-4 w-4" />
                登出
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">{children}</div>
    </div>
  );
}
