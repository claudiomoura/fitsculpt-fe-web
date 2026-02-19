"use client";

import { useEffect, useState } from "react";
import { detectPlansCapabilities, type PlansCapabilities } from "@/lib/api/plansDataAccess";

type UsePlansCapabilitiesState = {
  capabilities: PlansCapabilities | null;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
};

export function usePlansCapabilities(): UsePlansCapabilitiesState {
  const [capabilities, setCapabilities] = useState<PlansCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);

    try {
      const result = await detectPlansCapabilities();
      setCapabilities(result);
    } catch {
      setCapabilities(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return {
    capabilities,
    loading,
    error,
    reload: load,
  };
}
