"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi, evaluationApi, Employee, CreateEvaluationData } from "@/lib/api";
import {
  calculateEvaluation, KPA_ITEMS, BEHAVIORAL_COMPETENCIES,
  KPA_SCORE_LABELS, B3_SCORE_LABELS, EvaluationResult,
} from "@/lib/calculations";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, Save, Eye, AlertCircle, CheckCircle2, Info } from "lucide-react";

// ─── Score Button ─────────────────────────────────────────────────────────────
function ScoreButton({ value, selected, max = 4, onChange }: {
  value: number; selected: number; max?: number; onChange: (v: number) => void;
}) {
  const colors = [
    "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
    "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100",
    "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
    "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
    "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  ];
  const selectedColors = [
    "border-red-500 bg-red-500 text-white",
    "border-orange-500 bg-orange-500 text-white",
    "border-yellow-500 bg-yellow-500 text-white",
    "border-blue-500 bg-blue-500 text-white",
    "border-emerald-500 bg-emerald-500 text-white",
  ];

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        "w-10 h-10 rounded-lg border-2 text-sm font-bold transition-all",
        selected === value ? selectedColors[value - 1] : colors[value - 1]
      )}
    >
      {value}
    </button>
  );
}

// ─── Score Row ─────────────────────────────────────────────────────────────────
function ScoreRow({ index, label, weight, weightPercent, score, weightedPoint, max = 4, onChange, scoreLabels }: {
  index: number; label: string; weight: number; weightPercent: number;
  score: number; weightedPoint: number; max?: number;
  onChange: (score: number) => void;
  scoreLabels: Record<number, string>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 py-4 border-b border-slate-100 last:border-0">
      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
        {index}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-800 font-medium leading-snug">{label}</p>
        {score > 0 && (
          <p className="text-xs text-slate-400 mt-0.5">{scoreLabels[score]}</p>
        )}
      </div>
      <div className="text-center">
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {weightPercent}%
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
          <ScoreButton key={v} value={v} selected={score} max={max} onChange={onChange} />
        ))}
      </div>
      <div className="text-right w-16">
        <p className="text-sm font-bold text-slate-700">{weightedPoint.toFixed(2)}</p>
        <p className="text-xs text-slate-400">pts</p>
      </div>
    </div>
  );
}

