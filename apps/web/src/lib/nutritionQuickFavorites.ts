import { useCallback, useEffect, useState } from "react";

export const NUTRITION_QUICK_FAVORITES_STORAGE_KEY = "fs_nutrition_quick_favorites_v1";
export const NUTRITION_QUICK_FAVORITES_LIMIT = 30;

export type NutritionQuickFavorite = {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  description?: string | null;
  calories?: number | null;
  source: "device-local";
};

const isBrowser = () => typeof window !== "undefined";

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeFavorite = (value: unknown): NutritionQuickFavorite | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const id = normalizeText(candidate.id);
  const title = normalizeText(candidate.title);
  const mealType = candidate.mealType;
  if (!id || !title) return null;
  if (mealType !== "breakfast" && mealType !== "lunch" && mealType !== "dinner" && mealType !== "snack") {
    return null;
  }
  const description = normalizeText(candidate.description);
  const rawCalories = candidate.calories;
  const calories = typeof rawCalories === "number" && Number.isFinite(rawCalories) ? rawCalories : null;

  return {
    id,
    title,
    mealType,
    description: description.length > 0 ? description : null,
    calories,
    source: "device-local",
  };
};

const normalizeFavorites = (value: unknown): NutritionQuickFavorite[] => {
  if (!Array.isArray(value)) return [];
  const favorites: NutritionQuickFavorite[] = [];
  const seen = new Set<string>();

  value.forEach((entry) => {
    const favorite = normalizeFavorite(entry);
    if (!favorite || seen.has(favorite.id)) return;
    seen.add(favorite.id);
    favorites.push(favorite);
  });

  return favorites.slice(0, NUTRITION_QUICK_FAVORITES_LIMIT);
};

const readFavorites = () => {
  if (!isBrowser()) return [];
  try {
    const stored = window.localStorage.getItem(NUTRITION_QUICK_FAVORITES_STORAGE_KEY);
    if (!stored) return [];
    return normalizeFavorites(JSON.parse(stored));
  } catch (_err) {
    return [];
  }
};

const writeFavorites = (favorites: NutritionQuickFavorite[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      NUTRITION_QUICK_FAVORITES_STORAGE_KEY,
      JSON.stringify(normalizeFavorites(favorites))
    );
  } catch (_err) {
    // ignore storage errors
  }
};

export const useNutritionQuickFavorites = () => {
  const [favorites, setFavorites] = useState<NutritionQuickFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(() => {
    if (!isBrowser()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setFavorites(readFavorites());
      setHasError(false);
    } catch (_err) {
      setFavorites([]);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === NUTRITION_QUICK_FAVORITES_STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const toggleFavorite = useCallback((favorite: NutritionQuickFavorite) => {
    const current = readFavorites();
    const exists = current.some((entry) => entry.id === favorite.id);
    const next = exists
      ? current.filter((entry) => entry.id !== favorite.id)
      : [favorite, ...current].slice(0, NUTRITION_QUICK_FAVORITES_LIMIT);
    writeFavorites(next);
    setFavorites(next);
    return { next, exists };
  }, []);

  return {
    favorites,
    loading,
    hasError,
    refresh,
    toggleFavorite,
  };
};
