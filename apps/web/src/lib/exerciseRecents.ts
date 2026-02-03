import { useEffect, useState } from "react";
import type { Exercise } from "@/lib/types";

export type ExerciseRecent = Pick<
  Exercise,
  | "id"
  | "name"
  | "equipment"
  | "description"
  | "posterUrl"
  | "imageUrl"
  | "mainMuscleGroup"
  | "secondaryMuscleGroups"
  | "primaryMuscles"
  | "secondaryMuscles"
>;

export const EXERCISE_RECENTS_STORAGE_KEY = "fs_exercise_recents";
export const EXERCISE_RECENTS_LIMIT = 10;

const isBrowser = () => typeof window !== "undefined";

const normalizeArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const entries = value.filter((item) => typeof item === "string");
  return entries.length > 0 ? entries : null;
};

const normalizeRecent = (value: unknown): ExerciseRecent | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const name = typeof record.name === "string" ? record.name : null;
  if (!id || !name) return null;

  return {
    id,
    name,
    equipment: typeof record.equipment === "string" ? record.equipment : null,
    description: typeof record.description === "string" ? record.description : null,
    posterUrl: typeof record.posterUrl === "string" ? record.posterUrl : null,
    imageUrl: typeof record.imageUrl === "string" ? record.imageUrl : null,
    mainMuscleGroup: typeof record.mainMuscleGroup === "string" ? record.mainMuscleGroup : null,
    secondaryMuscleGroups: normalizeArray(record.secondaryMuscleGroups),
    primaryMuscles: normalizeArray(record.primaryMuscles),
    secondaryMuscles: normalizeArray(record.secondaryMuscles),
  };
};

export const getExerciseRecents = (): ExerciseRecent[] => {
  if (!isBrowser()) return [];
  try {
    const stored = window.localStorage.getItem(EXERCISE_RECENTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecent).filter((item): item is ExerciseRecent => Boolean(item));
  } catch {
    return [];
  }
};

export const setExerciseRecents = (recents: ExerciseRecent[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(EXERCISE_RECENTS_STORAGE_KEY, JSON.stringify(recents));
  } catch {
    // ignore storage errors
  }
};

export const clearExerciseRecents = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(EXERCISE_RECENTS_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

export const addExerciseRecent = (exercise: Exercise) => {
  if (!isBrowser()) return [];
  const recent: ExerciseRecent = {
    id: exercise.id,
    name: exercise.name,
    equipment: exercise.equipment ?? null,
    description: exercise.description ?? null,
    posterUrl: exercise.posterUrl ?? null,
    imageUrl: exercise.imageUrl ?? null,
    mainMuscleGroup: exercise.mainMuscleGroup ?? null,
    secondaryMuscleGroups: exercise.secondaryMuscleGroups ?? null,
    primaryMuscles: exercise.primaryMuscles ?? null,
    secondaryMuscles: exercise.secondaryMuscles ?? null,
  };

  const current = getExerciseRecents();
  const filtered = current.filter((item) => item.id !== recent.id);
  const next = [recent, ...filtered].slice(0, EXERCISE_RECENTS_LIMIT);
  setExerciseRecents(next);
  return next;
};

export const useExerciseRecents = () => {
  const [recents, setRecents] = useState<ExerciseRecent[]>([]);

  useEffect(() => {
    if (!isBrowser()) return;
    const refresh = () => setRecents(getExerciseRecents());
    refresh();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === EXERCISE_RECENTS_STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const clearRecents = () => {
    clearExerciseRecents();
    setRecents([]);
  };

  return { recents, clearRecents, setRecents };
};
