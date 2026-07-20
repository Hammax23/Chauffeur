import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { InteractionManager } from "react-native";
import {
  CustomerProfile,
  getStoredCustomer,
  getCustomerToken,
  clearCustomerSession,
  loginCustomer,
  loginCustomerWithApple,
  loginCustomerWithGoogle,
  registerCustomer,
  logoutCustomer,
  getProfile,
  API_BASE_URL,
  updateProfile as apiUpdateProfile,
  onUnauthorized,
} from "../services/api";
import { registerCustomerPushToken } from "../services/notifications";

interface AuthContextType {
  user: CustomerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (idToken: string) => Promise<{
    success: boolean;
    error?: string;
    tokenAudience?: string | string[] | null;
    allowedAudiences?: string[];
  }>;
  loginWithApple: (params: {
    identityToken: string;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
  }) => Promise<{
    success: boolean;
    error?: string;
    tokenAudience?: string | string[] | null;
    allowedAudiences?: string[];
    tokenIssuer?: string | null;
  }>;
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

function scheduleCustomerPush(token: string) {
  InteractionManager.runAfterInteractions(() => {
    registerCustomerPushToken(token).catch(() => {});
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return onUnauthorized((role) => {
      if (role === "customer") setUser(null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getCustomerToken();
        if (token) {
          const stored = await getStoredCustomer();
          if (stored) setUser(stored);
          try {
            const data = await getProfile();
            if (data.success && data.customer) {
              setUser(data.customer);
              scheduleCustomerPush(token);
            }
          } catch (error: unknown) {
            // Only wipe session on true auth failure; keep offline sessions.
            const message = error instanceof Error ? error.message : "";
            const stillHasToken = await getCustomerToken();
            if (!stillHasToken) {
              setUser(null);
            } else if (/unauthorized|401/i.test(message)) {
              await clearCustomerSession();
              setUser(null);
            }
            // else: network/5xx — keep stored user + token
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
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
        if (data.token) scheduleCustomerPush(data.token);
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      return { success: false, error: message };
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const data = await loginCustomerWithGoogle(idToken);
      if (data.success) {
        setUser(data.customer);
        if (data.token) scheduleCustomerPush(data.token);
        return { success: true };
      }
      return {
        success: false,
        error: data.error || "Google login failed",
        tokenAudience: (data as { tokenAudience?: string | string[] | null }).tokenAudience ?? null,
        allowedAudiences: (data as { allowedAudiences?: string[] }).allowedAudiences ?? undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google login failed";
      return { success: false, error: message };
    }
  }, []);

  const loginWithApple = useCallback(async (params: {
    identityToken: string;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
  }) => {
    try {
      const data = await loginCustomerWithApple(params);
      if (data.success) {
        setUser(data.customer);
        if (data.token) scheduleCustomerPush(data.token);
        return { success: true };
      }
      return {
        success: false,
        error: data.error || "Apple login failed",
        tokenAudience: (data as { tokenAudience?: string | string[] | null }).tokenAudience ?? null,
        allowedAudiences: (data as { allowedAudiences?: string[] }).allowedAudiences ?? undefined,
        tokenIssuer: (data as { tokenIssuer?: string | null }).tokenIssuer ?? null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Apple login failed";
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
        if (data.token) scheduleCustomerPush(data.token);
        return { success: true };
      }
      return { success: false, error: data.error || "Registration failed" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed";
      return {
        success: false,
        error: __DEV__ ? `${message}\n\n(API: ${API_BASE_URL})` : message,
      };
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
      const stillHasToken = await getCustomerToken();
      if (!stillHasToken) setUser(null);
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
        loginWithGoogle,
        loginWithApple,
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
