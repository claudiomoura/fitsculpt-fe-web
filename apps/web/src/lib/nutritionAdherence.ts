import { useCallback, useEffect, useState } from "react";
import type { MealLogEntry, TrackingSnapshot } from "@/services/tracking";

export const NUTRITION_ADHERENCE_EVENT = "fs:nutrition-adherence-changed";

type NutritionAdherenceStore = Record<string, string[]>;

const isBrowser = () => typeof window !== "undefined";
const normalizeKey = (value?: string | null) => value?.trim() ?? "";

export function buildNutritionAdherenceStoreFromMealLog(entries?: MealLogEntry[] | null): NutritionAdherenceStore {
  if (!Array.isArray(entries)) return {};
  return entries.reduce<NutritionAdherenceStore>((acc, entry) => {
    if (!entry?.date || !entry?.mealKey) return acc;
    const current = acc[entry.date] ?? [];
    if (!current.includes(entry.mealKey)) {
      acc[entry.date] = [...current, entry.mealKey];
    }
    return acc;
  }, {});
}

async function fetchTrackingSnapshot(): Promise<TrackingSnapshot> {
  const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
  if (!response.ok) {
    throw new Error(`TRACKING_FETCH_FAILED:${response.status}`);
  }
  return (await response.json()) as TrackingSnapshot;
}

function buildMealLogId(dateKey: string, mealKey: string) {
  return `${dateKey}:${mealKey}`;
}

export const readNutritionAdherenceStore = (): NutritionAdherenceStore => ({});

export const useNutritionAdherence = (dayKey: string) => {
  const [store, setStore] = useState<NutritionAdherenceStore>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStore = useCallback(async () => {
    if (!isBrowser()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const tracking = await fetchTrackingSnapshot();
      setStore(buildNutritionAdherenceStoreFromMealLog(tracking.mealLog));
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
    void loadStore();
    const handleLocalUpdate = () => {
      void loadStore();
    };
    window.addEventListener(NUTRITION_ADHERENCE_EVENT, handleLocalUpdate);
    return () => window.removeEventListener(NUTRITION_ADHERENCE_EVENT, handleLocalUpdate);
  }, [loadStore]);

  const isConsumed = useCallback(
    (itemKey?: string | null, dateKey?: string | null) => {
      const normalizedItemKey = normalizeKey(itemKey);
      const normalizedDateKey = normalizeKey(dateKey);
      if (!normalizedItemKey || !normalizedDateKey) return false;
      return Boolean(store[normalizedDateKey]?.includes(normalizedItemKey));
    },
    [store],
  );

  const toggle = useCallback(async (itemKey?: string | null, dateKey?: string | null, payload?: Partial<MealLogEntry>) => {
    const normalizedItemKey = normalizeKey(itemKey);
    const normalizedDateKey = normalizeKey(dateKey);
    if (!normalizedItemKey || !normalizedDateKey) return;

    const entryId = buildMealLogId(normalizedDateKey, normalizedItemKey);
    const currentlyConsumed = Boolean(store[normalizedDateKey]?.includes(normalizedItemKey));

    setStore((prev) => {
      const current = prev[normalizedDateKey] ?? [];
      const next = currentlyConsumed ? current.filter((item) => item !== normalizedItemKey) : [...current, normalizedItemKey];
      const nextStore = { ...prev };
      if (next.length > 0) nextStore[normalizedDateKey] = Array.from(new Set(next));
      else delete nextStore[normalizedDateKey];
      return nextStore;
    });

    try {
      if (currentlyConsumed) {
        const response = await fetch(`/api/tracking/mealLog/${encodeURIComponent(entryId)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok && response.status !== 204) {
          throw new Error(`TRACKING_DELETE_FAILED:${response.status}`);
        }
      } else {
        const response = await fetch("/api/tracking", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collection: "mealLog",
            item: {
              id: entryId,
              date: normalizedDateKey,
              mealKey: normalizedItemKey,
              mealType: payload?.mealType ?? "meal",
              title: payload?.title ?? normalizedItemKey,
              calories: Number(payload?.calories ?? 0),
              protein: Number(payload?.protein ?? 0),
              carbs: Number(payload?.carbs ?? 0),
              fats: Number(payload?.fats ?? 0),
              completedAt: new Date().toISOString(),
            },
          }),
        });
        if (!response.ok) {
          throw new Error(`TRACKING_CREATE_FAILED:${response.status}`);
        }
      }
      window.dispatchEvent(new Event(NUTRITION_ADHERENCE_EVENT));
    } catch (_err) {
      await loadStore();
      throw _err;
    }
  }, [loadStore, store]);

  const clearDay = useCallback(async (dateKey?: string | null) => {
    const normalizedDateKey = normalizeKey(dateKey);
    if (!normalizedDateKey) return;
    const mealKeys = store[normalizedDateKey] ?? [];
    await Promise.all(
      mealKeys.map((mealKey) =>
        fetch(`/api/tracking/mealLog/${encodeURIComponent(buildMealLogId(normalizedDateKey, mealKey))}`, {
          method: "DELETE",
          credentials: "include",
        }),
      ),
    );
    await loadStore();
  }, [loadStore, store]);

  return {
    isLoading,
    error,
    isConsumed,
    toggle,
    clearDay,
  };
};
