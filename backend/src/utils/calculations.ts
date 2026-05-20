/**
 * EPMS Calculation Utilities
 * ============================================================
 * All scoring logic is centralised here so it can be used
 * identically on the frontend (live preview) and backend
 * (persisting computed values).
 *
 * Original form example (from spec):
 *   KPA scores → Overall Result = 22, Average Point = 66.5
 *   This means: sum(score × weight × 10) and then × 2.5
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const KPA_ITEMS = [
  {
    index: 1,
    label: "Support and maintenance for HRMS, Attendance System, Transport System, and Clinic Service System",
    shortLabel: "HRMS & Systems Maintenance",
    weight: 0.25, // 25%
  },
  {
    index: 2,
    label: "Implementation of the Community and Special School System + user training",
    shortLabel: "Community & School System Implementation",
    weight: 0.25, // 25%
  },
  {
    index: 3,
    label: "Employee ID card printing as per new structure + system improvement & support",
    shortLabel: "Employee ID Cards & System Improvement",
    weight: 0.10, // 10%
  },
  {
    index: 4,
    label: "Developing the ASTU Academic Staff Profile System",
    shortLabel: "ASTU Academic Staff Profile System",
    weight: 0.10, // 10%
  },
  {
    index: 5,
    label: "Collecting data, designing & developing Stock and Gate Pass Management System",
    shortLabel: "Stock & Gate Pass Management System",
    weight: 0.20, // 20%
  },
  {
    index: 6,
    label: "Collecting, analyzing & designing requirements for Strategic and Data Management System",
    shortLabel: "Strategic & Data Management System",
    weight: 0.10, // 10%
  },
] as const;

export const BEHAVIORAL_COMPETENCIES = [
  {
    index: 1,
    label: "Efforts to eliminate discrimination, bias, and misconduct",
    weight: 0.25, // 25%
  },
  {
    index: 2,
    label: "Efforts to enhance competency",
    weight: 0.20, // 20%
  },
  {
    index: 3,
    label: "Honor & recognition received",
    weight: 0.15, // 15%
  },
  {
    index: 4,
    label: "Efforts to support and empower others",
    weight: 0.15, // 15%
  },
  {
    index: 5,
    label: "Efforts to improve processes & sustainability",
    weight: 0.15, // 15%
  },
  {
    index: 6,
    label: "Providing/receiving performance feedback timely",
    weight: 0.10, // 10%
  },
] as const;

/** KPA score scale: 1–4 */
export const KPA_SCORE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Needs Improvement",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
};

/** Behavioral score scale: 1–4 (B1, B2) */
export const BEHAVIORAL_SCORE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Needs Improvement",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
};

/** B3 additional score: 1–5 */
export const B3_SCORE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Below Average",
  3: "Average",
  4: "Above Average",
  5: "Outstanding",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpaScoreInput {
  kpaIndex: number; // 1–6
  score: number;    // 1–4
}

export interface BehavioralScoreInput {
  competencyIndex: number; // 1–6
  score: number;           // 1–4
}

export interface EvaluationInputs {
  kpaScores: KpaScoreInput[];
  selfScores: BehavioralScoreInput[];       // B1
  supervisorScores: BehavioralScoreInput[]; // B2
  b3Score: number;                          // 1–5
}

export interface KpaCalculated {
  kpaIndex: number;
  label: string;
  shortLabel: string;
  weight: number;
  weightPercent: number; // weight × 100 for display
  score: number;
  weightedPoint: number; // score × weight × 10
}

export interface BehavioralCalculated {
  competencyIndex: number;
  label: string;
  weight: number;
  weightPercent: number;
  score: number;
  weightedPoint: number; // score × weight
}

export interface EvaluationResult {
  // Part A
  kpaItems: KpaCalculated[];
  partA_overallResult: number;  // sum of weightedPoints (e.g. 22)
  partA_averagePoint: number;   // overallResult × 2.5  (e.g. 55)
  partA_weighted: number;       // averagePoint × 0.70  (contributes to final)

  // Part B1 – Self Assessment (5%)
  b1Items: BehavioralCalculated[];
  partB1_total: number;         // sum of weighted scores (out of 4)
  partB1_percent: number;       // as % of 100
  partB1_weighted: number;      // × 0.05

  // Part B2 – Supervisor Behavioral (10%)
  b2Items: BehavioralCalculated[];
  partB2_total: number;
  partB2_percent: number;
  partB2_weighted: number;      // × 0.10

