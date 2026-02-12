"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getUserCapabilities } from "@/lib/userCapabilities";

type AccessRole = "user" | "coach" | "admin";

type AccessContextValue = {
  role: AccessRole;
  isAdmin: boolean;
  isCoach: boolean;
  isLoading: boolean;
  error: string | null;
};

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

function resolveRole(profile: unknown, isAdmin: boolean, isCoach: boolean): AccessRole {
  if (isAdmin) return "admin";
  if (isCoach) return "coach";

  if (typeof profile === "object" && profile !== null) {
    const profileRecord = profile as Record<string, unknown>;
    if (typeof profileRecord.role === "string") {
      const role = profileRecord.role.trim().toLowerCase();
      if (role === "admin" || role === "coach" || role === "trainer") {
        return role === "admin" ? "admin" : "coach";
      }
    }
  }

  return "user";
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadAccess = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/profile", { cache: "no-store" });

        if (!response.ok) {
          if (active) {
            setProfile(null);
            setError(`HTTP_${response.status}`);
          }
          return;
        }

        const data = (await response.json()) as unknown;
        if (active) {
          setProfile(data);
        }
      } catch {
        if (active) {
          setProfile(null);
          setError("NETWORK_ERROR");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadAccess();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AccessContextValue>(() => {
    const capabilities = getUserCapabilities(profile);
    const isAdmin = capabilities.isAdmin;
    const isCoach = capabilities.isTrainer || capabilities.isAdmin;
    const role = resolveRole(profile, isAdmin, isCoach);

    return {
      role,
      isAdmin,
      isCoach,
      isLoading,
      error,
    };
  }, [profile, isLoading, error]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within AccessProvider");
  }

  return context;
}
