"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { extractGymMembership, type GymMembershipState } from "@/lib/gymMembership";
import { getUserCapabilities } from "@/lib/userCapabilities";

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

type UnknownRecord = Record<string, unknown>;

const ADMIN_TOKENS = ["ADMIN", "ROLE_ADMIN", "ADMINISTRATOR"];
const TRAINER_TOKENS = ["TRAINER", "COACH", "ROLE_TRAINER", "ROLE_COACH", "TRAINER_READ"];
const DEV_TOKENS = ["DEV", "DEVELOPER", "ROLE_DEV", "ROLE_DEVELOPER"];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function collectProfileCandidates(profile: unknown): UnknownRecord[] {
  if (!isRecord(profile)) return [];

  const candidates: UnknownRecord[] = [profile];
  for (const key of ["user", "data", "profile"] as const) {
    const candidate = profile[key];
    if (isRecord(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function hasAnyToken(tokens: string[], allowedTokens: string[]): boolean {
  const normalized = tokens.map((token) => token.trim().toUpperCase());
  return allowedTokens.some((token) => normalized.includes(token));
}

function inferCapabilityFlagsFromMe(profile: unknown): Pick<UserRoleState, "isAdmin" | "isTrainer" | "isDev"> {
  const candidates = collectProfileCandidates(profile);
  const roleTokens = candidates.flatMap((candidate) => {
    const tokens = getStringArray(candidate.roles);
    if (typeof candidate.role === "string") {
      tokens.push(candidate.role);
    }
    return tokens;
  });
  const permissionTokens = candidates.flatMap((candidate) => getStringArray(candidate.permissions));
  const combinedTokens = [...roleTokens, ...permissionTokens];

  const isAdmin = hasAnyToken(combinedTokens, ADMIN_TOKENS);
  const isTrainer = hasAnyToken(combinedTokens, TRAINER_TOKENS);
  const isDev = hasAnyToken(combinedTokens, DEV_TOKENS);

  return { isAdmin, isTrainer, isDev };
}

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
    const inferredCapabilities = inferCapabilityFlagsFromMe(profile);
    const isAdmin = capabilities.isAdmin || inferredCapabilities.isAdmin;
    const isTrainer = capabilities.isTrainer || inferredCapabilities.isTrainer;
    const isDev = capabilities.isDev || inferredCapabilities.isDev;

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
