import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../utils/prisma";

const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["ADMIN", "SUPERVISOR", "EMPLOYEE"]).default("EMPLOYEE"),
  employeeCode: z.string().min(1),
  fullName: z.string().min(2),
  position: z.string().min(1),
  jobTitle: z.string().min(1),
  departmentId: z.string().min(1),
  supervisorId: z.string().optional().nullable(),
  hireDate: z.string().datetime(),
  phone: z.string().optional().nullable(),
});

const updateEmployeeSchema = createEmployeeSchema.partial().omit({ password: true, email: true });

export const getEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId, search, isActive } = req.query;
    const employees = await prisma.employee.findMany({
      where: {
        ...(departmentId ? { departmentId: String(departmentId) } : {}),
        ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
        ...(search ? {
          OR: [
            { fullName: { contains: String(search), mode: "insensitive" } },
            { employeeCode: { contains: String(search), mode: "insensitive" } },
            { position: { contains: String(search), mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        user: { select: { email: true, role: true, isActive: true } },
        department: true,
        supervisor: { include: { user: { select: { name: true } } } },
        _count: { select: { evaluationsReceived: true } },
      },
      orderBy: { fullName: "asc" },
    });
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

export const getEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true, role: true, isActive: true } },
        department: true,
        supervisor: { include: { user: { select: { name: true, email: true } } } },
        subordinates: { include: { user: { select: { name: true } } } },
        evaluationsReceived: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { evaluator: { include: { user: true } } },
        },
      },
    });
    if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }
    res.json(employee);
  } catch {
    res.status(500).json({ error: "Failed to fetch employee" });
  }
};

export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, password: hashedPassword, name: data.name, role: data.role },
      });
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode: data.employeeCode,
          fullName: data.fullName,
          position: data.position,
          jobTitle: data.jobTitle,
          departmentId: data.departmentId,
          supervisorId: data.supervisorId || null,
          hireDate: new Date(data.hireDate),
          phone: data.phone || null,
        },
        include: { department: true, user: { select: { email: true, role: true } } },
      });
      return employee;
    });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.errors[0].message }); return; }
    res.status(500).json({ error: "Failed to create employee" });
  }
};

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = updateEmployeeSchema.parse(req.body);
    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.position ? { position: data.position } : {}),
        ...(data.jobTitle ? { jobTitle: data.jobTitle } : {}),
        ...(data.departmentId ? { departmentId: data.departmentId } : {}),
        ...(data.supervisorId !== undefined ? { supervisorId: data.supervisorId || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.hireDate ? { hireDate: new Date(data.hireDate) } : {}),
      },
      include: { department: true, user: { select: { email: true, role: true } } },
    });
    res.json(employee);
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.errors[0].message }); return; }
    res.status(500).json({ error: "Failed to update employee" });
  }
};

export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const emp = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }
    await prisma.user.delete({ where: { id: emp.userId } });
    res.json({ message: "Employee deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete employee" });
  }
};

export const getDepartments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
    res.json(departments);
  } catch {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, description } = req.body;
    const dept = await prisma.department.create({ data: { name, code, description } });
    res.status(201).json(dept);
  } catch {
    res.status(500).json({ error: "Failed to create department" });
  }
};
