import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  ConciergeProfile,
  getConciergeToken,
  getStoredConcierge,
  clearConciergeSession,
  persistConciergeProfile,
  loginConcierge,
  logoutConcierge,
  getConciergeMe,
  onUnauthorized,
} from "../services/api";

interface ConciergeAuthContextType {
  concierge: ConciergeProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ConciergeAuthContext = createContext<ConciergeAuthContextType | undefined>(undefined);

export function ConciergeAuthProvider({ children }: { children: React.ReactNode }) {
  const [concierge, setConcierge] = useState<ConciergeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return onUnauthorized((role) => {
      if (role === "concierge") setConcierge(null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getConciergeToken();
        if (token) {
          const stored = await getStoredConcierge();
          if (stored) setConcierge(stored);
          try {
            const data = await getConciergeMe();
            if (data.success && data.concierge) {
              setConcierge(data.concierge);
              await persistConciergeProfile(data.concierge);
            }
          } catch {
            const stillHasToken = await getConciergeToken();
            if (!stillHasToken) setConcierge(null);
          }
        } else {
          setConcierge(null);
        }
      } catch {
        setConcierge(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await loginConcierge(email, password);
      if (data.success) {
        setConcierge(data.concierge);
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutConcierge();
    setConcierge(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getConciergeMe();
      if (data.success && data.concierge) {
        setConcierge(data.concierge);
        await persistConciergeProfile(data.concierge);
      }
    } catch {
      await clearConciergeSession();
      setConcierge(null);
    }
  }, []);

  return (
    <ConciergeAuthContext.Provider
      value={{
        concierge,
        isLoading,
        isAuthenticated: !!concierge,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </ConciergeAuthContext.Provider>
  );
}

export function useConciergeAuth() {
  const context = useContext(ConciergeAuthContext);
  if (context === undefined) {
    throw new Error("useConciergeAuth must be used within a ConciergeAuthProvider");
  }
  return context;
}
