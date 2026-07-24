import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import {
  getDriverPalette,
  type DriverPalette,
  type ThemeMode,
} from "../theme/driver-theme";

export const CUSTOMER_THEME_KEY = "customer_home_theme";

type CustomerThemeContextValue = {
  themeMode: ThemeMode;
  isDark: boolean;
  palette: DriverPalette;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const CustomerThemeContext = createContext<CustomerThemeContextValue | null>(null);

export function CustomerThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(CUSTOMER_THEME_KEY)
      .then((saved) => {
        if (!alive) return;
        if (saved === "light" || saved === "dark") setThemeModeState(saved);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    SecureStore.setItemAsync(CUSTOMER_THEME_KEY, mode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      SecureStore.setItemAsync(CUSTOMER_THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<CustomerThemeContextValue>(
    () => ({
      themeMode,
      isDark: themeMode === "dark",
      palette: getDriverPalette(themeMode),
      toggleTheme,
      setThemeMode,
    }),
    [themeMode, toggleTheme, setThemeMode]
  );

  return <CustomerThemeContext.Provider value={value}>{children}</CustomerThemeContext.Provider>;
}

export function useCustomerTheme() {
  const ctx = useContext(CustomerThemeContext);
  if (!ctx) {
    throw new Error("useCustomerTheme must be used within CustomerThemeProvider");
  }
  return ctx;
}
