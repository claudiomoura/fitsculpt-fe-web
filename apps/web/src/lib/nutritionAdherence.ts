import { useCallback, useEffect, useRef, useState } from "react";
import type { MealLogEntry, TrackingSnapshot } from "@/services/tracking";
import { getMealsByDate, createMealLog, updateMealLog, deleteMealLog, type MealLogResponse } from "@/services/mealApi";

export const NUTRITION_ADHERENCE_EVENT = "fs:nutrition-adherence-changed";

type NutritionAdherenceStore = Record<string, string[]>;

// Map of dateKey -> mealType -> mealId for new API operations
type MealIdMap = Record<string, Record<string, string>>;

const isBrowser = () => typeof window !== "undefined";
const normalizeKey = (value?: string | null) => value?.trim() ?? "";

type MealLogLike = Partial<MealLogEntry>;

type ApiMealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export function buildNutritionAdherenceStoreFromMealLog(entries?: MealLogLike[] | null): NutritionAdherenceStore {
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

import { slugifyExerciseName } from "@/lib/slugify";

/**
 * Convert new API meal logs to adherence store format.
 * Only includes meals that have been actually logged (completedAt present).
 * Reconstructs the same mealKey format the UI generates: dayKey:mealType:slugifiedTitle
 */
export function buildAdherenceStoreFromMeals(meals: MealLogResponse[]): NutritionAdherenceStore {
  const store: NutritionAdherenceStore = {};
  for (const meal of meals) {
    if (!meal.date || !meal.mealType || !meal.completedAt) continue;
    const current = store[meal.date] ?? [];
    // Reconstruct the same mealKey format as getNutritionMealKey:
    // dayKey:mealType:slugifiedTitle
    const slugTitle = meal.title ? slugifyExerciseName(meal.title) : "";
    const mealKey = slugTitle
      ? `${meal.date}:${meal.mealType.toLowerCase()}:${slugTitle}`
      : `${meal.date}:${meal.mealType.toLowerCase()}`;
    if (!current.includes(mealKey)) {
      store[meal.date] = [...current, mealKey];
    }
  }
  return store;
}

/**
 * Fetch meals from the new API
 */
async function fetchMealsFromAPI(date: string): Promise<MealLogResponse[]> {
  try {
    const response = await getMealsByDate(date);
    return response.items;
  } catch {
    return [];
  }
}

/**
 * Map meal key to meal type (for backward compatibility)
 */
function mapMealKeyToType(mealKey: string): ApiMealType {
  const key = mealKey.toLowerCase();
  if (key.includes("desayuno") || key.includes("breakfast")) return "BREAKFAST";
  if (key.includes("almuerzo") || key.includes("lunch")) return "LUNCH";
  if (key.includes("cena") || key.includes("dinner")) return "DINNER";
  return "SNACK";
}

function getMealTypeStoreKey(mealType: ApiMealType): string {
  return mealType.toLowerCase();
}

export function hasConsumedEntryForKey(entries: string[] | undefined, itemKey: string): boolean {
  if (!Array.isArray(entries) || entries.length === 0) return false;
  // Exact match (preferred — works when optimistic update and API keys align)
  if (entries.includes(itemKey)) return true;
  // Fallback: match by meal type within the same date.
  // The itemKey format is "date:mealType:slugTitle" or "date:mealType".
  // The store entries use the same format from buildAdherenceStoreFromMeals.
  // Extract the date and mealType from the itemKey and check if any entry
  // shares the same date and mealType (handles title slug differences).
  const parts = itemKey.split(":");
  if (parts.length >= 2) {
    const datePart = parts[0];
    const typePart = parts[1].toLowerCase();
    return entries.some((entry) => {
      const entryParts = entry.split(":");
      if (entryParts.length < 2) return false;
      return entryParts[0] === datePart && entryParts[1].toLowerCase() === typePart;
    });
  }
  return false;
}

export const readNutritionAdherenceStore = (): NutritionAdherenceStore => ({});

export const useNutritionAdherence = (dayKey: string) => {
  const [store, setStore] = useState<NutritionAdherenceStore>({});
  const [mealIdMap, setMealIdMap] = useState<MealIdMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStore = useCallback(async () => {
    if (!isBrowser()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Try new API first
      try {
        const meals = await fetchMealsFromAPI(dayKey);
        setStore(buildAdherenceStoreFromMeals(meals));
        // Build meal ID map for delete operations
        const newMealIdMap: MealIdMap = {};
        for (const meal of meals) {
          if (!meal.date || !meal.mealType || !meal.id) continue;
          if (!newMealIdMap[meal.date]) newMealIdMap[meal.date] = {};
          newMealIdMap[meal.date][meal.mealType] = meal.id;
        }
        setMealIdMap(newMealIdMap);
        setError(false);
        setIsLoading(false);
        return;
      } catch {
        // Fall back to legacy tracking if new API fails
      }
      const tracking = await fetchTrackingSnapshot();
      setStore(buildNutritionAdherenceStoreFromMealLog(tracking.mealLog));
      setError(false);
    } catch (_err) {
      setStore({});
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [dayKey]);

  useEffect(() => {
    if (!isBrowser()) return;
    void loadStore();
    // No event listener — toggle uses optimistic updates directly
    return () => {};
  }, [loadStore]);

  const isConsumed = useCallback(
    (itemKey?: string | null, dateKey?: string | null) => {
      const normalizedItemKey = normalizeKey(itemKey);
      const normalizedDateKey = normalizeKey(dateKey);
      if (!normalizedItemKey || !normalizedDateKey) return false;
      return hasConsumedEntryForKey(store[normalizedDateKey], normalizedItemKey);
    },
    [store],
  );

  const toggle = useCallback(async (itemKey?: string | null, dateKey?: string | null, payload?: Partial<MealLogEntry>) => {
    const normalizedItemKey = normalizeKey(itemKey);
    const normalizedDateKey = normalizeKey(dateKey);
    if (!normalizedItemKey || !normalizedDateKey) return;

    const mealType = mapMealKeyToType(normalizedItemKey);
    const currentlyConsumed = Boolean(store[normalizedDateKey]?.includes(normalizedItemKey));

    // Optimistic update
    setStore((prev) => {
      const current = prev[normalizedDateKey] ?? [];
      const next = currentlyConsumed 
        ? current.filter((item) => item !== normalizedItemKey) 
        : [...current, normalizedItemKey];
      const nextStore = { ...prev };
      if (next.length > 0) nextStore[normalizedDateKey] = Array.from(new Set(next));
      else delete nextStore[normalizedDateKey];
      return nextStore;
    });

    try {
      if (currentlyConsumed) {
        // Try new API first for delete
        let deleted = false;
        try {
          // Check if we have the meal ID in our map
          let mealId: string | undefined = mealIdMap[normalizedDateKey]?.[mealType];
          
          // If not in map, fetch meals for this date to find the ID
          if (!mealId) {
            const response = await getMealsByDate(normalizedDateKey);
            const meal = response.items.find(m => m.mealType === mealType);
            mealId = meal?.id;
          }
          
          if (mealId) {
            await deleteMealLog(mealId);
            // Remove from local ID map
            setMealIdMap(prev => {
              const next = { ...prev };
              if (next[normalizedDateKey]) {
                delete next[normalizedDateKey][mealType];
              }
              return next;
            });
            deleted = true;
          }
        } catch {
          // Fall back to legacy tracking if new API fails
        }
        
        if (!deleted) {
          const entryId = buildMealLogId(normalizedDateKey, normalizedItemKey);
          const response = await fetch(`/api/tracking/mealLog/${encodeURIComponent(entryId)}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!response.ok && response.status !== 204) {
            throw new Error(`TRACKING_DELETE_FAILED:${response.status}`);
          }
        }
      } else {
        // Try new API first for create
        try {
          const created = await createMealLog({
            date: normalizedDateKey,
            mealType,
            title: payload?.title ?? normalizedItemKey,
            calories: payload?.calories,
            protein: payload?.protein,
            carbs: payload?.carbs,
            fats: payload?.fats,
          });
          // Store the meal ID in our map for future delete operations
          setMealIdMap(prev => {
            const next = { ...prev };
            if (!next[normalizedDateKey]) next[normalizedDateKey] = {};
            next[normalizedDateKey][mealType] = created.id;
            return next;
          });
        } catch {
          // Fall back to legacy tracking
          const response = await fetch("/api/tracking", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              collection: "mealLog",
              item: {
                id: buildMealLogId(normalizedDateKey, normalizedItemKey),
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
      }
      // Do NOT reload from API after successful toggle — the optimistic update
      // is the source of truth. Reloading would replace the UI-generated mealKey
      // with an API-reconstructed key that may not match exactly, causing
      // meals to appear "unconsumed" again.
    } catch (_err) {
      await loadStore();
      throw _err;
    }
  }, [loadStore, store, mealIdMap]);

  const clearDay = useCallback(async (dateKey?: string | null) => {
    const normalizedDateKey = normalizeKey(dateKey);
    if (!normalizedDateKey) return;
    const mealKeys = store[normalizedDateKey] ?? [];

    // Optimistic update: clear all entries for this day immediately
    setStore((prev) => {
      const next = { ...prev };
      delete next[normalizedDateKey];
      return next;
    });

    // Try new API first for bulk delete
    try {
      const response = await getMealsByDate(normalizedDateKey);
      const meals = response.items;
      if (meals.length > 0) {
        await Promise.all(meals.map(meal => deleteMealLog(meal.id)));
        return;
      }
    } catch {
      // Fall back to legacy tracking if new API fails
    }

    // Legacy tracking fallback
    await Promise.all(
      mealKeys.map((mealKey) =>
        fetch(`/api/tracking/mealLog/${encodeURIComponent(buildMealLogId(normalizedDateKey, mealKey))}`, {
          method: "DELETE",
          credentials: "include",
        }),
      ),
    );
    // No loadStore() — optimistic update is already correct
  }, [store]);

  return {
    isLoading,
    error,
    isConsumed,
    toggle,
    clearDay,
  };
};

/**
 * Fetch meals for multiple dates and build a unified store
 */
async function fetchMealsForDates(dates: string[]): Promise<NutritionAdherenceStore> {
  const store: NutritionAdherenceStore = {};
  
  await Promise.all(
    dates.map(async (date) => {
      try {
        const meals = await fetchMealsFromAPI(date);
        const mealsForDate = buildAdherenceStoreFromMeals(meals);
        if (mealsForDate[date]) {
          store[date] = mealsForDate[date];
        }
      } catch {
        // Silently fail for individual dates
      }
    })
  );
  
  return store;
}

/**
 * Hook for nutrition adherence across multiple days (e.g., a week)
 * This prevents the flicker issue by loading all days at once
 */
export const useNutritionAdherenceWeek = (dateKeys: string[]) => {
  const [store, setStore] = useState<NutritionAdherenceStore>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  // Track which dates have already been loaded to avoid unnecessary reloads
  const loadedDatesRef = useRef<Set<string>>(new Set());

  const loadStore = useCallback(async (keys: string[]) => {
    if (!isBrowser() || keys.length === 0) {
      setIsLoading(false);
      return;
    }
    // Only load dates that haven't been loaded yet
    const newDates = keys.filter(k => !loadedDatesRef.current.has(k));
    if (newDates.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const apiStore = await fetchMealsForDates(newDates);
      // Mark these dates as loaded
      newDates.forEach(d => loadedDatesRef.current.add(d));
      // MERGE: preserve optimistic updates for days not in the API response
      setStore((prev) => {
        const merged = { ...prev };
        for (const key of newDates) {
          if (apiStore[key] && apiStore[key].length > 0) {
            merged[key] = apiStore[key];
          }
        }
        return merged;
      });
      setError(false);
    } catch (_err) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies — uses ref for loaded dates

  useEffect(() => {
    if (!isBrowser()) return;
    void loadStore(dateKeys);
    return () => {};
  }, [dateKeys.join(","), loadStore]);

  const isConsumed = useCallback(
    (itemKey?: string | null, dateKey?: string | null) => {
      const normalizedItemKey = normalizeKey(itemKey);
      const normalizedDateKey = normalizeKey(dateKey);
      if (!normalizedItemKey || !normalizedDateKey) return false;
      return hasConsumedEntryForKey(store[normalizedDateKey], normalizedItemKey);
    },
    [store],
  );

  const toggle = useCallback(async (itemKey?: string | null, dateKey?: string | null, payload?: Partial<MealLogEntry>) => {
    const normalizedItemKey = normalizeKey(itemKey);
    const normalizedDateKey = normalizeKey(dateKey);
    if (!normalizedItemKey || !normalizedDateKey) return;

    const mealType = mapMealKeyToType(normalizedItemKey);
    const currentlyConsumed = Boolean(store[normalizedDateKey]?.includes(normalizedItemKey));

    // Optimistic update
    setStore((prev) => {
      const current = prev[normalizedDateKey] ?? [];
      const next = currentlyConsumed 
        ? current.filter((item) => item !== normalizedItemKey) 
        : [...current, normalizedItemKey];
      const nextStore = { ...prev };
      if (next.length > 0) nextStore[normalizedDateKey] = Array.from(new Set(next));
      else delete nextStore[normalizedDateKey];
      return nextStore;
    });

    try {
      if (currentlyConsumed) {
        // Try new API first for delete
        let deleted = false;
        try {
          // Fetch meals for this date to find the ID
          const response = await getMealsByDate(normalizedDateKey);
          const meal = response.items.find(m => m.mealType === mealType);
          
          if (meal?.id) {
            await deleteMealLog(meal.id);
            deleted = true;
          }
        } catch {
          // Fall back to legacy tracking if new API fails
        }
        
        if (!deleted) {
          const entryId = buildMealLogId(normalizedDateKey, normalizedItemKey);
          const response = await fetch(`/api/tracking/mealLog/${encodeURIComponent(entryId)}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!response.ok && response.status !== 204) {
            throw new Error(`TRACKING_DELETE_FAILED:${response.status}`);
          }
        }
      } else {
        // Try new API first for create
        try {
          await createMealLog({
            date: normalizedDateKey,
            mealType,
            title: payload?.title ?? normalizedItemKey,
            calories: payload?.calories,
            protein: payload?.protein,
            carbs: payload?.carbs,
            fats: payload?.fats,
          });
        } catch {
          // Fall back to legacy tracking
          const response = await fetch("/api/tracking", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              collection: "mealLog",
              item: {
                id: buildMealLogId(normalizedDateKey, normalizedItemKey),
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
      }
      // Do NOT reload from API after successful toggle — the optimistic update
      // is the source of truth.
    } catch (_err) {
      await loadStore(dateKeys);
      throw _err;
    }
  }, [loadStore, store, dateKeys]);

  const clearDay = useCallback(async (dateKey?: string | null) => {
    const normalizedDateKey = normalizeKey(dateKey);
    if (!normalizedDateKey) return;
    const mealKeys = store[normalizedDateKey] ?? [];

    // Optimistic update: clear all entries for this day immediately
    setStore((prev) => {
      const next = { ...prev };
      delete next[normalizedDateKey];
      return next;
    });

    // Try new API first for bulk delete
    try {
      const response = await getMealsByDate(normalizedDateKey);
      const meals = response.items;
      if (meals.length > 0) {
        await Promise.all(meals.map(meal => deleteMealLog(meal.id)));
        return;
      }
    } catch {
      // Fall back to legacy tracking if new API fails
    }

    // Legacy tracking fallback
    await Promise.all(
      mealKeys.map((mealKey) =>
        fetch(`/api/tracking/mealLog/${encodeURIComponent(buildMealLogId(normalizedDateKey, mealKey))}`, {
          method: "DELETE",
          credentials: "include",
        }),
      ),
    );
    // No loadStore() — optimistic update is already correct
  }, [store]);

  return {
    isLoading,
    error,
    isConsumed,
    toggle,
    clearDay,
  };
};
