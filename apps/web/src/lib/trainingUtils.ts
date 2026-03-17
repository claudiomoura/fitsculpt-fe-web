import type { SessionTime, TrainingLevel, Goal, TrainingPlanData } from "@/lib/profile";

export type Exercise = {
  id?: string;
  name: string;
  sets?: number;
  reps?: string;
  duration?: number;
  weight?: number;
  rpe?: number;
  notes?: string;
  completed?: boolean;
  exerciseId?: string;
  customSetGroups?: Array<{ sets: number; reps: string; weight?: number; rpe?: number }>;
};

export type TrainingDay = {
  id?: string;
  dayLabel?: string;
  focus?: string;
  exercises?: Exercise[];
  duration?: number;
  date?: string;
  completed?: boolean;
};

export type TrainingPlan = Omit<TrainingPlanData, "days"> & {
  days: TrainingDay[];
};

export type TrainingForm = {
  level: TrainingLevel;
  goal: Goal;
  daysPerWeek: number;
  focus: string;
  equipment: string[];
  injuries: string[];
  duration: number;
};

export type ActiveTrainingPlanResponse = {
  plan?: TrainingPlan | null;
  origin?: ActivePlanOrigin;
};

export type ActivePlanOrigin = "selected" | "assigned";

export const SELECTED_PLAN_STORAGE_KEY = "fs_selected_plan_id";
export const LEGACY_ACTIVE_PLAN_STORAGE_KEY = "fs_active_training_plan_id";
export const TRAINING_PLANS_UPDATED_AT_KEY = "fs_training_plans_updated_at";
export const AUTO_AI_TRIGGER_GUARD_TTL_MS = 4000;

export type AiUsageSummary = {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  balanceAfter?: number;
};

export type AiTokenSnapshot = {
  tokens: number | null;
};

export type ExerciseDetailState = {
  exerciseId: string | null;
  isLoading: boolean;
  error: string | null;
};

export type ExerciseCatalogItem = {
  id: string;
  name: string;
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: string;
  description?: string;
};

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export const baseExercisePool = [
  { name: "Press banca", muscle: "pecho" },
  { name: "Press militar", muscle: "hombros" },
  { name: "Sentadilla", muscle: "piernas" },
  { name: "Peso muerto", muscle: "espalda" },
  { name: "Dominadas", muscle: "espalda" },
  { name: "Fondos", muscle: "pecho" },
  { name: "Curl biceps", muscle: "biceps" },
  { name: "Extensiones tríceps", muscle: "triceps" },
  { name: "Elevaciones laterales", muscle: "hombros" },
  { name: "Prensa", muscle: "piernas" },
  { name: "Remo con barra", muscle: "espalda" },
  { name: "Hip thrust", muscle: "piernas" },
];

export const EXERCISE_POOL = baseExercisePool.reduce((acc, ex) => {
  if (!acc[ex.muscle]) acc[ex.muscle] = [];
  acc[ex.muscle].push(ex.name);
  return acc;
}, {} as Record<string, string[]>);

export const DAY_LABEL_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function durationFromSessionTime(sessionTime: SessionTime): number {
  if (typeof sessionTime === "number") return sessionTime;
  if (typeof sessionTime === "string") {
    const parsed = parseInt(sessionTime, 10);
    return Number.isFinite(parsed) ? parsed : 45;
  }
  return 45;
}

export function setsForLevel(level: TrainingLevel, goal: Goal): string {
  const setsMap: Partial<Record<TrainingLevel, Partial<Record<Goal, string>>>> = {
    beginner: { cut: "3x10", maintain: "3x10", bulk: "3x10" },
    intermediate: { cut: "4x8", maintain: "3x10-12", bulk: "4x8" },
    advanced: { cut: "5x5", maintain: "4x8-12", bulk: "5x5" },
  };
  return setsMap[level]?.[goal] || "3x10";
}

export function buildExercises(list: string[], sets: string, maxItems: number, t: (key: string) => string): Exercise[] {
  return list.slice(0, maxItems).map((name) => ({
    name,
    sets: parseInt(sets.split("x")[0], 10) || 3,
    reps: sets.split("x")[1] || "10",
  }));
}

export function createEmptyPlan(daysPerWeek: number, _locale: string, t: (key: string) => string): { days: TrainingDay[] } {
  const days: TrainingDay[] = [];
  for (let i = 0; i < daysPerWeek; i++) {
    days.push({
      dayLabel: t(`calendar.days.${DAY_LABEL_KEYS[i % 7]}`),
      focus: t("training.restDay"),
      exercises: [],
      duration: 0,
    });
  }
  return { days };
}

export function shouldTriggerAiGeneration(aiQueryParam: string | null): boolean {
  return aiQueryParam === "1" || aiQueryParam === "true";
}

export type PeriodizationPhase = "accumulation" | "realization" | "deload" | "peak";

export const periodization = {
  accumulation: { weeks: 3, volume: 1.0, intensity: 0.7 },
  realization: { weeks: 1, volume: 0.8, intensity: 0.9 },
  deload: { weeks: 1, volume: 0.5, intensity: 0.6 },
  peak: { weeks: 1, volume: 0.6, intensity: 1.0 },
};
