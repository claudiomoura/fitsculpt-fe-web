"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "fs-locale";

export const messages = {
  // Añade nuevos textos fijos aquí cuando quieras ampliar las traducciones.
  es: {
    appName: "FitSculpt",
    nav: {
      dashboard: "Panel",
      workouts: "Entrenamientos",
      trainingPlan: "Plan de entrenamiento",
      nutrition: "Nutrición",
      macros: "Macros",
      library: "Biblioteca",
      tracking: "Seguimiento",
      feed: "Feed",
      profile: "Perfil",
      settings: "Ajustes",
      logout: "Cerrar sesión",
    },
    navSections: {
      summary: "Resumen",
      training: "Entrenamiento",
      nutrition: "Nutrición",
      account: "Cuenta",
    },
    ui: {
      menu: "Menú",
      close: "Cerrar",
      themeLight: "Modo claro",
      themeDark: "Modo oscuro",
      language: "Idioma",
      userFallback: "FitSculpt",
      backToLibrary: "Volver a la biblioteca",
      exerciseGuide: "Guía completa con foco en técnica, ejecución y progresión.",
      description: "Descripción",
      technique: "Técnica",
      tips: "Consejos",
    },
  },
  en: {
    appName: "FitSculpt",
    nav: {
      dashboard: "Dashboard",
      workouts: "Workouts",
      trainingPlan: "Training plan",
      nutrition: "Nutrition",
      macros: "Macros",
      library: "Library",
      tracking: "Progress",
      feed: "Feed",
      profile: "Profile",
      settings: "Settings",
      logout: "Log out",
    },
    navSections: {
      summary: "Summary",
      training: "Training",
      nutrition: "Nutrition",
      account: "Account",
    },
    ui: {
      menu: "Menu",
      close: "Close",
      themeLight: "Light mode",
      themeDark: "Dark mode",
      language: "Language",
      userFallback: "FitSculpt",
      backToLibrary: "Back to library",
      exerciseGuide: "Complete guide focused on technique, execution, and progression.",
      description: "Description",
      technique: "Technique",
      tips: "Tips",
    },
  },
} as const;

export type Locale = keyof typeof messages;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getMessage(locale: Locale, key: string) {
  const keys = key.split(".");
  let current: unknown = messages[locale];
  for (const part of keys) {
    if (typeof current !== "object" || current === null) return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "es" || stored === "en") {
      setLocaleState(stored);
      return;
    }
    setLocaleState("es");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: string) => getMessage(locale, key),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
