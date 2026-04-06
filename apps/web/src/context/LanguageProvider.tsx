"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  type Locale,
  type MessageValues,
  getLocaleCookie,
  getMessage,
  resolveLocale,
} from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: MessageValues) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: string | null;
}) {
  // Detect browser language if no initialLocale provided
  const detectBrowserLocale = (): Locale => {
    if (initialLocale) return resolveLocale(initialLocale);
    
    // Check localStorage first
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("fs-locale") : null;
    if (stored === "es" || stored === "en" || stored === "pt") return stored;
    
    // Detect from browser
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const browserLang = navigator.language?.toLowerCase() || "";
      if (browserLang.startsWith("en")) return "en";
      if (browserLang.startsWith("pt")) return "pt";
    }
    
    return "es"; // Default to Spanish
  };

  const [locale, setLocaleState] = useState<Locale>(() => detectBrowserLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("fs-locale", locale);
    document.cookie = getLocaleCookie(locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: string, values?: MessageValues) => getMessage(locale, key, values),
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
