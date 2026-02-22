"use client";

import { useCallback, useEffect, useState } from "react";
import { getWeeklyReview } from "@/services/weeklyReview";
import type { WeeklyReviewRequest, WeeklyReviewResponse } from "@/types/weeklyReview";

type WeeklyReviewState = {
  data: WeeklyReviewResponse | null;
  loading: boolean;
  error: string | null;
  notSupported: boolean;
  reload: () => Promise<void>;
};

export function useWeeklyReview(params: WeeklyReviewRequest = {}): WeeklyReviewState {
  const startDate = params.startDate;
  const endDate = params.endDate;

  const [data, setData] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notSupported, setNotSupported] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotSupported(false);

    const result = await getWeeklyReview({ startDate, endDate });
    if (!result.ok) {
      setData(null);
      setNotSupported(result.reason === "notSupported");
      setError(result.message ?? result.reason);
      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  }, [endDate, startDate]);

  useEffect(() => {
    let active = true;

    const initialLoad = async () => {
      const result = await getWeeklyReview({ startDate, endDate });
      if (!active) return;
      if (!result.ok) {
        setData(null);
        setNotSupported(result.reason === "notSupported");
        setError(result.message ?? result.reason);
        setLoading(false);
        return;
      }

      setData(result.data);
      setError(null);
      setNotSupported(false);
      setLoading(false);
    };

    void initialLoad();

    return () => {
      active = false;
    };
  }, [endDate, startDate]);

  return {
    data,
    loading,
    error,
    notSupported,
    reload: load,
  };
}
