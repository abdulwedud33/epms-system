import { Router } from "express";
import { login, logout, me } from "../controllers/auth.controller";
import { authenticate, requireAdmin, requireSupervisorOrAdmin } from "../middleware/auth.middleware";
import {
  getEmployees, getEmployee, createEmployee, updateEmployee,
  deleteEmployee, getDepartments, createDepartment,
} from "../controllers/employee.controller";
import {
  getEvaluations, getEvaluation, createEvaluation, updateEvaluation,
  updateStatus, getStats, previewCalculation,
} from "../controllers/evaluation.controller";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/auth/me", authenticate, me);

// ── Departments ───────────────────────────────────────────────────────────────
router.get("/departments", authenticate, getDepartments);
router.post("/departments", authenticate, requireAdmin, createDepartment);

// ── Employees ─────────────────────────────────────────────────────────────────
router.get("/employees", authenticate, getEmployees);
router.get("/employees/:id", authenticate, getEmployee);
router.post("/employees", authenticate, requireAdmin, createEmployee);
router.put("/employees/:id", authenticate, requireSupervisorOrAdmin, updateEmployee);
router.delete("/employees/:id", authenticate, requireAdmin, deleteEmployee);

// ── Evaluations ───────────────────────────────────────────────────────────────
router.get("/evaluations", authenticate, getEvaluations);
router.get("/evaluations/:id", authenticate, getEvaluation);
router.post("/evaluations", authenticate, requireSupervisorOrAdmin, createEvaluation);
router.put("/evaluations/:id", authenticate, requireSupervisorOrAdmin, updateEvaluation);
router.patch("/evaluations/:id/status", authenticate, updateStatus);
router.post("/evaluations/preview", authenticate, previewCalculation);

// ── Reports / Stats ───────────────────────────────────────────────────────────
router.get("/stats", authenticate, getStats);

export default router;
