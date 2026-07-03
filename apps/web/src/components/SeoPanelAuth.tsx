"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldAlert, Mail, ArrowLeft, KeyRound,
} from "lucide-react";
import SeoPanelLayout from "@/components/SeoPanelLayout";

type AuthStep = "password" | "otp";

export default function SeoPanelAuth({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    fetch("/api/seopanel/auth/verify", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuthenticated(d.authenticated === true))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/seopanel/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setAuthStep("otp");
        setSuccess("Verification code sent to admin email");
        setPassword("");
      } else {
        if (data.locked) {
          setIsLocked(true);
          setLockoutTime(data.remainingTime || 900);
        }
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/seopanel/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, otp }),
      });
      const data = await res.json();

      if (data.success) {
        setAuthenticated(true);
        setOtp("");
        setSessionId("");
      } else {
        setError(data.error || "Invalid code");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setAuthStep("password");
    setOtp("");
    setSessionId("");
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1419]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-gray-900">
          <div className="flex justify-center mb-6">
            <Image src="/logo1.png" alt="SARJ Worldwide" width={160} height={54} className="h-auto w-[140px]" />
          </div>
          <p className="text-center text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">SEO Command Center</p>
          <h1 className="text-xl font-bold text-center text-gray-900 mb-1">Enterprise SEO Panel</h1>
          <p className="text-sm text-center text-gray-500 mb-8">
            {authStep === "password"
              ? "Use the same admin email & password as the admin panel"
              : "Enter the verification code sent to your admin email"}
          </p>

          {authStep === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    placeholder="admin@sarjworldwide.ca"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    placeholder="Admin password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isLocked && (
                <div className="flex items-center gap-2 text-orange-600 text-sm bg-orange-50 px-3 py-2 rounded-lg">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Try again in {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, "0")}
                </div>
              )}
              {error && !isLocked && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || isLocked}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              {success && (
                <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 px-3 py-2 rounded-lg">
                  <Mail className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    placeholder="000000"
                    autoFocus
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Sign In"}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  return <SeoPanelLayout>{children}</SeoPanelLayout>;
}
