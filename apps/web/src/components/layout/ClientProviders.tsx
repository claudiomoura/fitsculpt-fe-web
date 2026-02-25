"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AccessProvider } from "@/context/AccessProvider";
import VisualViewportVars from "@/components/layout/VisualViewportVars";

type ClientProvidersProps = {
  children: ReactNode;
  initialLocale?: string | null;
  initialTheme?: string | null;
};

export default function ClientProviders({ children, initialLocale, initialTheme }: ClientProvidersProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <VisualViewportVars />
      <LanguageProvider initialLocale={initialLocale}>
        <AccessProvider>
          <ToastProvider>{children}</ToastProvider>
        </AccessProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
