import { useCallback, useEffect, useState } from "react";

export const NUTRITION_ADHERENCE_STORAGE_KEY = "fs_nutrition_adherence";

type NutritionAdherenceStore = Record<string, string[]>;

const isBrowser = () => typeof window !== "undefined";

const normalizeStore = (value: unknown): NutritionAdherenceStore => {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const normalized: NutritionAdherenceStore = {};

  Object.entries(record).forEach(([dateKey, items]) => {
    if (!Array.isArray(items)) return;
    const keys = items.filter((item): item is string => typeof item === "string");
    if (keys.length > 0) {
      normalized[dateKey] = Array.from(new Set(keys));
    }
  });

  return normalized;
};

const readStore = (): NutritionAdherenceStore => {
  if (!isBrowser()) return {};
  try {
    const stored = window.localStorage.getItem(NUTRITION_ADHERENCE_STORAGE_KEY);
    if (!stored) return {};
    return normalizeStore(JSON.parse(stored));
  } catch {
    return {};
  }
};

const writeStore = (store: NutritionAdherenceStore) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(NUTRITION_ADHERENCE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
};

export const getNutritionAdherence = (dateKey: string): string[] => {
  if (!dateKey) return [];
  const store = readStore();
  return store[dateKey] ?? [];
};

export const setNutritionAdherence = (dateKey: string, items: string[]) => {
  if (!dateKey) return;
  const store = readStore();
  store[dateKey] = Array.from(new Set(items));
  writeStore(store);
};

export const toggleNutritionAdherence = (dateKey: string, itemKey: string) => {
  if (!dateKey || !itemKey) return [];
  const current = getNutritionAdherence(dateKey);
  const next = current.includes(itemKey)
    ? current.filter((item) => item !== itemKey)
    : [...current, itemKey];
  setNutritionAdherence(dateKey, next);
  return next;
};

export const useNutritionAdherence = (dateKey: string) => {
  const [consumedKeys, setConsumedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(() => {
    if (!isBrowser()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setConsumedKeys(getNutritionAdherence(dateKey));
      setHasError(false);
    } catch {
      setConsumedKeys([]);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    if (!isBrowser()) return;
    load();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === NUTRITION_ADHERENCE_STORAGE_KEY) {
        load();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [load]);

  const toggle = (itemKey: string) => {
    const next = toggleNutritionAdherence(dateKey, itemKey);
    setConsumedKeys(next);
  };

  return {
    consumedKeys,
    loading,
    hasError,
    toggle,
    refresh: load,
  };
};
