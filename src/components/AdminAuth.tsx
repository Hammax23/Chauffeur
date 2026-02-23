"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "sarj@admin2024";

interface AdminAuthProps {
  children: React.ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [attempting, setAttempting] = useState(false);

  useEffect(() => {
    const authToken = localStorage.getItem("sarj_admin_auth");
    if (authToken === "authenticated") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempting(true);
    setError("");

    // Simulate slight delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("sarj_admin_auth", "authenticated");
      setIsAuthenticated(true);
    } else {
      setError("Incorrect password. Please try again.");
    }
    setAttempting(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("sarj_admin_auth");
    setIsAuthenticated(false);
    setPassword("");
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
              <p className="text-gray-400 text-sm">Enter password to access management panel</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
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
                    autoFocus
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

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={attempting || !password}
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
            </form>

            {/* Footer */}
            <p className="text-center text-gray-500 text-xs mt-6">
              Protected area. Unauthorized access prohibited.
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
  return () => {
    localStorage.removeItem("sarj_admin_auth");
    window.location.reload();
  };
}
