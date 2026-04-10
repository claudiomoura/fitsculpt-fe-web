"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const THEME_STORAGE_KEY = "fs-theme";

type ThemeContextValue = {
  theme: Theme;
  themePreference: ThemePreference;
  setTheme: (theme: Theme) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveThemePreference(value?: string | null): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "dark";
}

function resolveTheme(preference: ThemePreference, prefersDark: boolean): Theme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }
  return preference;
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("theme-dark", theme === "dark");
  root.classList.toggle("theme-light", theme === "light");
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: string | null;
}) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => resolveThemePreference(initialTheme));
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return resolveTheme(resolveThemePreference(initialTheme), false);
    }
    return resolveTheme(resolveThemePreference(initialTheme), window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyResolvedTheme = () => {
      setThemeState(resolveTheme(themePreference, mediaQuery.matches));
    };

    applyResolvedTheme();

    if (themePreference !== "system") {
      return;
    }

    const handleChange = () => {
      applyResolvedTheme();
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themePreference]);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    document.cookie = `${THEME_STORAGE_KEY}=${themePreference}; path=/; max-age=31536000; samesite=lax`;
  }, [themePreference]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemePreferenceState(nextTheme);
  }, []);

  const setThemePreference = useCallback((nextThemePreference: ThemePreference) => {
    setThemePreferenceState(nextThemePreference);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreferenceState((current) => {
      const currentTheme = resolveTheme(current, window.matchMedia("(prefers-color-scheme: dark)").matches);
      return currentTheme === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({ theme, themePreference, setTheme, setThemePreference, toggleTheme }),
    [theme, themePreference, setTheme, setThemePreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
