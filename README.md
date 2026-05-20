# EPMS – Employee Performance Management System

A production-ready full-stack performance evaluation system for **Adama Science and Technology University (ASTU)** civil service employees, implementing the standard Ethiopian civil service performance appraisal methodology.

---

## 📐 Scoring Methodology

### Part A – Technical KPA (70%)

| # | Key Performance Area | Weight |
|---|---------------------|--------|
| 1 | HRMS, Attendance, Transport, Clinic System Support | 25% |
| 2 | Community & Special School System + Training | 25% |
| 3 | Employee ID Cards + System Improvement | 10% |
| 4 | ASTU Academic Staff Profile System | 10% |
| 5 | Stock & Gate Pass Management System | 20% |
| 6 | Strategic & Data Management System | 10% |

- **Score scale:** 1–4 (Unsatisfactory → Exceeds Expectations)
- **Weighted Point** = score × weight × 10
- **Overall Result** = Σ(weighted points) — max 40
- **Average Point** = (Overall Result / 40) × 100 — as percentage
- **Part A contribution** = Average Point × 70%

### Part B – Behavioral Assessment (30%)

#### B1 – Self Assessment (5%)
#### B2 – Supervisor Behavioral (10%)
Both use the same 6 competencies (1–4 scale):

| # | Competency | Weight |
|---|-----------|--------|
| 1 | Eliminate discrimination, bias, misconduct | 25% |
| 2 | Enhance competency | 20% |
| 3 | Honor & recognition | 15% |
| 4 | Support and empower others | 15% |
| 5 | Improve processes & sustainability | 15% |
| 6 | Timely performance feedback | 10% |

#### B3 – Additional 15% (1–5 scale)
Peer / 360° assessment normalised to 0–100.

### Final Score Formula
```
Final = (PartA_avg × 70%) + (B1_percent × 5%) + (B2_percent × 10%) + (B3_percent × 15%)
```

### Rating Scale
| Score | Rating |
|-------|--------|
| 90–100 | Outstanding |
| 75–89 | Excellent |
| 60–74 | Very Good |
| 45–59 | Good |
| 30–44 | Needs Improvement |
| 0–29 | Unsatisfactory |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Recharts |
| State | TanStack Query v5 |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL (Neon) + Prisma ORM |
| Auth | JWT + httpOnly cookies |
| Validation | Zod |

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or [Neon](https://neon.tech))

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET in .env

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev        # Runs on :5000
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local

npm install
npm run dev        # Runs on :3000
```

---

## 👤 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@astu.edu.et | admin123 |
| Supervisor | abebe.bekele@astu.edu.et | super123 |
| Employee | dawit.tadesse@astu.edu.et | emp123 |

---

## 📁 Project Structure

```
epms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Full DB schema (8 models)
│   │   └── seed.ts              # Sample data (ASTU departments + employees)
│   └── src/
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── employee.controller.ts
│       │   └── evaluation.controller.ts   # Full scoring logic
│       ├── middleware/
│       │   └── auth.middleware.ts         # JWT + role guards
│       ├── routes/index.ts
│       └── utils/
│           ├── calculations.ts            # ← Core scoring engine
│           ├── jwt.ts
│           └── prisma.ts
│
└── frontend/
    └── src/
        ├── app/
        │   ├── login/page.tsx             # Branded login
        │   └── (app)/
        │       ├── layout.tsx             # Sidebar navigation
        │       ├── dashboard/page.tsx     # Stats + charts
        │       ├── employees/
        │       │   ├── page.tsx           # Employee grid + CRUD
        │       │   └── [id]/page.tsx      # Employee profile + history
        │       ├── evaluations/
        │       │   ├── page.tsx           # List + filters + workflow
        │       │   ├── new/page.tsx       # ← Full evaluation form (real-time calc)
        │       │   └── [id]/page.tsx      # Detailed score breakdown
        │       └── reports/page.tsx       # Analytics + charts
        ├── hooks/use-auth.tsx
        └── lib/
            ├── api.ts                     # Typed API client
            ├── calculations.ts            # ← Frontend scoring (mirrors backend)
            └── utils.ts
```

---

## 🔌 API Reference

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user

### Employees
- `GET /api/employees` — List (with filters: departmentId, search, isActive)
- `GET /api/employees/:id` — Detail
- `POST /api/employees` — Create (Admin only)
- `PUT /api/employees/:id` — Update
- `DELETE /api/employees/:id` — Delete (Admin only)

### Departments
- `GET /api/departments` — List
- `POST /api/departments` — Create (Admin)

### Evaluations
- `GET /api/evaluations` — List (with filters: status, period, year, employeeId)
- `GET /api/evaluations/:id` — Detail with all scores
- `POST /api/evaluations` — Create with auto-calculation
- `PUT /api/evaluations/:id` — Update scores (recalculates)
- `PATCH /api/evaluations/:id/status` — Workflow transition
- `POST /api/evaluations/preview` — Live calculation (no DB write)

### Stats
- `GET /api/stats?year=2024` — Dashboard statistics

---

## 📊 Evaluation Workflow

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED
                 ↘              ↘
                  REJECTED        REJECTED
```

---

## 🔒 Role Permissions

| Action | ADMIN | SUPERVISOR | EMPLOYEE |
|--------|-------|-----------|---------|
| View all evaluations | ✅ | ✅ | Own only |
| Create evaluation | ✅ | ✅ | ❌ |
| Manage employees | ✅ | View only | Own profile |
| Approve evaluations | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ❌ |
