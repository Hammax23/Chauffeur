import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  DriverProfile,
  getDriverToken,
  getStoredDriver,
  clearDriverSession,
  persistDriverProfile,
  loginDriver,
  logoutDriver,
  getDriverProfile,
  toggleDriverActive as apiToggleActive,
  onUnauthorized,
} from "../services/api";
import { InteractionManager } from "react-native";
import { registerDriverPushToken, subscribeDriverPushTokenRefresh, resetPushTokenRegistrationCache } from "../services/notifications";
import { stopDriverLocationTracking } from "../services/driver-location";

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

function scheduleDriverPush(token: string) {
  InteractionManager.runAfterInteractions(() => {
    registerDriverPushToken(token).catch((err) =>
      console.log("Failed to register push token:", err)
    );
  });
}

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return onUnauthorized((role) => {
      if (role === "driver") setDriver(null);
    });
  }, []);

  // Re-register when FCM/APNs rotates the device token (app closed delivery depends on this)
  useEffect(() => {
    return subscribeDriverPushTokenRefresh(getDriverToken);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getDriverToken();
        if (token) {
          const stored = await getStoredDriver();
          if (stored) setDriver(stored);
          try {
            const data = await getDriverProfile();
            if (data.success && data.driver) {
              setDriver(data.driver);
              await persistDriverProfile(data.driver);
              scheduleDriverPush(token);
            }
          } catch {
            const stillHasToken = await getDriverToken();
            if (!stillHasToken) setDriver(null);
            // keep session on transient network errors — still try push register
            if (stillHasToken) scheduleDriverPush(token);
          }
        } else {
          setDriver(null);
        }
      } catch {
        setDriver(null);
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

        if (data.token) {
          scheduleDriverPush(data.token);
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
    await stopDriverLocationTracking();
    resetPushTokenRegistrationCache();
    await logoutDriver();
    setDriver(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getDriverProfile();
      if (data.success && data.driver) {
        setDriver(data.driver);
        await persistDriverProfile(data.driver);
      }
    } catch {
      await clearDriverSession();
      setDriver(null);
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
