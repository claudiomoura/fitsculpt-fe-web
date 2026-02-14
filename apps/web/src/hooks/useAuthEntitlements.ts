"use client";

import { useCallback, useEffect, useState } from "react";
import { getUiEntitlements, type AuthMePayload, type UiEntitlements } from "@/lib/entitlements";

type UseAuthEntitlementsState = {
  entitlements: UiEntitlements;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const unknownEntitlements: UiEntitlements = { status: "unknown" };

export function useAuthEntitlements(): UseAuthEntitlementsState {
  const [entitlements, setEntitlements] = useState<UiEntitlements>(unknownEntitlements);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setEntitlements(unknownEntitlements);
        setError(`HTTP_${response.status}`);
        return;
      }

      const data = (await response.json()) as AuthMePayload;
      setEntitlements(getUiEntitlements(data));
    } catch (fetchError) {
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
    loading,
    error,
    reload: load,
  };
}
