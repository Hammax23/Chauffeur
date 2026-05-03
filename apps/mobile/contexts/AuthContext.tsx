import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  CustomerProfile,
  getStoredUser,
  getToken,
  loginCustomer,
  registerCustomer,
  logoutCustomer,
  getProfile,
  updateProfile as apiUpdateProfile,
} from "../services/api";

interface AuthContextType {
  user: CustomerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    city?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (params: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    photo?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const stored = await getStoredUser();
          if (stored) {
            setUser(stored);
          }
          // Refresh profile from server in background
          try {
            const data = await getProfile();
            if (data.success && data.customer) {
              setUser(data.customer);
            }
          } catch {
            // Token might be expired
          }
        }
      } catch {
        // No stored session
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await loginCustomer(email, password);
      if (data.success) {
        setUser(data.customer);
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (params: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    city?: string;
  }) => {
    try {
      const data = await registerCustomer(params);
      if (data.success) {
        setUser(data.customer);
        return { success: true };
      }
      return { success: false, error: data.error || "Registration failed" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutCustomer();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getProfile();
      if (data.success && data.customer) {
        setUser(data.customer);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const updateProfile = useCallback(async (params: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    photo?: string;
  }) => {
    try {
      const data = await apiUpdateProfile(params);
      if (data.success && data.customer) {
        setUser(data.customer);
        return { success: true };
      }
      return { success: false, error: "Update failed" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Update failed";
      return { success: false, error: message };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
