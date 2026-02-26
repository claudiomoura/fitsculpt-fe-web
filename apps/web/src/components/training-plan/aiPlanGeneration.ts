import { addDays, parseDate, startOfWeek, toDateKey } from "@/lib/calendar";
import type { ProfileData, SessionTime, TrainingEquipment, TrainingFocus, TrainingLevel, Goal, TrainingPlanData } from "@/lib/profile";
import { updateUserProfile } from "@/lib/profileService";
import { normalizeAiErrorCode } from "@/lib/aiErrorMapping";

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
  planId?: string;
  aiTokenBalance?: number;
  aiTokenRenewalAt?: string | null;
  usage?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    balanceAfter?: number;
  };
  aiRequestId?: string;
  balanceAfter?: number;
  metadata: AdjustmentMetadata;
};

export class AiPlanRequestError extends Error {
  status: number;
  code?: string;
  hint?: string;

  constructor(message: string, status: number, options?: { code?: string; hint?: string }) {
    super(message);
    this.name = "AiPlanRequestError";
    this.status = status;
    this.code = options?.code;
    this.hint = options?.hint;
  }
}

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
  } catch (_err) {
    return value;
  }
}

export async function requestAiTrainingPlan(profile: ProfileData, input: TrainingPreferencesInput): Promise<TrainingPlanAiResult> {
  const startDate = toDateKey(startOfWeek(new Date()));
  const response = await fetch("/api/ai/training-plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: profile.name || undefined,
      age: profile.age,
      sex: profile.sex,
      experienceLevel: input.level,
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
      | { error?: string; message?: string; retryAfterSec?: number; hint?: string }
      | null;
    const errorCode = normalizeAiErrorCode(payload?.error);
    if (errorCode === "INSUFFICIENT_TOKENS") {
      throw new AiPlanRequestError("INSUFFICIENT_TOKENS", response.status, {
        code: errorCode,
        hint: payload?.hint,
      });
    }
    if (response.status === 400) {
      throw new AiPlanRequestError("AI_INPUT_INVALID", response.status, {
        code: errorCode ?? "AI_INPUT_INVALID",
        hint: payload?.hint,
      });
    }
    if (response.status === 429) {
      throw new AiPlanRequestError("RATE_LIMITED", response.status, {
        code: errorCode ?? "RATE_LIMITED",
        hint: payload?.hint,
      });
    }
    throw new AiPlanRequestError("AI_GENERATION_FAILED", response.status, {
      code: errorCode ?? undefined,
      hint: payload?.hint,
    });
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
    planId: typeof data?.planId === "string" ? data.planId : undefined,
    aiTokenBalance: typeof data?.aiTokenBalance === "number" ? data.aiTokenBalance : undefined,
    aiTokenRenewalAt:
      typeof data?.aiTokenRenewalAt === "string" || data?.aiTokenRenewalAt === null
        ? (data.aiTokenRenewalAt as string | null)
        : undefined,
    usage: isRecord(data?.usage)
      ? {
          totalTokens:
            typeof data.usage.totalTokens === "number"
              ? data.usage.totalTokens
              : typeof data.usage.total_tokens === "number"
                ? data.usage.total_tokens
                : undefined,
          promptTokens:
            typeof data.usage.promptTokens === "number"
              ? data.usage.promptTokens
              : typeof data.usage.prompt_tokens === "number"
                ? data.usage.prompt_tokens
                : undefined,
          completionTokens:
            typeof data.usage.completionTokens === "number"
              ? data.usage.completionTokens
              : typeof data.usage.completion_tokens === "number"
                ? data.usage.completion_tokens
                : undefined,
          balanceAfter: typeof data.usage.balanceAfter === "number" ? data.usage.balanceAfter : undefined,
        }
      : undefined,
    aiRequestId: typeof data?.aiRequestId === "string" ? data.aiRequestId : undefined,
    balanceAfter: typeof data?.balanceAfter === "number" ? data.balanceAfter : undefined,
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
