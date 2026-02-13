"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AccessProvider } from "@/context/AccessProvider";
import VisualViewportVars from "@/components/layout/VisualViewportVars";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <VisualViewportVars />
      <LanguageProvider>
        <AccessProvider>
          <ToastProvider>{children}</ToastProvider>
        </AccessProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
