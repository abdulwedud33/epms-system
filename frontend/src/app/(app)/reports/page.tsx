"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { statsApi, evaluationApi, DashboardStats, Evaluation } from "@/lib/api";
import { getRatingBadgeClass } from "@/lib/calculations";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { BarChart3, Award, TrendingUp, Users, Download } from "lucide-react";

const RATING_COLORS: Record<string, string> = {
  Outstanding: "#10b981",
  Excellent: "#3b82f6",
  "Very Good": "#6366f1",
  Good: "#eab308",
  "Needs Improvement": "#f97316",
  Unsatisfactory: "#ef4444",
};

const CHART_COLORS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["stats", year],
    queryFn: () => statsApi.get(year),
  });

  const { data: allEvals } = useQuery<Evaluation[]>({
    queryKey: ["evaluations", "approved", year],
    queryFn: () => evaluationApi.list({ status: "APPROVED", year: String(year) }),
  });

  // Build department performance data
  const deptPerf: Record<string, { total: number; count: number; name: string }> = {};
  (allEvals ?? []).forEach((ev) => {
    const deptName = ev.evaluatee?.department?.name ?? "Unknown";
    if (!deptPerf[deptName]) deptPerf[deptName] = { total: 0, count: 0, name: deptName };
    deptPerf[deptName].total += ev.finalScore ?? 0;
    deptPerf[deptName].count++;
  });
  const deptData = Object.values(deptPerf)
    .map((d) => ({ name: d.name.split(" ")[0], avg: parseFloat((d.total / d.count).toFixed(1)), count: d.count }))
    .sort((a, b) => b.avg - a.avg);

  // Score distribution histogram
  const scoreBuckets = [
    { range: "0–20", count: 0 }, { range: "21–40", count: 0 }, { range: "41–60", count: 0 },
    { range: "61–80", count: 0 }, { range: "81–100", count: 0 },
  ];
  (allEvals ?? []).forEach((ev) => {
    const s = ev.finalScore ?? 0;
    if (s <= 20) scoreBuckets[0].count++;
    else if (s <= 40) scoreBuckets[1].count++;
    else if (s <= 60) scoreBuckets[2].count++;
    else if (s <= 80) scoreBuckets[3].count++;
    else scoreBuckets[4].count++;
  });

  // Radar data for behavioral competencies (average across all approved)
  const behavioralAvg = [
    { subject: "Anti-discrimination", A: 0 },
    { subject: "Competency", A: 0 },
    { subject: "Recognition", A: 0 },
    { subject: "Empowerment", A: 0 },
    { subject: "Process Imp.", A: 0 },
    { subject: "Feedback", A: 0 },
  ];

  const pieData = (stats?.ratingDistribution ?? [])
    .map((r) => ({ name: r.ratingLabel, value: r._count.ratingLabel }));

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" /> Reports & Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Performance insights for FY {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            min={2020} max={2030}
            className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Employees", value: stats?.totalEmployees, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Evaluations Done", value: stats?.approvedEvaluations, icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Score", value: stats?.avgScore != null ? `${stats.avgScore.toFixed(1)}%` : "—", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Pending", value: stats?.pendingEvaluations, icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            {statsLoading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded w-16" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{value ?? "—"}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Average Score by Department</h2>
          {deptData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip
                  formatter={(v) => [`${v}/100`, "Avg Score"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} fill="#3b82f6">
                  {deptData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rating Distribution Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Rating Distribution</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No approved evaluations</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={RATING_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Histogram */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreBuckets} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [v, "Employees"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performers Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Top Performers</h2>
          {(stats?.topPerformers ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data</div>
          ) : (
            <div className="space-y-2">
              {(stats?.topPerformers ?? []).map((ev, idx) => (
                <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                    idx === 0 ? "bg-amber-100 text-amber-700" :
                    idx === 1 ? "bg-slate-200 text-slate-700" :
                    idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                  }`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{ev.evaluatee?.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{ev.evaluatee?.department?.name} · {ev.period} {ev.year}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ev.ratingLabel && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRatingBadgeClass(ev.ratingLabel)}`}>
                        {ev.ratingLabel}
                      </span>
                    )}
                    <span className="font-bold text-slate-800 text-sm w-10 text-right">{ev.finalScore?.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Approved Evaluations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">All Approved Evaluations — FY {year}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{(allEvals ?? []).length} records</p>
        </div>
        {(allEvals ?? []).length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No approved evaluations for this year</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Part A (70%)</th>
                  <th className="px-5 py-3">Part B (30%)</th>
                  <th className="px-5 py-3">Final Score</th>
                  <th className="px-5 py-3">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(allEvals ?? [])
                  .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
                  .map((ev) => {
                    const partA = ((ev.partA_averagePoint ?? 0) * 0.7).toFixed(1);
                    const partB = (
                      (ev.partB1_weighted ?? 0) + (ev.partB2_weighted ?? 0) + (ev.partB3_weighted ?? 0)
                    ).toFixed(1);
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800">{ev.evaluatee?.fullName}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{ev.evaluatee?.department?.name}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {ev.period} {ev.year}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-blue-700 font-semibold">{partA}</td>
                        <td className="px-5 py-3 text-indigo-700 font-semibold">{partB}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">
                          {ev.finalScore?.toFixed(1) ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          {ev.ratingLabel && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRatingBadgeClass(ev.ratingLabel)}`}>
                              {ev.ratingLabel}
                            </span>
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
  );
}
