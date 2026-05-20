"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evaluationApi, Evaluation } from "@/lib/api";
import { getRatingBadgeClass, getStatusBadgeClass } from "@/lib/calculations";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Plus, Search, Filter, ChevronRight, ClipboardList, Eye, CheckCircle2, XCircle } from "lucide-react";
import dayjs from "dayjs";

const STATUS_OPTIONS = ["", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"];
const PERIOD_OPTIONS = ["", "Q1", "Q2", "Q3", "Q4", "MIDYEAR", "ANNUAL"];

export default function EvaluationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (period) params.period = period;
  if (year) params.year = year;

  const { data: evaluations, isLoading } = useQuery<Evaluation[]>({
    queryKey: ["evaluations", params],
    queryFn: () => evaluationApi.list(params),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      evaluationApi.updateStatus(id, newStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evaluations"] }),
  });

  const filtered = (evaluations ?? []).filter((ev) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ev.evaluatee?.fullName?.toLowerCase().includes(q) ||
      ev.evaluatee?.department?.name?.toLowerCase().includes(q) ||
      ev.evaluator?.fullName?.toLowerCase().includes(q)
    );
  });

  const statusActions: Record<string, { label: string; next: string; icon: typeof CheckCircle2; color: string }> = {
    DRAFT: { label: "Submit", next: "SUBMITTED", icon: ChevronRight, color: "text-blue-600 hover:bg-blue-50" },
    SUBMITTED: { label: "Review", next: "UNDER_REVIEW", icon: Eye, color: "text-amber-600 hover:bg-amber-50" },
    UNDER_REVIEW: { label: "Approve", next: "APPROVED", icon: CheckCircle2, color: "text-emerald-600 hover:bg-emerald-50" },
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" /> Evaluations
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} evaluation(s) found</p>
        </div>
        {(user?.role === "ADMIN" || user?.role === "SUPERVISOR") && (
          <Link href="/evaluations/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Evaluation
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search employee or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All Statuses"}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {PERIOD_OPTIONS.map((p) => <option key={p} value={p}>{p || "All Periods"}</option>)}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(e.target.value)}
          min={2020} max={2030} placeholder="Year"
          className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No evaluations found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or create a new evaluation</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Evaluator</th>
                  <th className="px-5 py-3.5">Period</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5">Rating</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ev) => {
                  const action = statusActions[ev.status];
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/evaluations/${ev.id}`}
                          className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                          {ev.evaluatee?.fullName}
                        </Link>
                        <p className="text-xs text-slate-400 font-mono">{ev.evaluatee?.employeeCode}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{ev.evaluatee?.department?.name}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{ev.evaluator?.fullName}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {ev.period} {ev.year}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800">
                          {ev.finalScore != null ? ev.finalScore.toFixed(1) : "—"}
                        </span>
                        {ev.finalScore != null && <span className="text-slate-400 text-xs"> / 100</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {ev.ratingLabel ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRatingBadgeClass(ev.ratingLabel)}`}>
                            {ev.ratingLabel}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(ev.status)}`}>
                          {ev.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {dayjs(ev.createdAt).format("MMM D, YYYY")}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Link href={`/evaluations/${ev.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Eye className="w-4 h-4" />
                          </Link>
                          {action && (user?.role === "ADMIN" || user?.role === "SUPERVISOR") && (
                            <button
                              onClick={() => statusMutation.mutate({ id: ev.id, newStatus: action.next })}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${action.color}`}
                            >
                              <action.icon className="w-3 h-3" />
                              {action.label}
                            </button>
                          )}
                          {ev.status === "SUBMITTED" && user?.role === "ADMIN" && (
                            <button
                              onClick={() => statusMutation.mutate({ id: ev.id, newStatus: "REJECTED" })}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          )}
                        </div>
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
