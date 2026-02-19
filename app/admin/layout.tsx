"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, GraduationCap, ClipboardList, Settings, LogOut, Link2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";

  if (isLoginPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  const navItems = [
    { href: "/admin/classes", label: "班級管理", icon: LayoutDashboard },
    { href: "/admin/courses", label: "課程管理", icon: GraduationCap },
    { href: "/admin/class-courses", label: "班級課程", icon: Link2 },
    { href: "/admin/teachers", label: "老師管理", icon: Users },
    { href: "/admin/weekly-tasks", label: "每週任務", icon: ClipboardList },
    { href: "/admin/scoring", label: "評分設定", icon: Settings },
  ];

  return (
    <div className="drawer lg:drawer-open">
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        {/* Navbar for mobile */}
        <div className="navbar bg-base-300 lg:hidden">
          <div className="flex-none">
            <label htmlFor="admin-drawer" className="btn btn-square btn-ghost">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block h-5 w-5 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <span className="text-xl font-bold">管理員後台</span>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </div>

      <div className="drawer-side">
        <label htmlFor="admin-drawer" aria-label="close sidebar" className="drawer-overlay" />
        <div className="menu bg-base-200 text-base-content min-h-full w-80 p-4">
          {/* Sidebar header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary">
              Talk to Learn
            </h1>
            <p className="text-sm opacity-60">管理員後台</p>
          </div>

          {/* Navigation */}
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center gap-3 text-base">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Logout */}
          <div className="mt-auto pt-8">
            <div className="divider" />
            <form action="/api/auth/admin/logout" method="post">
              <button className="btn btn-ghost w-full justify-start gap-3" type="submit">
                <LogOut className="h-5 w-5" />
                退出登入
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
