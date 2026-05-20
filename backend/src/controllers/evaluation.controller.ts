import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { calculateEvaluation, KPA_ITEMS, BEHAVIORAL_COMPETENCIES } from "../utils/calculations";

// ─── Validation Schemas ────────────────────────────────────────────────────────

const kpaScoreSchema = z.object({
  kpaIndex: z.number().int().min(1).max(6),
  score: z.number().int().min(1).max(4),
  notes: z.string().optional(),
});

const behavioralScoreSchema = z.object({
  competencyIndex: z.number().int().min(1).max(6),
  score: z.number().int().min(1).max(4),
  notes: z.string().optional(),
});

const createEvaluationSchema = z.object({
  evaluateeId: z.string(),
  evaluatorId: z.string(),
  period: z.enum(["Q1", "Q2", "Q3", "Q4", "ANNUAL", "MIDYEAR"]),
  year: z.number().int().min(2020).max(2100),
  kpaScores: z.array(kpaScoreSchema).optional().default([]),
  selfScores: z.array(behavioralScoreSchema).optional().default([]),
  supervisorScores: z.array(behavioralScoreSchema).optional().default([]),
  b3Score: z.number().min(1).max(5).optional().default(3),
  supervisorComments: z.string().optional(),
  employeeComments: z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute all calculated fields and return DB-ready objects */
function computeAll(
  kpaScores: { kpaIndex: number; score: number; notes?: string }[],
  selfScores: { competencyIndex: number; score: number; notes?: string }[],
  supervisorScores: { competencyIndex: number; score: number; notes?: string }[],
  b3Score: number,
) {
  const result = calculateEvaluation({
    kpaScores,
    selfScores,
    supervisorScores,
    b3Score,
  });

  return {
    result,
    kpaScoreData: kpaScores.map((s) => {
      const kpa = KPA_ITEMS.find((k) => k.index === s.kpaIndex)!;
      const item = result.kpaItems.find((i) => i.kpaIndex === s.kpaIndex)!;
      return {
        kpaIndex: s.kpaIndex,
        kpaLabel: kpa.label,
        weight: kpa.weight,
        score: s.score,
        weightedPoint: item.weightedPoint,
        notes: s.notes,
      };
    }),
    selfScoreData: selfScores.map((s) => {
      const comp = BEHAVIORAL_COMPETENCIES.find((c) => c.index === s.competencyIndex)!;
      const item = result.b1Items.find((i) => i.competencyIndex === s.competencyIndex)!;
      return {
        assessorType: "SELF",
        competencyIndex: s.competencyIndex,
        competencyLabel: comp.label,
        weight: comp.weight,
        score: s.score,
        weightedPoint: item.weightedPoint,
        notes: s.notes,
      };
    }),
    supervisorScoreData: supervisorScores.map((s) => {
      const comp = BEHAVIORAL_COMPETENCIES.find((c) => c.index === s.competencyIndex)!;
      const item = result.b2Items.find((i) => i.competencyIndex === s.competencyIndex)!;
      return {
        assessorType: "SUPERVISOR",
        competencyIndex: s.competencyIndex,
        competencyLabel: comp.label,
        weight: comp.weight,
        score: s.score,
        weightedPoint: item.weightedPoint,
        notes: s.notes,
      };
    }),
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getEvaluations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, status, year, period, departmentId } = req.query;
    const user = req.user!;

    // Employees can only see their own evaluations
    const evaluateeFilter =
      user.role === "EMPLOYEE" && user.employeeId
        ? { evaluateeId: user.employeeId }
        : employeeId
        ? { evaluateeId: String(employeeId) }
        : {};

    const evaluations = await prisma.evaluation.findMany({
      where: {
        ...evaluateeFilter,
        ...(status ? { status: status as any } : {}),
        ...(year ? { year: parseInt(String(year)) } : {}),
        ...(period ? { period: period as any } : {}),
        ...(departmentId
          ? { evaluatee: { departmentId: String(departmentId) } }
          : {}),
      },
      include: {
        evaluatee: { include: { department: true, user: { select: { name: true } } } },
        evaluator: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(evaluations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch evaluations" });
  }
};

export const getEvaluation = async (req: Request, res: Response): Promise<void> => {
  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: req.params.id },
      include: {
        evaluatee: { include: { department: true, user: { select: { name: true, email: true } } } },
        evaluator: { include: { user: { select: { name: true } } } },
        kpaScores: { orderBy: { kpaIndex: "asc" } },
        behavioralScores: { orderBy: { competencyIndex: "asc" } },
      },
    });
    if (!evaluation) { res.status(404).json({ error: "Evaluation not found" }); return; }
    res.json(evaluation);
  } catch {
    res.status(500).json({ error: "Failed to fetch evaluation" });
  }
};

export const createEvaluation = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createEvaluationSchema.parse(req.body);
    const { result, kpaScoreData, selfScoreData, supervisorScoreData } = computeAll(
      data.kpaScores,
      data.selfScores,
      data.supervisorScores,
      data.b3Score,
    );

    const evaluation = await prisma.evaluation.create({
      data: {
        evaluateeId: data.evaluateeId,
        evaluatorId: data.evaluatorId,
        period: data.period,
        year: data.year,
        supervisorComments: data.supervisorComments,
        employeeComments: data.employeeComments,

        // Calculated Part A
        partA_overallResult: result.partA_overallResult,
        partA_averagePoint: result.partA_averagePoint,

        // Calculated Part B
        partB1_total: result.partB1_total,
        partB1_weighted: result.partB1_weighted,
        partB2_total: result.partB2_total,
        partB2_weighted: result.partB2_weighted,
        partB3_rawScore: data.b3Score,
        partB3_weighted: result.partB3_weighted,

        finalScore: result.finalScore,
        ratingLabel: result.ratingLabel,

        // Related scores
        kpaScores: { create: kpaScoreData },
        behavioralScores: {
          create: [
            ...selfScoreData,
            ...supervisorScoreData,
            // B3 as single PEER record
            {
              assessorType: "PEER",
              score: data.b3Score,
              weightedPoint: result.partB3_weighted,
              notes: "B3 Additional 15%",
            },
          ],
        },
      },
      include: {
        kpaScores: true,
        behavioralScores: true,
        evaluatee: { include: { department: true } },
        evaluator: { include: { user: true } },
      },
    });

    res.status(201).json(evaluation);
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.errors[0].message }); return; }
    console.error(error);
    res.status(500).json({ error: "Failed to create evaluation" });
  }
};

