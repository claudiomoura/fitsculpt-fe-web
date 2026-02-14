import { addDays, parseDate, startOfWeek, toDateKey } from "@/lib/calendar";
import type { ProfileData, SessionTime, TrainingEquipment, TrainingFocus, TrainingLevel, Goal, TrainingPlanData } from "@/lib/profile";
import { updateUserProfile } from "@/lib/profileService";

type UnknownRecord = Record<string, unknown>;

type TrainingDay = NonNullable<TrainingPlanData["days"]>[number];

type TrainingPlan = Omit<TrainingPlanData, "days"> & {
  days: TrainingDay[];
};

export type TrainingPreferencesInput = {
  goal: Goal;
  level: TrainingLevel;
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  equipment: TrainingEquipment;
  focus: TrainingFocus;
  sessionTime: SessionTime;
};

type AdjustmentMetadata = {
  updatedAt?: string;
  effectiveFrom?: string;
  weekStart?: string;
};

export type TrainingPlanAiResult = {
  plan: TrainingPlan;
  aiTokenBalance?: number;
  aiTokenRenewalAt?: string | null;
  metadata: AdjustmentMetadata;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeExercise(value: unknown): TrainingDay["exercises"][number] | null {
  if (!isRecord(value)) return null;
  const name = normalizeString(value.name);
  if (!name) return null;
  const sets = typeof value.sets === "number" || typeof value.sets === "string" ? value.sets : "";
  const reps = typeof value.reps === "string" ? value.reps : undefined;
  return { name, sets: sets === "" ? "-" : sets, reps };
}

function normalizeDay(value: unknown): TrainingDay | null {
  if (!isRecord(value)) return null;
  const label = normalizeString(value.label);
  const focus = normalizeString(value.focus);
  const duration = typeof value.duration === "number" && Number.isFinite(value.duration) ? value.duration : 45;
  const exercises = Array.isArray(value.exercises) ? value.exercises.map(normalizeExercise).filter(Boolean) as TrainingDay["exercises"] : [];
  if (!label || !focus || exercises.length === 0) return null;
  return {
    date: typeof value.date === "string" ? value.date : undefined,
    label,
    focus,
    duration,
    exercises,
  };
}

function parsePlanPayload(payload: unknown): TrainingPlan | null {
  if (!isRecord(payload)) return null;
  const rawDays = Array.isArray(payload.days) ? payload.days : [];
  const days = rawDays.map(normalizeDay).filter(Boolean) as TrainingDay[];
  if (days.length === 0) return null;
  return {
    title: typeof payload.title === "string" ? payload.title : undefined,
    notes: typeof payload.notes === "string" ? payload.notes : undefined,
    startDate: typeof payload.startDate === "string" ? payload.startDate : null,
    days,
  };
}

function ensurePlanStartDate(planData: TrainingPlan, date = new Date()): TrainingPlan {
  const baseDate = parseDate(planData.startDate ?? undefined) ?? date;
  const days = planData.days.map((day, index) => ({
    ...day,
    date: day.date ?? toDateKey(addDays(baseDate, index)),
  }));
  return { ...planData, startDate: baseDate.toISOString(), days };
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function requestAiTrainingPlan(profile: ProfileData, input: TrainingPreferencesInput): Promise<TrainingPlanAiResult> {
  const startDate = toDateKey(startOfWeek(new Date()));
  const response = await fetch("/api/ai/training-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: profile.name || undefined,
      age: profile.age,
      sex: profile.sex,
      level: input.level,
      goal: input.goal,
      goals: profile.goals,
      equipment: input.equipment,
      daysPerWeek: input.daysPerWeek,
      startDate,
      daysCount: 7,
      sessionTime: input.sessionTime,
      focus: input.focus,
      timeAvailableMinutes: input.sessionTime === "short" ? 35 : input.sessionTime === "medium" ? 50 : 65,
      includeCardio: profile.trainingPreferences.includeCardio,
      includeMobilityWarmups: profile.trainingPreferences.includeMobilityWarmups,
      workoutLength: profile.trainingPreferences.workoutLength,
      timerSound: profile.trainingPreferences.timerSound,
      injuries: profile.injuries || undefined,
      restrictions: profile.notes || undefined,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string; retryAfterSec?: number }
      | null;
    if (payload?.error === "INSUFFICIENT_TOKENS") throw new Error("INSUFFICIENT_TOKENS");
    if (response.status === 429) throw new Error(payload?.message ?? "RATE_LIMITED");
    throw new Error("AI_GENERATION_FAILED");
  }

  const rawData = tryParseJson(await response.json());
  const data = isRecord(rawData) ? rawData : null;
  const maybePlanPayload = tryParseJson(data?.plan ?? data);
  const plan = parsePlanPayload(maybePlanPayload);
  if (!plan) {
    throw new Error("INVALID_AI_OUTPUT");
  }

  return {
    plan: ensurePlanStartDate(plan),
    aiTokenBalance: typeof data?.aiTokenBalance === "number" ? data.aiTokenBalance : undefined,
    aiTokenRenewalAt:
      typeof data?.aiTokenRenewalAt === "string" || data?.aiTokenRenewalAt === null
        ? (data.aiTokenRenewalAt as string | null)
        : undefined,
    metadata: {
      updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : undefined,
      effectiveFrom: typeof data?.effectiveFrom === "string" ? data.effectiveFrom : undefined,
      weekStart: typeof data?.weekStart === "string" ? data.weekStart : undefined,
    },
  };
}

export async function saveAiTrainingPlan(plan: TrainingPlan) {
  return updateUserProfile({ trainingPlan: ensurePlanStartDate(plan) });
}
