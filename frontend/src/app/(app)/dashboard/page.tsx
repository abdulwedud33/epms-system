"use client";

import { useQuery } from "@tanstack/react-query";
import { statsApi, evaluationApi, DashboardStats, Evaluation } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getRatingBadgeClass, getStatusBadgeClass } from "@/lib/calculations";
import {
  Users, ClipboardList, CheckCircle2, Clock, TrendingUp,
  Plus, ChevronRight, Award, AlertCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import Link from "next/link";
import dayjs from "dayjs";

const RATING_COLORS: Record<string, string> = {
  Outstanding: "#10b981",
  Excellent: "#3b82f6",
  "Very Good": "#6366f1",
  Good: "#eab308",
  "Needs Improvement": "#f97316",
  Unsatisfactory: "#ef4444",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["stats", year],
    queryFn: () => statsApi.get(year),
  });

  const { data: recentEvals, isLoading: evalsLoading } = useQuery<Evaluation[]>({
    queryKey: ["evaluations", "recent"],
    queryFn: () => evaluationApi.list({ limit: "5" }),
  });

  const statCards = [
    { label: "Total Employees", value: stats?.totalEmployees ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50", change: "Active staff" },
    { label: "Total Evaluations", value: stats?.totalEvaluations ?? 0, icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50", change: `FY ${year}` },
    { label: "Pending Review", value: stats?.pendingEvaluations ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", change: "Awaiting action" },
    { label: "Approved", value: stats?.approvedEvaluations ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", change: "Completed" },
  ];

  const pieData = (stats?.ratingDistribution ?? []).map((r) => ({
    name: r.ratingLabel,
    value: r._count.ratingLabel,
    color: RATING_COLORS[r.ratingLabel] ?? "#94a3b8",
  }));

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Welcome back, <span className="font-medium text-slate-700">{user?.name}</span> · {dayjs().format("dddd, MMMM D, YYYY")}
          </p>
        </div>
        {(user?.role === "ADMIN" || user?.role === "SUPERVISOR") && (
          <Link href="/evaluations/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Evaluation
          </Link>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, change }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-300" />
            </div>
            {statsLoading ? (
              <div className="space-y-1">
                <div className="h-7 bg-slate-100 animate-pulse rounded w-16" />
                <div className="h-4 bg-slate-100 animate-pulse rounded w-24" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{change}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Avg Score Banner */}
      {stats && stats.avgScore > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <p className="text-blue-100 text-sm">Organisation Average Performance Score — FY {year}</p>
            <div className="flex items-end gap-3 mt-1">
              <p className="text-4xl font-bold">{stats.avgScore.toFixed(1)}</p>
              <p className="text-blue-200 text-sm pb-1">out of 100</p>
            </div>
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden max-w-xs">
              <div className="h-full bg-white rounded-full" style={{ width: `${stats.avgScore}%` }} />
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-blue-100 text-sm">{stats.approvedEvaluations} Approved</p>
            <p className="text-2xl font-bold">{stats.totalEvaluations} Total</p>
            <p className="text-blue-200 text-xs">evaluations</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Rating Distribution Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Rating Distribution</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No approved evaluations yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pieData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v) => [v, "Employees"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Performers */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Top Performers</h2>
            <Link href="/reports" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {statsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (stats?.topPerformers ?? []).length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No approved evaluations</p>
          ) : (
            <div className="space-y-2">
              {(stats?.topPerformers ?? []).slice(0, 5).map((e, idx) => (
                <Link key={e.id} href={`/evaluations/${e.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    idx === 0 ? "bg-amber-100 text-amber-700" :
                    idx === 1 ? "bg-slate-200 text-slate-700" :
                    idx === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.evaluatee?.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{e.evaluatee?.department?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{e.finalScore?.toFixed(1)}</p>
                    <p className="text-xs text-slate-400">/ 100</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Evaluations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Evaluations</h2>
          <Link href="/evaluations" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {evalsLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />)}
          </div>
        ) : (recentEvals ?? []).length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No evaluations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Rating</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(recentEvals ?? []).map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/evaluations/${ev.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                        {ev.evaluatee?.fullName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{ev.evaluatee?.department?.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{ev.period} {ev.year}</td>
                    <td className="px-5 py-3.5 font-semibold">
                      {ev.finalScore != null ? ev.finalScore.toFixed(1) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {ev.ratingLabel ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRatingBadgeClass(ev.ratingLabel)}`}>
                          {ev.ratingLabel}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(ev.status)}`}>
                        {ev.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