export const updateEvaluation = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createEvaluationSchema.partial().parse(req.body);
    const existing = await prisma.evaluation.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: "Evaluation not found" }); return; }
    if (existing.status === "APPROVED") { res.status(400).json({ error: "Cannot edit an approved evaluation" }); return; }

    const kpaScores = data.kpaScores ?? [];
    const selfScores = data.selfScores ?? [];
    const supervisorScores = data.supervisorScores ?? [];
    const b3Score = data.b3Score ?? 3;

    const { result, kpaScoreData, selfScoreData, supervisorScoreData } = computeAll(
      kpaScores, selfScores, supervisorScores, b3Score,
    );

    // Delete old scores and recreate
    await prisma.$transaction([
      prisma.kpaScore.deleteMany({ where: { evaluationId: req.params.id } }),
      prisma.behavioralScore.deleteMany({ where: { evaluationId: req.params.id } }),
    ]);

    const evaluation = await prisma.evaluation.update({
      where: { id: req.params.id },
      data: {
        ...(data.period ? { period: data.period } : {}),
        ...(data.year ? { year: data.year } : {}),
        ...(data.supervisorComments !== undefined ? { supervisorComments: data.supervisorComments } : {}),
        ...(data.employeeComments !== undefined ? { employeeComments: data.employeeComments } : {}),
        partA_overallResult: result.partA_overallResult,
        partA_averagePoint: result.partA_averagePoint,
        partB1_total: result.partB1_total,
        partB1_weighted: result.partB1_weighted,
        partB2_total: result.partB2_total,
        partB2_weighted: result.partB2_weighted,
        partB3_rawScore: b3Score,
        partB3_weighted: result.partB3_weighted,
        finalScore: result.finalScore,
        ratingLabel: result.ratingLabel,
        kpaScores: { create: kpaScoreData },
        behavioralScores: {
          create: [
            ...selfScoreData,
            ...supervisorScoreData,
            { assessorType: "PEER", score: b3Score, weightedPoint: result.partB3_weighted, notes: "B3 Additional 15%" },
          ],
        },
      },
      include: { kpaScores: true, behavioralScores: true },
    });

    res.json(evaluation);
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.errors[0].message }); return; }
    res.status(500).json({ error: "Failed to update evaluation" });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["SUBMITTED"],
      SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
      UNDER_REVIEW: ["APPROVED", "REJECTED"],
      REJECTED: ["DRAFT"],
    };

    const evaluation = await prisma.evaluation.findUnique({ where: { id: req.params.id } });
    if (!evaluation) { res.status(404).json({ error: "Evaluation not found" }); return; }

    const allowed = validTransitions[evaluation.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: `Cannot transition from ${evaluation.status} to ${status}` });
      return;
    }

    const updated = await prisma.evaluation.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === "SUBMITTED" ? { submittedAt: new Date() } : {}),
        ...(status === "UNDER_REVIEW" ? { reviewedAt: new Date() } : {}),
        ...(status === "APPROVED" ? { approvedAt: new Date(), approvedById: req.user!.userId } : {}),
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update status" });
  }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const yearNum = year ? parseInt(String(year)) : new Date().getFullYear();

    const [
      totalEmployees,
      totalEvaluations,
      pendingEvaluations,
      approvedEvaluations,
      avgScoreResult,
      byDepartment,
      ratingDist,
    ] = await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.evaluation.count({ where: { year: yearNum } }),
      prisma.evaluation.count({ where: { year: yearNum, status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.evaluation.count({ where: { year: yearNum, status: "APPROVED" } }),
      prisma.evaluation.aggregate({ where: { year: yearNum, status: "APPROVED" }, _avg: { finalScore: true } }),
      prisma.evaluation.groupBy({
        by: ["evaluateeId"],
        where: { year: yearNum, status: "APPROVED" },
        _avg: { finalScore: true },
      }),
      prisma.evaluation.groupBy({
        by: ["ratingLabel"],
        where: { year: yearNum, status: "APPROVED" },
        _count: { ratingLabel: true },
      }),
    ]);

    // Top performers
    const topEvaluations = await prisma.evaluation.findMany({
      where: { year: yearNum, status: "APPROVED", finalScore: { not: null } },
      orderBy: { finalScore: "desc" },
      take: 5,
      include: { evaluatee: { include: { department: true, user: { select: { name: true } } } } },
    });

    res.json({
      totalEmployees,
      totalEvaluations,
      pendingEvaluations,
      approvedEvaluations,
      avgScore: Math.round((avgScoreResult._avg.finalScore ?? 0) * 100) / 100,
      topPerformers: topEvaluations,
      ratingDistribution: ratingDist,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

/** Live calculation endpoint – no DB write, just returns computed result */
export const previewCalculation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kpaScores, selfScores, supervisorScores, b3Score } = req.body;
    const result = calculateEvaluation({
      kpaScores: kpaScores ?? [],
      selfScores: selfScores ?? [],
      supervisorScores: supervisorScores ?? [],
      b3Score: b3Score ?? 3,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Invalid input for calculation" });
  }
};
