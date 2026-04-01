"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { extractGymMembership, type GymMembershipState } from "@/lib/gymMembership";
import { getUserCapabilities } from "@/lib/userCapabilities";
import { getPrimaryRole } from "@/lib/roles";
import { fetchAuthMe } from "@/lib/authDedup";

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

  const loadRole = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAuthMe();
      setProfile(data);
    } catch (fetchError) {
      setProfile(null);
      setError(fetchError instanceof Error ? fetchError.message : "NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRole();

    const handleRefresh = () => {
      void loadRole();
    };

    window.addEventListener("auth:refresh", handleRefresh);
    return () => {
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
