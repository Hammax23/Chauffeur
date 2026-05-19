"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, LogOut, ListChecks, FilePenLine } from "lucide-react";

export default function OperationalManagerAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/operational-manager/auth/verify", {
          credentials: "include",
        });
        const data = await res.json();
        setAuthenticated(data.authenticated === true);
      } catch {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/operational-manager/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
        setPassword("");
        setEmail("");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/operational-manager/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-10 h-10 animate-spin text-[#C9A063]" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-gray-900 [color-scheme:light]">
          <div className="flex justify-center mb-6">
            <Image src="/logo1.png" alt="SARJ Worldwide" width={160} height={54} className="h-auto w-[140px]" />
          </div>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#8f6f3a] mb-2">
            Operational Manager
          </p>
          <h1 className="text-xl font-bold text-center text-gray-900 mb-1">Reservation assignments</h1>
          <p className="text-sm text-center text-gray-600 mb-8 leading-relaxed">
            Use the email and password your administrator created for you in the admin panel.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#111827]"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#111827]"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#C9A063] text-white font-semibold hover:bg-[#B8904F] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              Sign in
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 [color-scheme:light]">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/logo1.png" alt="" width={120} height={40} className="h-8 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">Operational Manager</p>
              <p className="text-xs text-gray-600 truncate">Reservations & assignments</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/operational-manager"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border ${
                pathname === "/operational-manager"
                  ? "border-[#C9A063] bg-[#C9A063]/10 text-gray-900"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ListChecks className="w-4 h-4 shrink-0" />
              Assignments
            </Link>
            <Link
              href="/operational-manager/custom-reservation"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border ${
                pathname === "/operational-manager/custom-reservation"
                  ? "border-[#C9A063] bg-[#C9A063]/10 text-gray-900"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FilePenLine className="w-4 h-4 shrink-0" />
              Custom reservation
            </Link>
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0 sm:self-start"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
