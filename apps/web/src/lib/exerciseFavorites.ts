import { useEffect, useState } from "react";

export const EXERCISE_FAVORITES_STORAGE_KEY = "fs_exercise_favorites";
export const EXERCISE_FAVORITES_LIMIT = 50;

const isBrowser = () => typeof window !== "undefined";

const normalizeFavorites = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const entries = value.filter((item): item is string => typeof item === "string");
  return Array.from(new Set(entries)).slice(0, EXERCISE_FAVORITES_LIMIT);
};

export const getExerciseFavorites = (): string[] => {
  if (!isBrowser()) return [];
  try {
    const stored = window.localStorage.getItem(EXERCISE_FAVORITES_STORAGE_KEY);
    if (!stored) return [];
    return normalizeFavorites(JSON.parse(stored));
  } catch {
    return [];
  }
};

export const setExerciseFavorites = (favorites: string[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(EXERCISE_FAVORITES_STORAGE_KEY, JSON.stringify(normalizeFavorites(favorites)));
  } catch {
    // ignore storage errors
  }
};

export const toggleExerciseFavorite = (exerciseId: string) => {
  if (!isBrowser()) return [];
  const current = getExerciseFavorites();
  const next = current.includes(exerciseId)
    ? current.filter((id) => id !== exerciseId)
    : [exerciseId, ...current].slice(0, EXERCISE_FAVORITES_LIMIT);
  setExerciseFavorites(next);
  return next;
};

export const useExerciseFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!isBrowser()) return;
    const refresh = () => setFavorites(getExerciseFavorites());
    refresh();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === EXERCISE_FAVORITES_STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleFavorite = (exerciseId: string) => {
    const next = toggleExerciseFavorite(exerciseId);
    setFavorites(next);
  };

  return { favorites, toggleFavorite, setFavorites };
};
