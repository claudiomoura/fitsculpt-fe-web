"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { extractGymMembership, type GymMembershipState } from "@/lib/gymMembership";
import { getUserCapabilities } from "@/lib/userCapabilities";
import { getPrimaryRole } from "@/lib/roles";

type AccessRole = "user" | "coach" | "admin";

type UserRoleState = {
  loading: boolean;
  error: string | null;
  role: AccessRole;
  isAdmin: boolean;
  isTrainer: boolean;
  isDev: boolean;
  gymMembershipState: GymMembershipState;
};

function resolveRole(profile: unknown, isAdmin: boolean, isTrainer: boolean): AccessRole {
  if (isAdmin) return "admin";
  if (isTrainer) return "coach";

  const primaryRole = getPrimaryRole(profile);
  if (primaryRole === "coach") return "coach";
  if (primaryRole === "admin") return "admin";

  return "user";
}

export function useUserRole(): UserRoleState {
  const [profile, setProfile] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRole = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      if (!document.cookie.includes("fs_token=")) {
        setProfile(null);
        setLoading(false);
        return;
      }

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
      gymMembershipState: extractGymMembership(profile).state,
    };
  }, [profile, loading, error]);
}