  // Part B3 – Additional 15% (1–5 scale)
  b3RawScore: number;
  partB3_percent: number;       // normalised to 100
  partB3_weighted: number;      // × 0.15

  // Final
  finalScore: number;           // partA_weighted + partB1_weighted + partB2_weighted + partB3_weighted
  ratingLabel: string;
  ratingColor: string;          // for UI
}

// ─── Part A Calculation ───────────────────────────────────────────────────────

/**
 * Calculate weighted point for a single KPA item.
 *
 * The original form uses:
 *   weightedPoint = score × weight × 10
 * So max per item = 4 × 1.00 × 10 = 40 across all 6 items
 * Then overallResult (sum of all weighted points) is divided by 40 × 10 * ... 
 *
 * Replicated from spec example:
 *   Score 4, weight 25% → 4 × 0.25 × 10 = 10  ← but spec shows "17.5"
 *
 * Spec shows: score × weight (as raw fraction) gives point directly, then × something = 66.5
 * Let's reverse-engineer:
 *   If all scores = 4 (max), weights sum = 1.0 → max overall result = 4
 *   66.5 / 4 ≈ 16.6... doesn't resolve cleanly.
 *
 * Looking at spec: "Overall Result = 22, Average Point = 66.5"
 * 22 / 40 × 100 = 55 (not 66.5)
 * 
 * Most likely formula: each item = score × (weight as integer percent)
 * Max = 4×25 + 4×25 + 4×10 + 4×10 + 4×20 + 4×10 = 400
 * Then average = overallResult / max × 100
 * 
 * If example overall = 22: score per item might be lower
 * e.g. 3×25% = 7.5 (shown as integer?) → 3×25=75 points total? no...
 *
 * Most sensible interpretation matching "score × weight → 17.5 example":
 *   weightedPoint = score × (weight in %)
 *   max = 4 × (25+25+10+10+20+10) = 4 × 100 = 400
 *   overallResult = sum(score × weightPercent)
 *   averagePoint = overallResult / 4 (to get out of 100)
 *
 * Example: if all scores = 3 (out of 4):
 *   overallResult = 3×(25+25+10+10+20+10) = 3×100 = 300
 *   averagePoint = 300/4 = 75... 
 *
 * For "Overall Result = 22, Average Point = 66.5":
 *   22 × 2.5 = 55 (not 66.5)
 *   22 / 4 × something = 66.5 → 22 × 3.02... 
 *
 * Most likely: scores are NOT all the same. The 22 is just the raw sum of (score×weight×10)
 * and 66.5 = 22/40×100×1.something. OR the "average" uses a different base.
 *
 * Implementation: We'll use the clearest mathematically sound formula:
 *   weightedPoint = score × weight  (fractional, e.g. 4 × 0.25 = 1.0)
 *   overallResult = sum(weightedPoints) (max 4.0)
 *   averagePoint  = (overallResult / 4) × 100  (percentage, max 100)
 *   partA_weighted = averagePoint × 0.70
 *
 * For display we also show: score × weightPercent for the "points" column
 */
export function calculateKpaWeightedPoint(score: number, weightDecimal: number): number {
  // score (1-4) × weight (0-1) × 25 to get on a 0-100 scale per item normalized
  // Simple: score × weight gives fraction of max-per-item contribution
  return parseFloat((score * weightDecimal).toFixed(4));
}

export function calculatePartA(kpaScores: KpaScoreInput[]): {
  items: KpaCalculated[];
  overallResult: number;
  averagePoint: number;
  weighted: number;
} {
  const items: KpaCalculated[] = KPA_ITEMS.map((kpa) => {
    const input = kpaScores.find((s) => s.kpaIndex === kpa.index);
    const score = input?.score ?? 0;
    const weightedPoint = parseFloat((score * kpa.weight * 10).toFixed(2));
    // score × weight × 10: max = 4 × 1.0 × 10 = 40 across all items (since weights sum to 1)
    return {
      kpaIndex: kpa.index,
      label: kpa.label,
      shortLabel: kpa.shortLabel,
      weight: kpa.weight,
      weightPercent: Math.round(kpa.weight * 100),
      score,
      weightedPoint,
    };
  });

  // Overall Result = sum of all weightedPoints (max 40 when all scores=4)
  const overallResult = parseFloat(
    items.reduce((sum, i) => sum + i.weightedPoint, 0).toFixed(2)
  );

  // Average Point = overallResult / 40 × 100 (percentage)
  // BUT spec says Overall=22, Average=66.5: 22/40×100=55, not 66.5
  // Alternative: averagePoint = overallResult × 2.5 gives 22×2.5=55
  // The spec's 66.5 might come from a different base score set.
  // We use: averagePoint = (overallResult / 40) × 100 for correctness.
  // This matches: if all scores=4 → overallResult=40 → averagePoint=100
  const averagePoint = parseFloat(((overallResult / 40) * 100).toFixed(2));

  // Part A contributes 70% of final score
  const weighted = parseFloat((averagePoint * 0.70).toFixed(2));

  return { items, overallResult, averagePoint, weighted };
}

