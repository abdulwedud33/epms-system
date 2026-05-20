"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evaluationApi, Evaluation } from "@/lib/api";
import { getRatingBadgeClass, getStatusBadgeClass, KPA_ITEMS, BEHAVIORAL_COMPETENCIES } from "@/lib/calculations";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, XCircle, Clock, User,
  Building2, Award, BarChart3, ChevronRight, Pencil,
} from "lucide-react";
import dayjs from "dayjs";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

function ScoreBar({ score, max = 4, label }: { score: number; max?: number; label?: string }) {
  const pct = (score / max) * 100;
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : pct >= 25 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs text-slate-500 w-4 text-center font-bold">{score}</span>}
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {label && <span className="text-xs text-slate-400 w-4 text-right">{max}</span>}
    </div>
  );
}

function SectionCard({ title, subtitle, colorClass, children }: {
  title: string; subtitle: string; colorClass: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-6 py-4 ${colorClass} text-white`}>
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm opacity-80 mt-0.5">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: evaluation, isLoading } = useQuery<Evaluation>({
    queryKey: ["evaluation", id],
    queryFn: () => evaluationApi.get(id),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => evaluationApi.updateStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation", id] });
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    );
  }
  if (!evaluation) {
    return <div className="p-8 text-center text-slate-500">Evaluation not found.</div>;
  }

  const ev = evaluation;
  const kpaScoresMap = Object.fromEntries((ev.kpaScores ?? []).map((s) => [s.kpaIndex, s]));
  const selfScoresMap = Object.fromEntries(
    (ev.behavioralScores ?? []).filter((s) => s.assessorType === "SELF").map((s) => [s.competencyIndex, s])
  );
  const supScoresMap = Object.fromEntries(
    (ev.behavioralScores ?? []).filter((s) => s.assessorType === "SUPERVISOR").map((s) => [s.competencyIndex, s])
  );
  const b3Score = (ev.behavioralScores ?? []).find((s) => s.assessorType === "PEER");

  const canAdvance = user?.role === "ADMIN" || user?.role === "SUPERVISOR";
  const statusFlow: Record<string, { next: string; label: string; color: string }> = {
    DRAFT: { next: "SUBMITTED", label: "Submit for Review", color: "bg-blue-600 hover:bg-blue-700" },
    SUBMITTED: { next: "UNDER_REVIEW", label: "Start Review", color: "bg-amber-600 hover:bg-amber-700" },
    UNDER_REVIEW: { next: "APPROVED", label: "Approve", color: "bg-emerald-600 hover:bg-emerald-700" },
  };
  const action = canAdvance ? statusFlow[ev.status] : null;

  const radialData = [{ name: "Score", value: ev.finalScore ?? 0, fill: "#3b82f6" }];

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/evaluations" className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Evaluations
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-700 font-medium">{ev.evaluatee?.fullName}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold flex-shrink-0">
              {ev.evaluatee?.fullName?.[0] ?? "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{ev.evaluatee?.fullName}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{ev.evaluatee?.jobTitle}</span>
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{ev.evaluatee?.department?.name}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(ev.status)}`}>
                  {ev.status.replace("_", " ")}
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-medium">
                  {ev.period} {ev.year}
                </span>
                {ev.ratingLabel && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRatingBadgeClass(ev.ratingLabel)}`}>
                    {ev.ratingLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {ev.status === "DRAFT" && canAdvance && (
              <Link href={`/evaluations/${ev.id}/edit`}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
            )}
            {action && (
              <button onClick={() => statusMutation.mutate(action.next)}
                disabled={statusMutation.isPending}
                className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.color}`}>
                <CheckCircle2 className="w-4 h-4" />
                {statusMutation.isPending ? "Updating…" : action.label}
              </button>
            )}
            {ev.status === "SUBMITTED" && user?.role === "ADMIN" && (
              <button onClick={() => statusMutation.mutate("REJECTED")}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Evaluator</p>
            <p className="font-medium text-slate-700 mt-0.5">{ev.evaluator?.fullName}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Created</p>
            <p className="font-medium text-slate-700 mt-0.5">{dayjs(ev.createdAt).format("MMM D, YYYY")}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Submitted</p>
            <p className="font-medium text-slate-700 mt-0.5">
              {ev.submittedAt ? dayjs(ev.submittedAt).format("MMM D, YYYY") : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Approved</p>
            <p className="font-medium text-slate-700 mt-0.5">
              {ev.approvedAt ? dayjs(ev.approvedAt).format("MMM D, YYYY") : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Score Summary */}
      {ev.finalScore != null && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Big score */}
          <div className="lg:col-span-1 bg-slate-900 rounded-xl p-6 text-white text-center">
            <Award className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-slate-400 text-xs mb-1">Final Score</p>
            <p className="text-5xl font-bold">{ev.finalScore.toFixed(1)}</p>
            <p className="text-slate-400 text-xs mt-1">out of 100</p>
            {ev.ratingLabel && (
              <div className={`mt-3 px-3 py-1.5 rounded-lg text-sm font-semibold ${getRatingBadgeClass(ev.ratingLabel)} border`}>
                {ev.ratingLabel}
              </div>
            )}
          </div>

          {/* Score breakdown */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Score Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { label: "Part A – Technical KPA (70%)", value: ev.partA_averagePoint, weighted: (ev.partA_averagePoint ?? 0) * 0.7, color: "bg-blue-500", maxW: 70 },
                { label: "Part B1 – Self Assessment (5%)", value: ev.partB1_total, weighted: ev.partB1_weighted, color: "bg-indigo-500", maxW: 5 },
                { label: "Part B2 – Supervisor Behavioral (10%)", value: ev.partB2_total, weighted: ev.partB2_weighted, color: "bg-violet-500", maxW: 10 },
                { label: "Part B3 – Additional (15%)", value: ev.partB3_rawScore, weighted: ev.partB3_weighted, color: "bg-teal-500", maxW: 15 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{row.label}</span>
                    <span className="font-semibold text-slate-700">{(row.weighted ?? 0).toFixed(2)} pts</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${row.color}`}
                      style={{ width: `${Math.min(((row.weighted ?? 0) / row.maxW) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Part A: KPA Detail */}
      <SectionCard title="Part A – Technical KPA Scores" subtitle="Key Performance Areas evaluated by supervisor (70% weight)" colorClass="bg-blue-600">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="pb-3 pr-4 w-8">#</th>
                <th className="pb-3 pr-4">Key Performance Area</th>
                <th className="pb-3 pr-4 text-center w-20">Weight</th>
                <th className="pb-3 pr-4 text-center w-20">Score</th>
                <th className="pb-3 w-32">Bar</th>
                <th className="pb-3 pl-4 text-right w-24">Weighted Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {KPA_ITEMS.map((kpa) => {
                const s = kpaScoresMap[kpa.index];
                return (
                  <tr key={kpa.index} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 text-slate-400 text-xs font-mono">{kpa.index}</td>
                    <td className="py-3 pr-4">
                      <p className="text-slate-800 text-xs font-medium leading-snug">{kpa.label}</p>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {Math.round(kpa.weight * 100)}%
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center font-bold text-slate-800">
                      {s?.score ?? "—"}
                    </td>
                    <td className="py-3 w-32">
                      {s && <ScoreBar score={s.score} max={4} />}
                    </td>
                    <td className="py-3 pl-4 text-right font-semibold text-blue-700">
                      {s ? s.weightedPoint.toFixed(2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-blue-50">
              <tr>
                <td colSpan={5} className="pt-3 px-0 text-right text-sm font-semibold text-slate-700">
                  <span className="mr-4">Overall Result: <span className="text-blue-700">{ev.partA_overallResult?.toFixed(2)} / 40</span></span>
                  <span>Average Point: <span className="text-blue-700">{ev.partA_averagePoint?.toFixed(2)}%</span></span>
                </td>
                <td className="pt-3 pl-4 text-right font-bold text-blue-700">
                  {((ev.partA_averagePoint ?? 0) * 0.7).toFixed(2)} pts
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      {/* Part B1 + B2 Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* B1 Self */}
        <SectionCard title="Part B1 – Self Assessment" subtitle="Employee self-evaluation (5% weight)" colorClass="bg-indigo-600">
          <div className="space-y-3">
            {BEHAVIORAL_COMPETENCIES.map((comp) => {
              const s = selfScoresMap[comp.index];
              return (
                <div key={comp.index}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span className="flex-1 pr-2 leading-snug">{comp.label}</span>
                    <span className="font-bold text-indigo-700 flex-shrink-0">{s?.score ?? "—"} / 4</span>
                  </div>
                  <ScoreBar score={s?.score ?? 0} max={4} />
                </div>
              );
            })}
            <div className="pt-3 border-t border-slate-100 flex justify-between text-sm">
              <span className="text-slate-500">Weighted (×5%)</span>
              <span className="font-bold text-indigo-700">{ev.partB1_weighted?.toFixed(2)} pts</span>
            </div>
          </div>
        </SectionCard>

        {/* B2 Supervisor */}
        <SectionCard title="Part B2 – Supervisor Behavioral" subtitle="Supervisor assessment (10% weight)" colorClass="bg-violet-600">
          <div className="space-y-3">
            {BEHAVIORAL_COMPETENCIES.map((comp) => {
              const s = supScoresMap[comp.index];
              return (
                <div key={comp.index}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span className="flex-1 pr-2 leading-snug">{comp.label}</span>
                    <span className="font-bold text-violet-700 flex-shrink-0">{s?.score ?? "—"} / 4</span>
                  </div>
                  <ScoreBar score={s?.score ?? 0} max={4} />
                </div>
              );
            })}
            <div className="pt-3 border-t border-slate-100 flex justify-between text-sm">
              <span className="text-slate-500">Weighted (×10%)</span>
              <span className="font-bold text-violet-700">{ev.partB2_weighted?.toFixed(2)} pts</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Part B3 */}
      <SectionCard title="Part B3 – Additional Assessment (15%)" subtitle="Peer / 360° feedback on scale 1–5" colorClass="bg-teal-600">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-teal-700">{b3Score?.score ?? ev.partB3_rawScore ?? "—"}</p>
            <p className="text-slate-400 text-xs mt-1">out of 5</p>
          </div>
          <div className="flex-1 space-y-1">
            <ScoreBar score={b3Score?.score ?? ev.partB3_rawScore ?? 0} max={5} />
            <div className="flex justify-between text-xs text-slate-500">
              <span>1 – Unsatisfactory</span><span>5 – Outstanding</span>
            </div>
          </div>
          <div className="text-center bg-teal-50 rounded-xl px-5 py-3 border border-teal-100">
            <p className="text-xs text-teal-600">Weighted (×15%)</p>
            <p className="text-xl font-bold text-teal-700">{ev.partB3_weighted?.toFixed(2)}</p>
            <p className="text-xs text-teal-500">pts</p>
          </div>
        </div>
      </SectionCard>

      {/* Comments */}
      {(ev.supervisorComments || ev.employeeComments) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Comments</h3>
          {ev.supervisorComments && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-2">Supervisor Comments</p>
              <p className="text-sm text-slate-700 leading-relaxed">{ev.supervisorComments}</p>
            </div>
          )}
          {ev.employeeComments && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">Employee Comments</p>
              <p className="text-sm text-slate-700 leading-relaxed">{ev.employeeComments}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