// ─── Score Summary Box ─────────────────────────────────────────────────────────
function SummaryBox({ label, value, suffix = "", colorClass = "text-slate-900" }: {
  label: string; value: string | number; suffix?: string; colorClass?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", colorClass)}>{value}<span className="text-sm font-normal text-slate-400 ml-1">{suffix}</span></p>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function NewEvaluationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => employeeApi.list(),
  });

  // Form state
  const [evaluateeId, setEvaluateeId] = useState("");
  const [period, setPeriod] = useState("ANNUAL");
  const [year, setYear] = useState(new Date().getFullYear());
  const [supervisorComments, setSupervisorComments] = useState("");
  const [employeeComments, setEmployeeComments] = useState("");

  // KPA scores (Part A) – indexed by kpaIndex
  const [kpaScores, setKpaScores] = useState<Record<number, number>>({});
  // Behavioral scores B1 (self) and B2 (supervisor)
  const [selfScores, setSelfScores] = useState<Record<number, number>>({});
  const [supervisorScores, setSupervisorScores] = useState<Record<number, number>>({});
  // B3
  const [b3Score, setB3Score] = useState(3);

  // Computed result (live)
  const [result, setResult] = useState<EvaluationResult | null>(null);

  // Recalculate on every score change
  useEffect(() => {
    const kpaArr = KPA_ITEMS.map((k) => ({ kpaIndex: k.index, score: kpaScores[k.index] ?? 0 }));
    const selfArr = BEHAVIORAL_COMPETENCIES.map((c) => ({ competencyIndex: c.index, score: selfScores[c.index] ?? 0 }));
    const supArr = BEHAVIORAL_COMPETENCIES.map((c) => ({ competencyIndex: c.index, score: supervisorScores[c.index] ?? 0 }));
    const computed = calculateEvaluation({ kpaScores: kpaArr, selfScores: selfArr, supervisorScores: supArr, b3Score });
    setResult(computed);
  }, [kpaScores, selfScores, supervisorScores, b3Score]);

  const mutation = useMutation({
    mutationFn: (data: CreateEvaluationData) => evaluationApi.create(data),
    onSuccess: (ev) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      router.push(`/evaluations/${ev.id}`);
    },
  });

  const [submitError, setSubmitError] = useState("");

  const handleSave = async (asDraft = true) => {
    setSubmitError("");
    if (!evaluateeId) { setSubmitError("Please select an employee to evaluate."); return; }
    if (!user?.employee?.id) { setSubmitError("Your supervisor profile is not configured."); return; }

    const kpaArr = KPA_ITEMS.map((k) => ({ kpaIndex: k.index, score: kpaScores[k.index] ?? 1 }));
    const selfArr = BEHAVIORAL_COMPETENCIES.map((c) => ({ competencyIndex: c.index, score: selfScores[c.index] ?? 1 }));
    const supArr = BEHAVIORAL_COMPETENCIES.map((c) => ({ competencyIndex: c.index, score: supervisorScores[c.index] ?? 1 }));

    try {
      await mutation.mutateAsync({
        evaluateeId,
        evaluatorId: user.employee.id,
        period,
        year,
        kpaScores: kpaArr,
        selfScores: selfArr,
        supervisorScores: supArr,
        b3Score,
        supervisorComments,
        employeeComments,
      });
    } catch (err: any) {
      setSubmitError(err.message || "Failed to save evaluation");
    }
  };

  const ratingColorMap: Record<string, string> = {
    Outstanding: "text-emerald-600",
    Excellent: "text-blue-600",
    "Very Good": "text-indigo-600",
    Good: "text-yellow-600",
    "Needs Improvement": "text-orange-600",
    Unsatisfactory: "text-red-600",
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <span>Evaluations</span><ChevronRight className="w-3.5 h-3.5" /><span className="text-slate-600">New Evaluation</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Civil Service Performance Evaluation Form</h1>
        <p className="text-slate-500 text-sm mt-1">ASTU – Annual Performance Review · FY {year}</p>
      </div>

      {submitError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {submitError}
        </div>
      )}

      {/* Meta */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">Evaluation Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Employee Being Evaluated *</label>
            <select
              value={evaluateeId}
              onChange={(e) => setEvaluateeId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select employee…</option>
              {(employees ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.fullName} – {emp.department?.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["Q1","Q2","Q3","Q4","MIDYEAR","ANNUAL"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))}
              min={2020} max={2030}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* ── PART A: Technical KPA (70%) ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Part A – Technical Performance (KPA)</h2>
              <p className="text-blue-100 text-sm">Completed by immediate supervisor · Score scale: 1–4</p>
            </div>
            <div className="text-right bg-white/20 rounded-xl px-4 py-2">
              <p className="text-blue-100 text-xs">Weight</p>
              <p className="text-2xl font-bold">70%</p>
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden lg:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div className="w-7">#</div>
          <div>Key Performance Area</div>
          <div className="text-center">Weight</div>
          <div>Score (1–4)</div>
          <div className="w-16 text-right">Points</div>
        </div>

        <div className="px-6">
          {KPA_ITEMS.map((kpa) => (
            <ScoreRow
              key={kpa.index}
              index={kpa.index}
              label={kpa.label}
              weight={kpa.weight}
              weightPercent={Math.round(kpa.weight * 100)}
              score={kpaScores[kpa.index] ?? 0}
              weightedPoint={result?.kpaItems.find((i) => i.kpaIndex === kpa.index)?.weightedPoint ?? 0}
              onChange={(v) => setKpaScores((prev) => ({ ...prev, [kpa.index]: v }))}
              scoreLabels={KPA_SCORE_LABELS}
            />
          ))}
        </div>

        {/* Part A Summary */}
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryBox label="Overall Result" value={result?.partA_overallResult.toFixed(2) ?? "0.00"} suffix="/ 40" />
            <SummaryBox label="Average Point" value={result?.partA_averagePoint.toFixed(2) ?? "0.00"} suffix="/ 100" />
            <SummaryBox label="Weighted (×70%)" value={result?.partA_weighted.toFixed(2) ?? "0.00"} suffix="pts" colorClass="text-blue-700" />
            <div className="bg-blue-100 rounded-xl p-4 text-center border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">Score Legend</p>
              <div className="text-xs text-blue-700 space-y-0.5">
                <p>1 = Unsatisfactory</p>
                <p>2 = Needs Improvement</p>
                <p>3 = Meets Expectations</p>
                <p>4 = Exceeds Expectations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PART B1: Self Assessment (5%) ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Part B1 – Self Assessment (Own)</h2>
              <p className="text-indigo-100 text-sm">Completed by the employee · Behavioral competencies</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-right">
              <p className="text-indigo-100 text-xs">Weight</p>
              <p className="text-2xl font-bold">5%</p>
            </div>
          </div>
        </div>
        <div className="hidden lg:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div className="w-7">#</div><div>Behavioral Competency</div>
          <div className="text-center">Weight</div><div>Score (1–4)</div><div className="w-16 text-right">Points</div>
        </div>
        <div className="px-6">
          {BEHAVIORAL_COMPETENCIES.map((comp) => (
            <ScoreRow key={comp.index} index={comp.index} label={comp.label}
              weight={comp.weight} weightPercent={Math.round(comp.weight * 100)}
              score={selfScores[comp.index] ?? 0}
              weightedPoint={result?.b1Items.find((i) => i.competencyIndex === comp.index)?.weightedPoint ?? 0}
              onChange={(v) => setSelfScores((prev) => ({ ...prev, [comp.index]: v }))}
              scoreLabels={KPA_SCORE_LABELS}
            />
          ))}
        </div>
        <div className="px-6 py-4 bg-indigo-50 border-t border-indigo-100">
          <div className="grid grid-cols-3 gap-4">
            <SummaryBox label="Section Total" value={result?.partB1_total.toFixed(3) ?? "0.000"} suffix="/ 4" />
            <SummaryBox label="As Percentage" value={result?.partB1_percent.toFixed(2) ?? "0.00"} suffix="%" />
            <SummaryBox label="Weighted (×5%)" value={result?.partB1_weighted.toFixed(2) ?? "0.00"} suffix="pts" colorClass="text-indigo-700" />
          </div>
        </div>
      </div>

      {/* ── PART B2: Supervisor Behavioral (10%) ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-violet-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Part B2 – Supervisor Behavioral Assessment</h2>
              <p className="text-violet-100 text-sm">Completed by immediate supervisor</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-right">
              <p className="text-violet-100 text-xs">Weight</p>
              <p className="text-2xl font-bold">10%</p>
            </div>
          </div>
        </div>
        <div className="hidden lg:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div className="w-7">#</div><div>Behavioral Competency</div>
          <div className="text-center">Weight</div><div>Score (1–4)</div><div className="w-16 text-right">Points</div>
        </div>
        <div className="px-6">
          {BEHAVIORAL_COMPETENCIES.map((comp) => (
            <ScoreRow key={comp.index} index={comp.index} label={comp.label}
              weight={comp.weight} weightPercent={Math.round(comp.weight * 100)}
              score={supervisorScores[comp.index] ?? 0}
              weightedPoint={result?.b2Items.find((i) => i.competencyIndex === comp.index)?.weightedPoint ?? 0}
              onChange={(v) => setSupervisorScores((prev) => ({ ...prev, [comp.index]: v }))}
              scoreLabels={KPA_SCORE_LABELS}
            />
          ))}
        </div>
        <div className="px-6 py-4 bg-violet-50 border-t border-violet-100">
          <div className="grid grid-cols-3 gap-4">
            <SummaryBox label="Section Total" value={result?.partB2_total.toFixed(3) ?? "0.000"} suffix="/ 4" />
            <SummaryBox label="As Percentage" value={result?.partB2_percent.toFixed(2) ?? "0.00"} suffix="%" />
            <SummaryBox label="Weighted (×10%)" value={result?.partB2_weighted.toFixed(2) ?? "0.00"} suffix="pts" colorClass="text-violet-700" />
          </div>
        </div>
      </div>

      {/* ── PART B3: Additional 15% ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-teal-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Part B3 – Additional Assessment</h2>
              <p className="text-teal-100 text-sm">Peer / 360° feedback · Scale 1–5</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-right">
              <p className="text-teal-100 text-xs">Weight</p>
              <p className="text-2xl font-bold">15%</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm font-medium text-slate-700 flex-1">Overall Behavioral / Peer Score</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <ScoreButton key={v} value={v} selected={b3Score} max={5} onChange={setB3Score} />
              ))}
            </div>
            <div className="w-24 text-right">
              <p className="text-sm font-bold text-slate-700">{result?.partB3_weighted.toFixed(2) ?? "0.00"} pts</p>
              <p className="text-xs text-slate-400">{B3_SCORE_LABELS[b3Score]}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <SummaryBox label="Raw Score" value={b3Score} suffix="/ 5" />
            <SummaryBox label="As Percentage" value={result?.partB3_percent.toFixed(2) ?? "0.00"} suffix="%" />
            <SummaryBox label="Weighted (×15%)" value={result?.partB3_weighted.toFixed(2) ?? "0.00"} suffix="pts" colorClass="text-teal-700" />
          </div>
        </div>
      </div>

      {/* ── FINAL SCORE ──────────────────────────────────────────────────────── */}
      {result && (
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
          <h2 className="font-bold text-lg mb-5 text-slate-100">Final Performance Score</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-xs">Part A (70%)</p>
              <p className="text-2xl font-bold text-blue-400">{result.partA_weighted.toFixed(2)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-xs">Part B1 (5%)</p>
              <p className="text-2xl font-bold text-indigo-400">{result.partB1_weighted.toFixed(2)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-xs">Part B2 (10%)</p>
              <p className="text-2xl font-bold text-violet-400">{result.partB2_weighted.toFixed(2)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-xs">Part B3 (15%)</p>
              <p className="text-2xl font-bold text-teal-400">{result.partB3_weighted.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Final Score (out of 100)</p>
              <p className={cn("text-6xl font-bold", ratingColorMap[result.ratingLabel] ?? "text-white")}>
                {result.finalScore.toFixed(2)}
              </p>
              <div className="mt-2 w-64 h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${result.finalScore}%` }} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-2">Rating</p>
              <div className="bg-white/10 rounded-xl px-6 py-3">
                <p className={cn("text-2xl font-bold", ratingColorMap[result.ratingLabel] ?? "text-white")}>
                  {result.ratingLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">Comments</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Supervisor Comments</label>
          <textarea
            value={supervisorComments}
            onChange={(e) => setSupervisorComments(e.target.value)}
            rows={3}
            placeholder="Supervisor's observations and feedback…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Employee Comments / Acknowledgment</label>
          <textarea
            value={employeeComments}
            onChange={(e) => setEmployeeComments(e.target.value)}
            rows={2}
            placeholder="Employee's response…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => handleSave(true)} disabled={mutation.isPending}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
          <Save className="w-4 h-4" />
          {mutation.isPending ? "Saving…" : "Save as Draft"}
        </button>
        <button onClick={() => handleSave(false)} disabled={mutation.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
          <CheckCircle2 className="w-4 h-4" />
          Save & Submit
        </button>
        <button onClick={() => router.back()}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