// ─── Part B Calculation ───────────────────────────────────────────────────────

export function calculateBehavioralSection(scores: BehavioralScoreInput[]): {
  items: BehavioralCalculated[];
  total: number;   // weighted sum (max 4)
  percent: number; // as 0-100
} {
  const items: BehavioralCalculated[] = BEHAVIORAL_COMPETENCIES.map((comp) => {
    const input = scores.find((s) => s.competencyIndex === comp.index);
    const score = input?.score ?? 0;
    const weightedPoint = parseFloat((score * comp.weight).toFixed(4));
    return {
      competencyIndex: comp.index,
      label: comp.label,
      weight: comp.weight,
      weightPercent: Math.round(comp.weight * 100),
      score,
      weightedPoint,
    };
  });

  // Total: sum of (score × weight) — max = 4 × 1.0 = 4
  const total = parseFloat(
    items.reduce((sum, i) => sum + i.weightedPoint, 0).toFixed(4)
  );

  // As percentage (0–100)
  const percent = parseFloat(((total / 4) * 100).toFixed(2));

  return { items, total, percent };
}

export function calculateB3(rawScore: number): {
  percent: number;
  weighted: number;
} {
  // B3 is 1–5 scale; normalise to 0–100
  const percent = parseFloat((((rawScore - 1) / 4) * 100).toFixed(2));
  const weighted = parseFloat((percent * 0.15).toFixed(2));
  return { percent, weighted };
}

// ─── Master Calculation ───────────────────────────────────────────────────────

export function calculateEvaluation(inputs: EvaluationInputs): EvaluationResult {
  const partA = calculatePartA(inputs.kpaScores);

  const b1 = calculateBehavioralSection(inputs.selfScores);
  const b2 = calculateBehavioralSection(inputs.supervisorScores);
  const b3 = calculateB3(inputs.b3Score);

  const partB1_weighted = parseFloat((b1.percent * 0.05).toFixed(2));
  const partB2_weighted = parseFloat((b2.percent * 0.10).toFixed(2));

  const finalScore = parseFloat(
    (partA.weighted + partB1_weighted + partB2_weighted + b3.weighted).toFixed(2)
  );

  return {
    kpaItems: partA.items,
    partA_overallResult: partA.overallResult,
    partA_averagePoint: partA.averagePoint,
    partA_weighted: partA.weighted,

    b1Items: b1.items,
    partB1_total: b1.total,
    partB1_percent: b1.percent,
    partB1_weighted,

    b2Items: b2.items,
    partB2_total: b2.total,
    partB2_percent: b2.percent,
    partB2_weighted,

    b3RawScore: inputs.b3Score,
    partB3_percent: b3.percent,
    partB3_weighted: b3.weighted,

    finalScore,
    ...getRatingLabel(finalScore),
  };
}

// ─── Rating Labels ────────────────────────────────────────────────────────────

export function getRatingLabel(score: number): {
  ratingLabel: string;
  ratingColor: string;
} {
  if (score >= 90) return { ratingLabel: "Outstanding", ratingColor: "emerald" };
  if (score >= 75) return { ratingLabel: "Excellent", ratingColor: "blue" };
  if (score >= 60) return { ratingLabel: "Very Good", ratingColor: "indigo" };
  if (score >= 45) return { ratingLabel: "Good", ratingColor: "yellow" };
  if (score >= 30) return { ratingLabel: "Needs Improvement", ratingColor: "orange" };
  return { ratingLabel: "Unsatisfactory", ratingColor: "red" };
}

/** Format a score for display (2 decimal places) */
export function fmt(n: number): string {
  return n.toFixed(2);
}
