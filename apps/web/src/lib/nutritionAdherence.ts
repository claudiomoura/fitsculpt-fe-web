import { useCallback, useEffect, useState } from "react";

export const NUTRITION_ADHERENCE_STORAGE_KEY = "fs_nutrition_adherence_v1";

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
  } catch (_err) {
    return {};
  }
};

const writeStore = (store: NutritionAdherenceStore) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(NUTRITION_ADHERENCE_STORAGE_KEY, JSON.stringify(store));
  } catch (_err) {
    // ignore storage errors
  }
};

const normalizeKey = (value?: string | null) => value?.trim() ?? "";

const toggleStoreItem = (
  store: NutritionAdherenceStore,
  dateKey: string,
  itemKey: string
): NutritionAdherenceStore => {
  const current = store[dateKey] ?? [];
  const next = current.includes(itemKey)
    ? current.filter((item) => item !== itemKey)
    : [...current, itemKey];
  const nextStore = { ...store };
  if (next.length > 0) {
    nextStore[dateKey] = Array.from(new Set(next));
  } else {
    delete nextStore[dateKey];
  }
  return nextStore;
};

export const useNutritionAdherence = (dayKey: string) => {
  const [store, setStore] = useState<NutritionAdherenceStore>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStore = useCallback(() => {
    if (!isBrowser()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setStore(readStore());
      setError(false);
    } catch (_err) {
      setStore({});
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;
    loadStore();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === NUTRITION_ADHERENCE_STORAGE_KEY) {
        loadStore();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadStore]);

  const isConsumed = useCallback(
    (itemKey?: string | null, dateKey?: string | null) => {
      const normalizedItemKey = normalizeKey(itemKey);
      const normalizedDateKey = normalizeKey(dateKey);
      if (!normalizedItemKey || !normalizedDateKey) return false;
      return Boolean(store[normalizedDateKey]?.includes(normalizedItemKey));
    },
    [store]
  );

  const toggle = useCallback((itemKey?: string | null, dateKey?: string | null) => {
    const normalizedItemKey = normalizeKey(itemKey);
    const normalizedDateKey = normalizeKey(dateKey);
    if (!normalizedItemKey || !normalizedDateKey) return;
    const currentStore = readStore();
    const nextStore = toggleStoreItem(currentStore, normalizedDateKey, normalizedItemKey);
    writeStore(nextStore);
    setStore(nextStore);
  }, []);

  const clearDay = useCallback((dateKey?: string | null) => {
    const normalizedDateKey = normalizeKey(dateKey);
    if (!normalizedDateKey) return;
    const currentStore = readStore();
    if (!currentStore[normalizedDateKey]) return;
    const nextStore = { ...currentStore };
    delete nextStore[normalizedDateKey];
    writeStore(nextStore);
    setStore(nextStore);
  }, []);

  return {
    isLoading,
    error,
    isConsumed,
    toggle,
    clearDay,
  };
};
