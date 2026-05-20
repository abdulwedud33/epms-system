"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { Building2, Lock, Mail, AlertCircle, BarChart3 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: "48px 48px" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">EPMS</p>
              <p className="text-blue-300 text-xs">Performance Management</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Employee Performance<br />Management System
            </h1>
            <p className="text-blue-200 text-lg">
              Adama Science and Technology University<br />Civil Service Evaluation Platform
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Part A – Technical", value: "70%", desc: "KPA-based evaluation" },
              { label: "Part B – Behavioral", value: "30%", desc: "360° assessment" },
              { label: "6 KPA Areas", value: "Fixed", desc: "Weighted scoring" },
              { label: "Workflow", value: "4-step", desc: "Draft → Approved" },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                <p className="text-blue-300 text-xs">{item.label}</p>
                <p className="text-white text-xl font-bold">{item.value}</p>
                <p className="text-blue-400 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 text-blue-400 text-xs">
            <Building2 className="w-4 h-4" />
            <span>ASTU – Adama, Ethiopia</span>
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">EPMS</p>
              <p className="text-blue-300 text-xs">Performance Management</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Sign In</h2>
              <p className="text-blue-300 text-sm mt-1">Access your evaluation dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-300 text-sm border border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm text-blue-200">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@astu.edu.et"
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-blue-400/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-blue-200">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-blue-400/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-xs text-blue-400 text-center mb-3">Demo credentials</p>
              <div className="space-y-2 text-xs text-blue-300">
                {[
                  { role: "Admin", email: "admin@astu.edu.et", pass: "admin123" },
                  { role: "Supervisor", email: "abebe.bekele@astu.edu.et", pass: "super123" },
                  { role: "Employee", email: "Abdulwedud.Yassin@astu.edu.et", pass: "emp123" },
                ].map((c) => (
                  <button key={c.role} onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                    className="w-full flex justify-between items-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left border border-white/10">
                    <span className="font-medium text-white">{c.role}</span>
                    <span className="text-blue-400">{c.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
