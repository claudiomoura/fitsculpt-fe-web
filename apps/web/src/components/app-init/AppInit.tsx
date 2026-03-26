"use client";

import { useEffect, ReactNode } from "react";
import { useWebVitals } from "@/hooks/useWebVitals";
import ErrorBoundary from "@/components/error-boundary/ErrorBoundary";

interface AppInitProps {
  children: ReactNode;
}

export default function AppInit({ children }: AppInitProps) {
  useWebVitals();

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
