import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  DriverProfile,
  getToken,
  getStoredUser,
  loginDriver,
  logoutDriver,
  getDriverProfile,
  toggleDriverActive as apiToggleActive,
} from "../services/api";
import { registerPushToken } from "../services/notifications";

interface DriverAuthContextType {
  driver: DriverProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toggleActive: (isActive: boolean) => Promise<{ success: boolean; error?: string }>;
}

const DriverAuthContext = createContext<DriverAuthContextType | undefined>(undefined);

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const stored = await getStoredUser();
          if (stored && "driverId" in stored) {
            setDriver(stored as unknown as DriverProfile);
          }
          try {
            const data = await getDriverProfile();
            if (data.success && data.driver) {
              setDriver(data.driver);
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
      const data = await loginDriver(email, password);
      if (data.success) {
        setDriver(data.driver);
        
        // Register push notification token after successful login
        if (data.token) {
          registerPushToken(data.token).catch(err => 
            console.log('Failed to register push token:', err)
          );
        }
        
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutDriver();
    setDriver(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getDriverProfile();
      if (data.success && data.driver) {
        setDriver(data.driver);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const toggleActive = useCallback(async (isActive: boolean) => {
    try {
      const data = await apiToggleActive(isActive);
      if (data.success) {
        setDriver((prev) =>
          prev ? { ...prev, isActive: data.isActive, status: data.status } : null
        );
        return { success: true };
      }
      return { success: false, error: "Failed to update status" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      return { success: false, error: message };
    }
  }, []);

  return (
    <DriverAuthContext.Provider
      value={{
        driver,
        isLoading,
        isAuthenticated: !!driver,
        login,
        logout,
        refreshProfile,
        toggleActive,
      }}
    >
      {children}
    </DriverAuthContext.Provider>
  );
}

export function useDriverAuth() {
  const context = useContext(DriverAuthContext);
  if (context === undefined) {
    throw new Error("useDriverAuth must be used within a DriverAuthProvider");
  }
  return context;
}
