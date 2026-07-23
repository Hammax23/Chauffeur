import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import {
  DRIVER_THEME_KEY,
  getDriverPalette,
  type DriverPalette,
  type ThemeMode,
} from "../theme/driver-theme";

type DriverThemeContextValue = {
  themeMode: ThemeMode;
  isDark: boolean;
  palette: DriverPalette;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const DriverThemeContext = createContext<DriverThemeContextValue | null>(null);

export function DriverThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(DRIVER_THEME_KEY)
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
    SecureStore.setItemAsync(DRIVER_THEME_KEY, mode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      SecureStore.setItemAsync(DRIVER_THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<DriverThemeContextValue>(
    () => ({
      themeMode,
      isDark: themeMode === "dark",
      palette: getDriverPalette(themeMode),
      toggleTheme,
      setThemeMode,
    }),
    [themeMode, toggleTheme, setThemeMode]
  );

  return <DriverThemeContext.Provider value={value}>{children}</DriverThemeContext.Provider>;
}

export function useDriverTheme() {
  const ctx = useContext(DriverThemeContext);
  if (!ctx) {
    throw new Error("useDriverTheme must be used within DriverThemeProvider");
  }
  return ctx;
}
