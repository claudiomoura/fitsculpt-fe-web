"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccess } from "@/lib/useAccess";
import type { GymMembership } from "@/lib/gymMembership";

type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED" | "UNKNOWN";

const UNKNOWN_MEMBERSHIP: GymMembership = { state: "unknown", gymId: null, gymName: null };

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeStatus(value: unknown): MembershipStatus {
  const normalized = asString(value)?.trim().toUpperCase();
  if (normalized === "NONE" || normalized === "PENDING" || normalized === "ACTIVE" || normalized === "REJECTED") {
    return normalized;
  }
  return "UNKNOWN";
}

function toGymMembership(payload: unknown): GymMembership {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = typeof source.data === "object" && source.data !== null ? (source.data as Record<string, unknown>) : source;
  const gym = typeof data.gym === "object" && data.gym !== null ? (data.gym as Record<string, unknown>) : null;

  const status = normalizeStatus(data.state ?? data.status);
  const gymId = asString(data.gymId) ?? asString(data.tenantId) ?? asString(gym?.id);
  const gymName = asString(data.gymName) ?? asString(data.tenantName) ?? asString(gym?.name);

  if (status === "ACTIVE") return { state: "in_gym", gymId, gymName };
  if (status === "NONE" || status === "PENDING" || status === "REJECTED") {
    return { state: "not_in_gym", gymId, gymName };
  }

  return UNKNOWN_MEMBERSHIP;
}

export function useTrainerAreaAccess() {
  const access = useAccess();
  const [membership, setMembership] = useState<GymMembership>(UNKNOWN_MEMBERSHIP);
  const [gymLoading, setGymLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadMembership = async () => {
      setGymLoading(true);
      try {
        const response = await fetch("/api/gym/me", { cache: "no-store", credentials: "include" });
        if (!response.ok) {
          if (active) setMembership(UNKNOWN_MEMBERSHIP);
          return;
        }

        const payload = (await response.json()) as unknown;
        if (!active) return;
        setMembership(toGymMembership(payload));
      } catch (_err) {
        if (active) setMembership(UNKNOWN_MEMBERSHIP);
      } finally {
        if (active) setGymLoading(false);
      }
    };

    void loadMembership();

    return () => {
      active = false;
    };
  }, []);

  const canAccessTrainerArea = useMemo(
    () => membership.state === "in_gym" && (access.isTrainer || access.isAdmin),
    [access.isAdmin, access.isTrainer, membership.state],
  );

  const canAccessAdminNoGymPanel = useMemo(
    () => access.isAdmin && membership.state === "not_in_gym",
    [access.isAdmin, membership.state],
  );

  return {
    ...access,
    membership,
    gymLoading,
    canAccessTrainerArea,
    canAccessAdminNoGymPanel,
  };
}
