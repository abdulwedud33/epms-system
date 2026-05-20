const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(res.status, err.error || "Request failed");
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: User; message: string }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),
  me: () => apiFetch<User>("/auth/me"),
};

// ─── Employees ───────────────────────────────────────────────────────────────
export const employeeApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<Employee[]>(`/employees?${new URLSearchParams(params).toString()}`),
  get: (id: string) => apiFetch<Employee>(`/employees/${id}`),
  create: (data: CreateEmployeeData) =>
    apiFetch<Employee>("/employees", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateEmployeeData>) =>
    apiFetch<Employee>(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/employees/${id}`, { method: "DELETE" }),
};

// ─── Departments ─────────────────────────────────────────────────────────────
export const departmentApi = {
  list: () => apiFetch<Department[]>("/departments"),
  create: (data: { name: string; code: string; description?: string }) =>
    apiFetch<Department>("/departments", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Evaluations ─────────────────────────────────────────────────────────────
export const evaluationApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<Evaluation[]>(`/evaluations?${new URLSearchParams(params).toString()}`),
  get: (id: string) => apiFetch<Evaluation>(`/evaluations/${id}`),
  create: (data: CreateEvaluationData) =>
    apiFetch<Evaluation>("/evaluations", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateEvaluationData>) =>
    apiFetch<Evaluation>(`/evaluations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    apiFetch<Evaluation>(`/evaluations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ─── Stats ───────────────────────────────────────────────────────────────────
export const statsApi = {
  get: (year?: number) => apiFetch<DashboardStats>(`/stats${year ? `?year=${year}` : ""}`),
};

// ─── Types ───────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SUPERVISOR" | "EMPLOYEE";
  avatar?: string;
  isActive: boolean;
  employee?: Employee;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  _count?: { employees: number };
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  position: string;
  jobTitle: string;
  departmentId: string;
  department: Department;
  supervisorId?: string;
  supervisor?: { id: string; fullName: string; user: { name: string } };
  hireDate: string;
  isActive: boolean;
  phone?: string;
  user: { email: string; role: string; isActive: boolean };
  _count?: { evaluationsReceived: number };
}

export interface KpaScore {
  id: string;
  kpaIndex: number;
  kpaLabel: string;
  weight: number;
  score: number;
  weightedPoint: number;
  notes?: string;
}

export interface BehavioralScore {
  id: string;
  assessorType: "SELF" | "SUPERVISOR" | "PEER";
  competencyIndex?: number;
  competencyLabel?: string;
  weight?: number;
  score: number;
  weightedPoint?: number;
  notes?: string;
}

export interface Evaluation {
  id: string;
  evaluateeId: string;
  evaluatee: Employee;
  evaluatorId: string;
  evaluator: Employee;
  period: "Q1" | "Q2" | "Q3" | "Q4" | "ANNUAL" | "MIDYEAR";
  year: number;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  kpaScores: KpaScore[];
  behavioralScores: BehavioralScore[];
  partA_overallResult?: number;
  partA_averagePoint?: number;
  partB1_total?: number;
  partB1_weighted?: number;
  partB2_total?: number;
  partB2_weighted?: number;
  partB3_rawScore?: number;
  partB3_weighted?: number;
  finalScore?: number;
  ratingLabel?: string;
  supervisorComments?: string;
  employeeComments?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeData {
  email: string;
  password: string;
  name: string;
  role: "ADMIN" | "SUPERVISOR" | "EMPLOYEE";
  employeeCode: string;
  fullName: string;
  position: string;
  jobTitle: string;
  departmentId: string;
  supervisorId?: string;
  hireDate: string;
  phone?: string;
}

export interface CreateEvaluationData {
  evaluateeId: string;
  evaluatorId: string;
  period: string;
  year: number;
  kpaScores: { kpaIndex: number; score: number; notes?: string }[];
  selfScores: { competencyIndex: number; score: number }[];
  supervisorScores: { competencyIndex: number; score: number }[];
  b3Score: number;
  supervisorComments?: string;
  employeeComments?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  totalEvaluations: number;
  pendingEvaluations: number;
  approvedEvaluations: number;
  avgScore: number;
  topPerformers: Evaluation[];
  ratingDistribution: { ratingLabel: string; _count: { ratingLabel: number } }[];
}
