import type { ExerciseCatalogItem } from "../ai/trainingPlanExerciseResolution.js";

const FOCUS_PATTERNS: Record<string, string[]> = {
  pierna: ["sentadilla", "prensa", "zancada", "lunge", "femoral", "cuadricep", "quad", "glute", "pantorr", "hip thrust", "peso muerto"],
  empuje: ["press", "flexion", "fondo", "tricep", "hombro", "militar", "apertura", "elevacion lateral"],
  tiron: ["remo", "dominada", "jalon", "curl", "bicep", "espalda", "face pull"],
  core: ["plancha", "abdominal", "crunch", "core", "russian twist", "hollow"],
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function uniqueById(exercises: ExerciseCatalogItem[]) {
  const seen = new Set<string>();
  return exercises.filter((exercise) => {
    if (seen.has(exercise.id)) return false;
    seen.add(exercise.id);
    return true;
  });
}

export function pickExercisesForFocus(catalog: ExerciseCatalogItem[], focus: string, count: number) {
  const normalizedFocus = normalize(focus);
  const ordered = [...catalog].sort((a, b) => a.name.localeCompare(b.name));
  const patterns =
    normalizedFocus.includes("pierna")
      ? FOCUS_PATTERNS.pierna
      : normalizedFocus.includes("empu") || normalizedFocus.includes("push")
        ? FOCUS_PATTERNS.empuje
        : normalizedFocus.includes("tiron") || normalizedFocus.includes("pull")
          ? FOCUS_PATTERNS.tiron
          : normalizedFocus.includes("core") || normalizedFocus.includes("abs")
            ? FOCUS_PATTERNS.core
            : [];

  const primary = ordered.filter((exercise) => {
    const exerciseName = normalize(exercise.name);
    return patterns.some((pattern) => exerciseName.includes(pattern));
  });

  const fallback = ordered.filter((exercise) => !primary.some((candidate) => candidate.id === exercise.id));
  const selection = uniqueById([...primary, ...fallback]).slice(0, count);

  if (selection.length === 0) {
    throw new Error("EXERCISE_CATALOG_EMPTY");
  }

  if (selection.length >= count) {
    return selection;
  }

  const cycled = [...selection];
  let index = 0;
  while (cycled.length < count) {
    cycled.push(selection[index % selection.length]);
    index += 1;
  }
  return cycled;
}
