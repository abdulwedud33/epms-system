import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding EPMS database...");

  // ── Departments ──────────────────────────────────────────────────────────────
  const depts = await Promise.all([
    prisma.department.upsert({ where: { code: "ICT" }, update: {}, create: { name: "ICT & Systems Development", code: "ICT", description: "Information and Communication Technology" } }),
    prisma.department.upsert({ where: { code: "HR" }, update: {}, create: { name: "Human Resources", code: "HR", description: "Human Resources Management" } }),
    prisma.department.upsert({ where: { code: "FIN" }, update: {}, create: { name: "Finance & Accounting", code: "FIN", description: "Finance and Budget Management" } }),
    prisma.department.upsert({ where: { code: "ACAD" }, update: {}, create: { name: "Academic Affairs", code: "ACAD", description: "Academic Programs and Affairs" } }),
    prisma.department.upsert({ where: { code: "PLAN" }, update: {}, create: { name: "Planning & Development", code: "PLAN", description: "Strategic Planning and Development" } }),
  ]);
  const [ictDept, hrDept, finDept, acadDept, planDept] = depts;
  console.log("✅ Departments created");

  // ── Users & Employees ────────────────────────────────────────────────────────
  const hash = async (p: string) => bcrypt.hash(p, 10);

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@astu.edu.et" }, update: {},
    create: { email: "admin@astu.edu.et", name: "System Administrator", password: await hash("admin123"), role: "ADMIN" },
  });
  await prisma.employee.upsert({
    where: { employeeCode: "ASTU-000" }, update: {},
    create: {
      userId: adminUser.id, employeeCode: "ASTU-000", fullName: "System Administrator",
      position: "System Administrator", jobTitle: "IT Administrator",
      departmentId: ictDept.id, hireDate: new Date("2018-01-01"),
    },
  });

  // Supervisor 1 (ICT Head)
  const supUser1 = await prisma.user.upsert({
    where: { email: "abebe.bekele@astu.edu.et" }, update: {},
    create: { email: "abebe.bekele@astu.edu.et", name: "Abebe Bekele", password: await hash("super123"), role: "SUPERVISOR" },
  });
  const supervisor1 = await prisma.employee.upsert({
    where: { employeeCode: "ASTU-001" }, update: {},
    create: {
      userId: supUser1.id, employeeCode: "ASTU-001", fullName: "Abebe Bekele",
      position: "Department Head", jobTitle: "Senior Software Engineer",
      departmentId: ictDept.id, hireDate: new Date("2015-03-15"),
    },
  });

  // Supervisor 2 (HR Head)
  const supUser2 = await prisma.user.upsert({
    where: { email: "tigist.haile@astu.edu.et" }, update: {},
    create: { email: "tigist.haile@astu.edu.et", name: "Tigist Haile", password: await hash("super123"), role: "SUPERVISOR" },
  });
  const supervisor2 = await prisma.employee.upsert({
    where: { employeeCode: "ASTU-002" }, update: {},
    create: {
      userId: supUser2.id, employeeCode: "ASTU-002", fullName: "Tigist Haile",
      position: "HR Manager", jobTitle: "Human Resources Manager",
      departmentId: hrDept.id, hireDate: new Date("2016-07-20"),
    },
  });

  // Employees under ICT
  const empData = [
    { email: "Abdulwedud.Yassin@astu.edu.et", name: "Abdulwedud Yassin", code: "ASTU-101", position: "Software Developer", title: "Junior Developer", deptId: ictDept.id, supId: supervisor1.id },
    { email: "Ayub.Nasir@astu.edu.et", name: "Ayub Nasir", code: "ASTU-102", position: "Systems Analyst", title: "Systems Analyst", deptId: ictDept.id, supId: supervisor1.id },
    { email: "Abinet.girma@astu.edu.et", name: "Abinet Girma", code: "ASTU-103", position: "Database Administrator", title: "DBA", deptId: ictDept.id, supId: supervisor1.id },
    { email: "Salahudin.Kadi@astu.edu.et", name: "Salahudin Kadi", code: "ASTU-104", position: "IT Support Specialist", title: "IT Support", deptId: ictDept.id, supId: supervisor1.id },
    // HR employees
    { email: "hana.worku@astu.edu.et", name: "Hana Worku", code: "ASTU-201", position: "HR Officer", title: "HR Officer", deptId: hrDept.id, supId: supervisor2.id },
    { email: "bereket.sisay@astu.edu.et", name: "Bereket Sisay", code: "ASTU-202", position: "Recruitment Specialist", title: "Recruitment Specialist", deptId: hrDept.id, supId: supervisor2.id },
    // Finance
    { email: "selam.bekele@astu.edu.et", name: "Selam Bekele", code: "ASTU-301", position: "Accountant", title: "Senior Accountant", deptId: finDept.id, supId: null },
    // Planning
    { email: "kidus.mengistu@astu.edu.et", name: "Kidus Mengistu", code: "ASTU-401", position: "Planning Officer", title: "Strategic Planning Officer", deptId: planDept.id, supId: null },
  ];

  const employees: any[] = [];
  for (const e of empData) {
    const u = await prisma.user.upsert({
      where: { email: e.email }, update: {},
      create: { email: e.email, name: e.name, password: await hash("emp123"), role: "EMPLOYEE" },
    });
    const emp = await prisma.employee.upsert({
      where: { employeeCode: e.code }, update: {},
      create: {
        userId: u.id, employeeCode: e.code, fullName: e.name,
        position: e.position, jobTitle: e.title,
        departmentId: e.deptId, supervisorId: e.supId,
        hireDate: new Date("2020-09-01"),
      },
    });
    employees.push(emp);
  }
  console.log("✅ Users & employees created");

  // ── Sample Evaluations ───────────────────────────────────────────────────────
  // Evaluate Dawit Tadesse (employees[0]) by supervisor1 for ANNUAL 2024
  const dawit = employees[0];

  // Check if already exists
  const existingEval = await prisma.evaluation.findFirst({
    where: { evaluateeId: dawit.id, period: "ANNUAL", year: 2024 },
  });

  if (!existingEval) {
    // Part A KPA scores (matching spec example: Overall ≈ 22, Average ≈ 66.5)
    const kpaScoreInputs = [
      { kpaIndex: 1, score: 3 }, // weight 25% → 3 × 0.25 × 10 = 7.5
      { kpaIndex: 2, score: 3 }, // weight 25% → 7.5
      { kpaIndex: 3, score: 2 }, // weight 10% → 2.0
      { kpaIndex: 4, score: 2 }, // weight 10% → 2.0
      { kpaIndex: 5, score: 2 }, // weight 20% → 4.0
      { kpaIndex: 6, score: 3 }, // weight 10% → 3.0  → total = 26 (not 22 but close)
    ];

    const selfScoreInputs = [
      { competencyIndex: 1, score: 3 },
      { competencyIndex: 2, score: 3 },
      { competencyIndex: 3, score: 2 },
      { competencyIndex: 4, score: 3 },
      { competencyIndex: 5, score: 2 },
      { competencyIndex: 6, score: 3 },
    ];

    const supervisorScoreInputs = [
      { competencyIndex: 1, score: 3 },
      { competencyIndex: 2, score: 4 },
      { competencyIndex: 3, score: 3 },
      { competencyIndex: 4, score: 3 },
      { competencyIndex: 5, score: 3 },
      { competencyIndex: 6, score: 3 },
    ];

    const { calculateEvaluation, KPA_ITEMS, BEHAVIORAL_COMPETENCIES } = await import("../src/utils/calculations");
    const result = calculateEvaluation({
      kpaScores: kpaScoreInputs,
      selfScores: selfScoreInputs,
      supervisorScores: supervisorScoreInputs,
      b3Score: 3,
    });

    await prisma.evaluation.create({
      data: {
        evaluateeId: dawit.id,
        evaluatorId: supervisor1.id,
        period: "ANNUAL",
        year: 2024,
        status: "APPROVED",
        supervisorComments: "Dawit has shown consistent performance in system maintenance. Needs to improve on time management and documentation.",
        employeeComments: "I acknowledge this evaluation and commit to addressing the highlighted improvement areas.",
        partA_overallResult: result.partA_overallResult,
        partA_averagePoint: result.partA_averagePoint,
        partB1_total: result.partB1_total,
        partB1_weighted: result.partB1_weighted,
        partB2_total: result.partB2_total,
        partB2_weighted: result.partB2_weighted,
        partB3_rawScore: 3,
        partB3_weighted: result.partB3_weighted,
        finalScore: result.finalScore,
        ratingLabel: result.ratingLabel,
        submittedAt: new Date("2024-12-15"),
        reviewedAt: new Date("2024-12-18"),
        approvedAt: new Date("2024-12-20"),
        kpaScores: {
          create: kpaScoreInputs.map((s) => {
            const kpa = KPA_ITEMS.find((k) => k.index === s.kpaIndex)!;
            const item = result.kpaItems.find((i) => i.kpaIndex === s.kpaIndex)!;
            return { kpaIndex: s.kpaIndex, kpaLabel: kpa.label, weight: kpa.weight, score: s.score, weightedPoint: item.weightedPoint };
          }),
        },
        behavioralScores: {
          create: [
            ...selfScoreInputs.map((s) => {
              const comp = BEHAVIORAL_COMPETENCIES.find((c) => c.index === s.competencyIndex)!;
              const item = result.b1Items.find((i) => i.competencyIndex === s.competencyIndex)!;
              return { assessorType: "SELF", competencyIndex: s.competencyIndex, competencyLabel: comp.label, weight: comp.weight, score: s.score, weightedPoint: item.weightedPoint };
            }),
            ...supervisorScoreInputs.map((s) => {
              const comp = BEHAVIORAL_COMPETENCIES.find((c) => c.index === s.competencyIndex)!;
              const item = result.b2Items.find((i) => i.competencyIndex === s.competencyIndex)!;
              return { assessorType: "SUPERVISOR", competencyIndex: s.competencyIndex, competencyLabel: comp.label, weight: comp.weight, score: s.score, weightedPoint: item.weightedPoint };
            }),
            { assessorType: "PEER", score: 3, weightedPoint: result.partB3_weighted, notes: "B3 Additional 15%" },
          ],
        },
      },
    });
    console.log("✅ Sample evaluation created for Dawit Tadesse");
  }

  console.log("\n🎉 Seeding complete!\n");
  console.log("Default credentials:");
  console.log("  Admin:      admin@astu.edu.et     / admin123");
  console.log("  Supervisor: abebe.bekele@astu.edu.et / super123");
  console.log("  Employee:   dawit.tadesse@astu.edu.et / emp123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
