import type { ExerciseCatalogItem } from "../ai/trainingPlanExerciseResolution.js";

const FOCUS_PATTERNS: Record<string, string[]> = {
  pierna: ["sentadilla", "prensa", "zancada", "lunge", "femoral", "cuadricep", "quad", "glute", "pantorr", "hip thrust", "peso muerto"],
  empuje: ["press", "flexion", "fondo", "tricep", "hombro", "militar", "apertura", "elevacion lateral"],
  tiron: ["remo", "dominada", "jalon", "curl", "bicep", "espalda", "face pull"],
  core: ["plancha", "abdominal", "crunch", "core", "russian twist", "hollow"],
};

type PickExerciseOptions = {
  equipment?: "gym" | "home";
  seed?: string;
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

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededSort(catalog: ExerciseCatalogItem[], seed: string) {
  return [...catalog].sort((a, b) => {
    const aHash = hashString(`${seed}:${a.id}:${normalize(a.name)}`);
    const bHash = hashString(`${seed}:${b.id}:${normalize(b.name)}`);
    if (aHash !== bHash) return aHash - bHash;
    return a.id.localeCompare(b.id);
  });
}

function supportsEquipment(exercise: ExerciseCatalogItem, equipment: "gym" | "home") {
  if (!exercise.equipment || !exercise.equipment.trim()) {
    return true;
  }
  const normalized = normalize(exercise.equipment);
  if (equipment === "home") {
    return (
      normalized.includes("bodyweight") ||
      normalized.includes("peso corporal") ||
      normalized.includes("mancuerna") ||
      normalized.includes("banda") ||
      normalized.includes("kettlebell") ||
      normalized.includes("home")
    );
  }
  return true;
}

export function pickExercisesForFocus(catalog: ExerciseCatalogItem[], focus: string, count: number, options: PickExerciseOptions = {}) {
  const normalizedFocus = normalize(focus);
  const seed = options.seed ?? normalizedFocus;
  const ordered = seededSort(catalog, seed);
  const targetEquipment = options.equipment;
  const byEquipment =
    targetEquipment && catalog.some((exercise) => supportsEquipment(exercise, targetEquipment))
      ? ordered.filter((exercise) => supportsEquipment(exercise, targetEquipment))
      : ordered;

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

  const primary = byEquipment.filter((exercise) => {
    const exerciseName = normalize(exercise.name);
    return patterns.some((pattern) => exerciseName.includes(pattern));
  });

  const fallback = byEquipment.filter((exercise) => !primary.some((candidate) => candidate.id === exercise.id));
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
