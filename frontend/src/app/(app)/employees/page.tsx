"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi, departmentApi, Employee, Department, CreateEmployeeData } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Users, Plus, Search, Eye, Trash2, UserCheck, UserX,
  Building2, Phone, Mail, Calendar, X, ChevronRight,
} from "lucide-react";
import dayjs from "dayjs";

function CreateEmployeeModal({ departments, onClose, onSuccess }: {
  departments: Department[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateEmployeeData>({
    email: "", password: "", name: "", role: "EMPLOYEE",
    employeeCode: "", fullName: "", position: "", jobTitle: "",
    departmentId: "", supervisorId: "", hireDate: "", phone: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => employeeApi.list(),
  });

  const supervisors = (employees ?? []).filter(
    (e) => e.user?.role === "SUPERVISOR" || e.user?.role === "ADMIN"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await employeeApi.create({
        ...form,
        hireDate: new Date(form.hireDate).toISOString(),
        supervisorId: form.supervisorId || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create employee");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, key: keyof CreateEmployeeData, type = "text", required = true) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}{required && " *"}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={required}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-slate-900 text-lg">Add New Employee</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Details</p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {field("Full Name (Display)", "name")}
              {field("Email Address", "email", "email")}
              {field("Password", "password", "password")}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="EMPLOYEE">Employee</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee Profile</p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {field("Employee Code", "employeeCode")}
              {field("Full Legal Name", "fullName")}
              {field("Position", "position")}
              {field("Job Title", "jobTitle")}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Department *</label>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select department…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Supervisor</label>
                <select value={form.supervisorId} onChange={(e) => setForm({ ...form, supervisorId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">None</option>
                  {supervisors.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              {field("Hire Date", "hireDate", "date")}
              {field("Phone", "phone", "tel", false)}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-700 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60">
              {submitting ? "Creating…" : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["employees", deptFilter],
    queryFn: () => employeeApi.list(deptFilter ? { departmentId: deptFilter } : {}),
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: departmentApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const filtered = (employees ?? []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {showModal && (
        <CreateEmployeeModal
          departments={departments ?? []}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Employees
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} employee(s)</p>
        </div>
        {user?.role === "ADMIN" && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search by name, code, position…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Departments</option>
          {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div key={emp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 text-lg font-bold flex items-center justify-center flex-shrink-0">
                      {emp.fullName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{emp.fullName}</p>
                      <p className="text-xs text-slate-400 font-mono">{emp.employeeCode}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {emp.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{emp.department?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{emp.jobTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{emp.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Joined {dayjs(emp.hireDate).format("MMM D, YYYY")}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">{emp._count?.evaluationsReceived ?? 0} evaluations</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/employees/${emp.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {user?.role === "ADMIN" && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${emp.fullName}? This cannot be undone.`))
                            deleteMutation.mutate(emp.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
