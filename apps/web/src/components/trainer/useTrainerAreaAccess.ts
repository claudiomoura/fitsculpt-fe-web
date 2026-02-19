"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccess } from "@/lib/useAccess";
import type { GymMembership } from "@/lib/gymMembership";
import { fetchMyGymMembership } from "@/services/gym";

const UNKNOWN_MEMBERSHIP: GymMembership = { state: "unknown", gymId: null, gymName: null };

function toGymMembership(membership: { status: "NONE" | "PENDING" | "ACTIVE" | "REJECTED"; gymId: string | null; gymName: string | null }): GymMembership {
  if (membership.status === "ACTIVE") return { state: "in_gym", gymId: membership.gymId, gymName: membership.gymName };
  return { state: "not_in_gym", gymId: membership.gymId, gymName: membership.gymName };
}

export function useTrainerAreaAccess() {
  const access = useAccess();
  const [membership, setMembership] = useState<GymMembership>(UNKNOWN_MEMBERSHIP);
  const [gymLoading, setGymLoading] = useState(true);
  const [gymError, setGymError] = useState(false);

  const loadMembership = useCallback(async () => {
    setGymLoading(true);
    setGymError(false);

    const result = await fetchMyGymMembership();

    if (!result.ok) {
      setMembership(UNKNOWN_MEMBERSHIP);
      setGymError(true);
      setGymLoading(false);
      return;
    }

    setMembership(toGymMembership(result.data));
    setGymError(false);
    setGymLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      await loadMembership();
      if (!active) return;
    };

    const handleRefresh = () => {
      void run();
    };

    void run();
    window.addEventListener("gym-membership:refresh", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("gym-membership:refresh", handleRefresh);
    };
  }, [loadMembership]);

  const canAccessTrainerArea = useMemo(() => {
    if (!(access.isTrainer || access.isAdmin)) {
      return false;
    }

    if (membership.state !== "in_gym") {
      return false;
    }

    return true;
  }, [access.isAdmin, access.isTrainer, membership.state]);

  const canAccessAdminNoGymPanel = useMemo(
    () => access.isAdmin && membership.state === "not_in_gym",
    [access.isAdmin, membership.state],
  );

  return {
    ...access,
    membership,
    gymLoading,
    gymError,
    canAccessTrainerArea,
    canAccessAdminNoGymPanel,
    refreshGymMembership: loadMembership,
  };
}
