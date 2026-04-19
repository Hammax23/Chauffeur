"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldAlert, Mail, ArrowLeft, KeyRound } from "lucide-react";

interface AdminAuthProps {
  children: React.ReactNode;
}

type AuthStep = "password" | "otp";

export default function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attempting, setAttempting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Verify authentication on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await fetch("/api/admin/auth/verify", {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        setIsAuthenticated(data.authenticated === true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    verifyAuth();
  }, []);

  // Countdown timer for lockout
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

  // Step 1: Verify password and send OTP
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    
    setAttempting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

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
        setError(data.error || "Login failed. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setAttempting(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setAttempting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, otp }),
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setOtp("");
        setSessionId("");
      } else {
        setError(data.error || "Invalid code. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setAttempting(false);
    }
  };

  // Go back to password step
  const handleBack = () => {
    setAuthStep("password");
    setOtp("");
    setSessionId("");
    setError("");
    setSuccess("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A063]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1C1C1E] via-[#2C2C2E] to-[#1C1C1E] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Image 
                  src="/logo1.png" 
                  alt="SARJ Worldwide Logo" 
                  width={150}
                  height={75}
                  className="object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Admin Portal</h1>
              <p className="text-gray-400 text-sm">
                {authStep === "password" 
                  ? "Enter your credentials to access management panel" 
                  : "Enter the verification code sent to your email"}
              </p>
            </div>

            {/* Step 1: Password Form */}
            {authStep === "password" && (
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Admin Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="Enter admin email"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C9A063] focus:border-transparent transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="Enter admin password"
                      className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C9A063] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-500 hover:text-gray-300" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-500 hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>

                {isLocked && (
                  <div className="flex items-center gap-2 text-orange-400 text-sm bg-orange-500/10 px-4 py-3 rounded-xl border border-orange-500/20">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>Account locked. Try again in {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}

                {error && !isLocked && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={attempting || !email || !password || isLocked}
                  className="w-full py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {attempting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send Verification Code
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: OTP Form */}
            {authStep === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => { 
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(val); 
                        setError(""); 
                      }}
                      placeholder="Enter 6-digit code"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C9A063] focus:border-transparent transition-all text-center text-2xl tracking-[0.5em] font-mono"
                      autoFocus
                      maxLength={6}
                    />
                  </div>
                </div>

                {success && (
                  <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 px-4 py-3 rounded-xl border border-green-500/20">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    {success}
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={attempting || otp.length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {attempting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Access Admin Panel
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full py-3 text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Password
                </button>
              </form>
            )}

            {/* Footer */}
            <p className="text-center text-gray-500 text-xs mt-6">
              🔐 Two-Factor Authentication Enabled
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pass logout function to children via context or props if needed
  return <>{children}</>;
}

// Export logout function for use in AdminLayout
export function useAdminLogout() {
  return async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Continue with redirect even if API fails
    }
    window.location.href = "/admin";
  };
}
