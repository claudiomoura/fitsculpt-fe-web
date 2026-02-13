"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";

type AccessRole = "user" | "coach" | "admin";

type AccessContextValue = {
  role: AccessRole;
  isAdmin: boolean;
  isCoach: boolean;
  isTrainer: boolean;
  isDev: boolean;
  isLoading: boolean;
  error: string | null;
};

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

export function AccessProvider({ children }: { children: ReactNode }) {
  const { loading, error, role, isAdmin, isTrainer, isDev } = useUserRole();

  const value: AccessContextValue = {
    role,
    isAdmin,
    isCoach: isTrainer || isAdmin,
    isTrainer,
    isDev,
    isLoading: loading,
    error,
  };

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within AccessProvider");
  }

  return context;
}
