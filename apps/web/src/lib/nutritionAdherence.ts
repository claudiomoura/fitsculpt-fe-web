import { useCallback, useEffect, useState } from "react";

export const NUTRITION_ADHERENCE_STORAGE_KEY = "fs_nutrition_adherence_v1";

type NutritionAdherence = Record<string, Record<string, boolean>>;

const isBrowser = () => typeof window !== "undefined";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeAdherence = (value: unknown): NutritionAdherence => {
  if (!isRecord(value)) return {};
  const normalized: NutritionAdherence = {};
  for (const [dateKey, items] of Object.entries(value)) {
    if (typeof dateKey !== "string" || !isRecord(items)) continue;
    const dayEntries: Record<string, boolean> = {};
    for (const [itemKey, consumed] of Object.entries(items)) {
      if (typeof itemKey !== "string") continue;
      if (consumed === true) {
        dayEntries[itemKey] = true;
      }
    }
    if (Object.keys(dayEntries).length > 0) {
      normalized[dateKey] = dayEntries;
    }
  }
  return normalized;
};

export const getNutritionAdherence = (): NutritionAdherence => {
  if (!isBrowser()) return {};
  try {
    const stored = window.localStorage.getItem(NUTRITION_ADHERENCE_STORAGE_KEY);
    if (!stored) return {};
    return normalizeAdherence(JSON.parse(stored));
  } catch {
    return {};
  }
};

export const setNutritionAdherence = (data: NutritionAdherence) => {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(NUTRITION_ADHERENCE_STORAGE_KEY, JSON.stringify(normalizeAdherence(data)));
    return true;
  } catch {
    return false;
  }
};

const updateAdherence = (data: NutritionAdherence, itemKey: string, dateKey: string) => {
  const next: NutritionAdherence = { ...data };
  const dayEntries = { ...(next[dateKey] ?? {}) };
  if (dayEntries[itemKey]) {
    delete dayEntries[itemKey];
  } else {
    dayEntries[itemKey] = true;
  }
  if (Object.keys(dayEntries).length > 0) {
    next[dateKey] = dayEntries;
  } else {
    delete next[dateKey];
  }
  return next;
};

const clearAdherenceDay = (data: NutritionAdherence, dateKey: string) => {
  const next: NutritionAdherence = { ...data };
  delete next[dateKey];
  return next;
};

export const useNutritionAdherence = () => {
  const [data, setData] = useState<NutritionAdherence>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAdherence = useCallback(() => {
    if (!isBrowser()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const stored = window.localStorage.getItem(NUTRITION_ADHERENCE_STORAGE_KEY);
      const parsed = stored ? normalizeAdherence(JSON.parse(stored)) : {};
      setData(parsed);
      setError(false);
    } catch {
      setData({});
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;
    loadAdherence();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === NUTRITION_ADHERENCE_STORAGE_KEY) {
        loadAdherence();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadAdherence]);

  const toggle = useCallback((itemKey: string, dateKey: string) => {
    if (!isBrowser()) return;
    if (!itemKey || !dateKey) return;
    setData((prev) => {
      const next = updateAdherence(prev, itemKey, dateKey);
      const ok = setNutritionAdherence(next);
      setError(!ok);
      return next;
    });
  }, []);

  const clearDay = useCallback((dateKey: string) => {
    if (!isBrowser()) return;
    if (!dateKey) return;
    setData((prev) => {
      const next = clearAdherenceDay(prev, dateKey);
      const ok = setNutritionAdherence(next);
      setError(!ok);
      return next;
    });
  }, []);

  return {
    data,
    isLoading,
    error,
    toggle,
    clearDay,
    refresh: loadAdherence,
  };
};
