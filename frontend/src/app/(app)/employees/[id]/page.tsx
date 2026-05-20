"use client";

import { useQuery } from "@tanstack/react-query";
import { employeeApi, evaluationApi, Employee, Evaluation } from "@/lib/api";
import { getRatingBadgeClass, getStatusBadgeClass } from "@/lib/calculations";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Building2, User, Mail,
  Phone, Calendar, Award, ClipboardList, Users,
} from "lucide-react";
import dayjs from "dayjs";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: ["employee", id],
    queryFn: () => employeeApi.get(id),
  });

  const { data: evaluations } = useQuery<Evaluation[]>({
    queryKey: ["evaluations", "employee", id],
    queryFn: () => evaluationApi.list({ employeeId: id }),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    );
  }
  if (!employee) return <div className="p-8 text-center text-slate-500">Employee not found.</div>;

  const bestScore = (evaluations ?? [])
    .filter((e) => e.finalScore != null)
    .reduce<number | null>((best, e) => (e.finalScore! > (best ?? 0) ? e.finalScore! : best), null);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/employees" className="flex items-center gap-1 text-slate-500 hover:text-blue-600">
          <ChevronLeft className="w-4 h-4" /> Employees
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-700">{employee.fullName}</span>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 border-4 border-white text-blue-700 text-2xl font-bold flex items-center justify-center shadow-md">
              {employee.fullName[0]}
            </div>
            <div className="mb-1">
              <h1 className="text-xl font-bold text-slate-900">{employee.fullName}</h1>
              <p className="text-slate-500 text-sm">{employee.jobTitle} · {employee.position}</p>
            </div>
            <div className="ml-auto mb-1">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${employee.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {employee.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <InfoItem icon={Building2} label="Department" value={employee.department?.name} />
            <InfoItem icon={Mail} label="Email" value={employee.user?.email} />
            <InfoItem icon={User} label="Employee Code" value={employee.employeeCode} mono />
            <InfoItem icon={Calendar} label="Hire Date" value={dayjs(employee.hireDate).format("MMM D, YYYY")} />
            {employee.phone && <InfoItem icon={Phone} label="Phone" value={employee.phone} />}
            {employee.supervisor && (
              <InfoItem icon={Users} label="Supervisor" value={employee.supervisor.fullName} />
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <ClipboardList className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-slate-900">{(evaluations ?? []).length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Evaluations</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <Award className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-slate-900">
            {bestScore != null ? bestScore.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Best Score</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <User className="w-5 h-5 text-violet-600 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-slate-900">{employee.user?.role}</p>
          <p className="text-xs text-slate-500 mt-0.5">System Role</p>
        </div>
      </div>

      {/* Evaluation History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Evaluation History</h2>
          <Link href={`/evaluations/new?employeeId=${employee.id}`}
            className="text-xs text-blue-600 hover:underline">+ New Evaluation</Link>
        </div>
        {(evaluations ?? []).length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No evaluations on record</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(evaluations ?? []).map((ev) => (
              <Link key={ev.id} href={`/evaluations/${ev.id}`}
                className="flex items-center px-6 py-4 hover:bg-slate-50 transition-colors gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800 text-sm">{ev.period} {ev.year}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(ev.status)}`}>
                      {ev.status.replace("_", " ")}
                    </span>
                    {ev.ratingLabel && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRatingBadgeClass(ev.ratingLabel)}`}>
                        {ev.ratingLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluated by {ev.evaluator?.fullName} · {dayjs(ev.createdAt).format("MMM D, YYYY")}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-slate-800">
                    {ev.finalScore != null ? ev.finalScore.toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-slate-400">/ 100</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, mono = false }: {
  icon: any; label: string; value?: string | null; mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className={`text-slate-800 text-sm font-medium ${mono ? "font-mono" : ""} truncate`}>
        {value ?? "—"}
      </p>
    </div>
  );
}
