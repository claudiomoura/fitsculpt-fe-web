"use client";

import { useEffect, useMemo, useState } from "react";
import { extractGymMembership, type GymMembership } from "@/lib/gymMembership";

type GymMembershipState = {
  membership: GymMembership;
  isLoading: boolean;
  hasError: boolean;
};

const UNKNOWN_MEMBERSHIP: GymMembership = {
  state: "unknown",
  gymId: null,
  gymName: null,
};

export function useGymMembership(): GymMembershipState {
  const [membership, setMembership] = useState<GymMembership>(UNKNOWN_MEMBERSHIP);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadMembership = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!active) return;
          setMembership(UNKNOWN_MEMBERSHIP);
          setHasError(true);
          return;
        }

        const payload = (await response.json()) as unknown;
        if (!active) return;

        setMembership(extractGymMembership(payload));
      } catch {
        if (!active) return;
        setMembership(UNKNOWN_MEMBERSHIP);
        setHasError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadMembership();

    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      membership,
      isLoading,
      hasError,
    }),
    [membership, isLoading, hasError],
  );
}
