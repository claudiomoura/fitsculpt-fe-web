"use client";

import { useCallback, useEffect, useState } from "react";
import { getUiEntitlements, type AuthMePayload, type UiEntitlements } from "@/lib/entitlements";
import { fetchAuthMe, invalidateAuthMeCache } from "@/lib/authDedup";

type UseAuthEntitlementsState = {
  entitlements: UiEntitlements;
  authMe: AuthMePayload | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  invalidateCache: () => void;
};

const unknownEntitlements: UiEntitlements = { status: "unknown" };

export function useAuthEntitlements(): UseAuthEntitlementsState {
  const [entitlements, setEntitlements] = useState<UiEntitlements>(unknownEntitlements);
  const [authMe, setAuthMe] = useState<AuthMePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchAuthMe();
      setAuthMe(data);
      setEntitlements(getUiEntitlements(data));
    } catch (fetchError) {
      setAuthMe(null);
      setEntitlements(unknownEntitlements);
      setError(fetchError instanceof Error ? fetchError.message : "NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    entitlements,
    authMe,
    loading,
    error,
    reload: load,
    invalidateCache: invalidateAuthMeCache,
  };
}
