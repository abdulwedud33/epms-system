"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ClipboardList, BarChart3,
  LogOut, Menu, X, ChevronRight, ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true, roles: ["ADMIN", "SUPERVISOR", "EMPLOYEE"] },
  { href: "/employees", label: "Employees", icon: Users, roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/evaluations", label: "Evaluations", icon: ClipboardList, roles: ["ADMIN", "SUPERVISOR", "EMPLOYEE"] },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart3, roles: ["ADMIN", "SUPERVISOR"] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading EPMS…</p>
        </div>
      </div>
    );
  }

  const visibleNav = navItems.filter((n) => n.roles.includes(user.role));
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const roleBadge: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    SUPERVISOR: "bg-blue-100 text-blue-700",
    EMPLOYEE: "bg-green-100 text-green-700",
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 flex flex-col z-30 transition-transform duration-200",
        "lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_8%_12%,rgba(59,130,246,0.26)_0%,rgba(2,6,23,0)_40%),radial-gradient(circle_at_90%_85%,rgba(14,165,233,0.15)_0%,rgba(2,6,23,0)_35%)]" />

        {/* Header */}
        <div className="relative p-5 border-b border-slate-700/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_10px_26px_rgba(14,165,233,0.35)] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none tracking-wide">EPMS</p>
              <p className="text-slate-400 text-xs mt-0.5 truncate">Civil Service Performance</p>
            </div>
            <button className="lg:hidden text-slate-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-slate-900/70 px-3 py-2.5">
            <div className="flex items-center gap-2 text-cyan-300/90 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Government HR Suite
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Secure staff evaluation and reporting workspace</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.16em] px-3 py-2">Navigation</p>
          {visibleNav.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  active
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)]"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}>
                {active && <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-cyan-300" />}
                <span className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  active ? "bg-white/20" : "bg-slate-800 text-slate-300 group-hover:bg-slate-700"
                )}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                </span>
                <span className="flex-1">{label}</span>
                <ChevronRight className={cn("w-3.5 h-3.5 transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-70")} />
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="relative p-4 border-t border-slate-700/40 space-y-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70">
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate tracking-wide">{user.name}</p>
                <span className={cn("text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md font-semibold", roleBadge[user.role])}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-red-500/12 hover:text-red-300 transition-colors text-sm border border-slate-700/60 hover:border-red-500/30">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 z-10 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-slate-800 tracking-wide">EPMS</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
              {user.name[0]}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
