"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}
