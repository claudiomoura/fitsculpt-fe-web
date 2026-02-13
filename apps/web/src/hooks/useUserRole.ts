"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserCapabilities } from "@/lib/userCapabilities";

type AccessRole = "user" | "coach" | "admin";

type UserRoleState = {
  loading: boolean;
  error: string | null;
  role: AccessRole;
  isAdmin: boolean;
  isTrainer: boolean;
  isDev: boolean;
};

function readExplicitRole(profile: unknown): AccessRole | null {
  if (typeof profile !== "object" || profile === null) return null;

  const role = (profile as Record<string, unknown>).role;
  if (typeof role !== "string") return null;

  const normalized = role.trim().toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "coach" || normalized === "trainer") return "coach";
  if (normalized === "user") return "user";

  return null;
}

function resolveRole(profile: unknown, isAdmin: boolean, isTrainer: boolean): AccessRole {
  if (isAdmin) return "admin";
  if (isTrainer) return "coach";

  return readExplicitRole(profile) ?? "user";
}

export function useUserRole(): UserRoleState {
  const [profile, setProfile] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRole = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
            const response = await fetch("/api/auth/me", {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        setProfile(null);
        setError(`HTTP_${response.status}`);
        return;
      }

      const data = (await response.json()) as unknown;
      setProfile(data);
    } catch (fetchError) {
      if (signal?.aborted) return;
      setProfile(null);
      setError(fetchError instanceof Error ? fetchError.message : "NETWORK_ERROR");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadRole(controller.signal);

    const handleRefresh = () => {
      void loadRole(controller.signal);
    };

    window.addEventListener("auth:refresh", handleRefresh);
    return () => {
      controller.abort();
      window.removeEventListener("auth:refresh", handleRefresh);
    };
  }, [loadRole]);

  return useMemo(() => {
    const capabilities = getUserCapabilities(profile);
    const isAdmin = capabilities.isAdmin;
    const isTrainer = capabilities.isTrainer;
    const isDev = capabilities.isDev;

    return {
      loading,
      error,
      role: resolveRole(profile, isAdmin, isTrainer),
      isAdmin,
      isTrainer,
      isDev,
    };
  }, [profile, loading, error]);
}
