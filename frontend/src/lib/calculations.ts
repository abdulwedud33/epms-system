// Shared calculation logic – mirrors backend/src/utils/calculations.ts exactly
// so the frontend can do real-time preview without a network call.

export const KPA_ITEMS = [
  { index: 1, label: "Support and maintenance for HRMS, Attendance System, Transport System, and Clinic Service System", shortLabel: "HRMS & Systems Maintenance", weight: 0.25 },
  { index: 2, label: "Implementation of the Community and Special School System + user training", shortLabel: "Community & School System Implementation", weight: 0.25 },
  { index: 3, label: "Employee ID card printing as per new structure + system improvement & support", shortLabel: "Employee ID Cards & System Improvement", weight: 0.10 },
  { index: 4, label: "Developing the ASTU Academic Staff Profile System", shortLabel: "ASTU Academic Staff Profile System", weight: 0.10 },
  { index: 5, label: "Collecting data, designing & developing Stock and Gate Pass Management System", shortLabel: "Stock & Gate Pass Management System", weight: 0.20 },
  { index: 6, label: "Collecting, analyzing & designing requirements for Strategic and Data Management System", shortLabel: "Strategic & Data Management System", weight: 0.10 },
] as const;

export const BEHAVIORAL_COMPETENCIES = [
  { index: 1, label: "Efforts to eliminate discrimination, bias, and misconduct", weight: 0.25 },
  { index: 2, label: "Efforts to enhance competency", weight: 0.20 },
  { index: 3, label: "Honor & recognition received", weight: 0.15 },
  { index: 4, label: "Efforts to support and empower others", weight: 0.15 },
  { index: 5, label: "Efforts to improve processes & sustainability", weight: 0.15 },
  { index: 6, label: "Providing/receiving performance feedback timely", weight: 0.10 },
] as const;

export const KPA_SCORE_LABELS: Record<number, string> = {
  1: "Unsatisfactory", 2: "Needs Improvement", 3: "Meets Expectations", 4: "Exceeds Expectations",
};
export const B3_SCORE_LABELS: Record<number, string> = {
  1: "Unsatisfactory", 2: "Below Average", 3: "Average", 4: "Above Average", 5: "Outstanding",
};

export interface KpaScoreInput { kpaIndex: number; score: number; }
export interface BehavioralScoreInput { competencyIndex: number; score: number; }
export interface EvaluationInputs {
  kpaScores: KpaScoreInput[];
  selfScores: BehavioralScoreInput[];
  supervisorScores: BehavioralScoreInput[];
  b3Score: number;
}

export interface EvaluationResult {
  kpaItems: { kpaIndex: number; label: string; shortLabel: string; weight: number; weightPercent: number; score: number; weightedPoint: number }[];
  partA_overallResult: number;
  partA_averagePoint: number;
  partA_weighted: number;
  b1Items: { competencyIndex: number; label: string; weight: number; weightPercent: number; score: number; weightedPoint: number }[];
  partB1_total: number; partB1_percent: number; partB1_weighted: number;
  b2Items: { competencyIndex: number; label: string; weight: number; weightPercent: number; score: number; weightedPoint: number }[];
  partB2_total: number; partB2_percent: number; partB2_weighted: number;
  b3RawScore: number; partB3_percent: number; partB3_weighted: number;
  finalScore: number; ratingLabel: string; ratingColor: string;
}

export function calculateEvaluation(inputs: EvaluationInputs): EvaluationResult {
  // Part A
  const kpaItems = KPA_ITEMS.map((kpa) => {
    const input = inputs.kpaScores.find((s) => s.kpaIndex === kpa.index);
    const score = input?.score ?? 0;
    return { kpaIndex: kpa.index, label: kpa.label, shortLabel: kpa.shortLabel, weight: kpa.weight, weightPercent: Math.round(kpa.weight * 100), score, weightedPoint: parseFloat((score * kpa.weight * 10).toFixed(2)) };
  });
  const partA_overallResult = parseFloat(kpaItems.reduce((s, i) => s + i.weightedPoint, 0).toFixed(2));
  const partA_averagePoint = parseFloat(((partA_overallResult / 40) * 100).toFixed(2));
  const partA_weighted = parseFloat((partA_averagePoint * 0.70).toFixed(2));

  // Part B1
  const b1Items = BEHAVIORAL_COMPETENCIES.map((comp) => {
    const input = inputs.selfScores.find((s) => s.competencyIndex === comp.index);
    const score = input?.score ?? 0;
    return { competencyIndex: comp.index, label: comp.label, weight: comp.weight, weightPercent: Math.round(comp.weight * 100), score, weightedPoint: parseFloat((score * comp.weight).toFixed(4)) };
  });
  const partB1_total = parseFloat(b1Items.reduce((s, i) => s + i.weightedPoint, 0).toFixed(4));
  const partB1_percent = parseFloat(((partB1_total / 4) * 100).toFixed(2));
  const partB1_weighted = parseFloat((partB1_percent * 0.05).toFixed(2));

  // Part B2
  const b2Items = BEHAVIORAL_COMPETENCIES.map((comp) => {
    const input = inputs.supervisorScores.find((s) => s.competencyIndex === comp.index);
    const score = input?.score ?? 0;
    return { competencyIndex: comp.index, label: comp.label, weight: comp.weight, weightPercent: Math.round(comp.weight * 100), score, weightedPoint: parseFloat((score * comp.weight).toFixed(4)) };
  });
  const partB2_total = parseFloat(b2Items.reduce((s, i) => s + i.weightedPoint, 0).toFixed(4));
  const partB2_percent = parseFloat(((partB2_total / 4) * 100).toFixed(2));
  const partB2_weighted = parseFloat((partB2_percent * 0.10).toFixed(2));

  // Part B3
  const partB3_percent = parseFloat((((inputs.b3Score - 1) / 4) * 100).toFixed(2));
  const partB3_weighted = parseFloat((partB3_percent * 0.15).toFixed(2));

  const finalScore = parseFloat((partA_weighted + partB1_weighted + partB2_weighted + partB3_weighted).toFixed(2));
  const { ratingLabel, ratingColor } = getRatingLabel(finalScore);

  return {
    kpaItems, partA_overallResult, partA_averagePoint, partA_weighted,
    b1Items, partB1_total, partB1_percent, partB1_weighted,
    b2Items, partB2_total, partB2_percent, partB2_weighted,
    b3RawScore: inputs.b3Score, partB3_percent, partB3_weighted,
    finalScore, ratingLabel, ratingColor,
  };
}

export function getRatingLabel(score: number): { ratingLabel: string; ratingColor: string } {
  if (score >= 90) return { ratingLabel: "Outstanding", ratingColor: "emerald" };
  if (score >= 75) return { ratingLabel: "Excellent", ratingColor: "blue" };
  if (score >= 60) return { ratingLabel: "Very Good", ratingColor: "indigo" };
  if (score >= 45) return { ratingLabel: "Good", ratingColor: "yellow" };
  if (score >= 30) return { ratingLabel: "Needs Improvement", ratingColor: "orange" };
  return { ratingLabel: "Unsatisfactory", ratingColor: "red" };
}

export function getRatingBadgeClass(label: string): string {
  const map: Record<string, string> = {
    "Outstanding": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Excellent": "bg-blue-100 text-blue-800 border-blue-200",
    "Very Good": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "Good": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Needs Improvement": "bg-orange-100 text-orange-800 border-orange-200",
    "Unsatisfactory": "bg-red-100 text-red-800 border-red-200",
  };
  return map[label] ?? "bg-gray-100 text-gray-800 border-gray-200";
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-blue-100 text-blue-700",
    UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}
