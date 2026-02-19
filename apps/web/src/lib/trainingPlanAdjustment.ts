import { addDays, parseDate, startOfWeek, toDateKey } from "@/lib/calendar";
import { isProfileComplete } from "@/lib/profileCompletion";
import type {
  Goal,
  ProfileData,
  SessionTime,
  TrainingEquipment,
  TrainingFocus,
  TrainingLevel,
  TrainingPlanData,
} from "@/lib/profile";
import { updateUserProfile } from "@/lib/profileService";

type TrainingDay = NonNullable<TrainingPlanData>["days"][number];

type TrainingPlan = Omit<TrainingPlanData, "days"> & {
  days: TrainingDay[];
};

type TrainingPreferencesInput = {
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

export type TrainingPlanAdjustmentResult = {
  profile: ProfileData;
  aiTokenBalance?: number;
  aiTokenRenewalAt?: string | null;
  metadata: AdjustmentMetadata;
};

function ensurePlanStartDate(planData: TrainingPlan, date = new Date()): TrainingPlan {
  const baseDate = parseDate(planData.startDate) ?? date;
  const days = planData.days.map((day, index) => ({
    ...day,
    date: day.date ?? toDateKey(addDays(baseDate, index)),
  }));
  return { ...planData, startDate: baseDate.toISOString(), days };
}

function isTrainingPreferencesInput(value: Partial<TrainingPreferencesInput>): value is TrainingPreferencesInput {
  return Boolean(
    value.goal &&
      value.level &&
      value.daysPerWeek &&
      value.equipment &&
      value.focus &&
      value.sessionTime
  );
}

export function getTrainingAdjustmentInput(profile: ProfileData): TrainingPreferencesInput | null {
  const input: Partial<TrainingPreferencesInput> = {
    goal: profile.goal || undefined,
    level: profile.trainingPreferences.level || undefined,
    daysPerWeek:
      profile.trainingPreferences.daysPerWeek === null
        ? undefined
        : (profile.trainingPreferences.daysPerWeek as TrainingPreferencesInput["daysPerWeek"] | undefined),
    equipment: profile.trainingPreferences.equipment || undefined,
    focus: profile.trainingPreferences.focus || undefined,
    sessionTime: profile.trainingPreferences.sessionTime || undefined,
  };
  return isTrainingPreferencesInput(input) ? input : null;
}

export function canApplyTrainingAdjustment(profile: ProfileData): boolean {
  return Boolean(isProfileComplete(profile) && getTrainingAdjustmentInput(profile));
}

export async function hasTrainingPlanAdjustmentCapability(): Promise<boolean> {
  try {
    const response = await fetch("/api/ai/training-plan", {
      method: "OPTIONS",
      cache: "no-store",
      credentials: "include",
    });
    return response.status !== 404;
  } catch (_err) {
    return false;
  }
}

export async function generateAndSaveTrainingPlan(
  profile: ProfileData,
  input: TrainingPreferencesInput
): Promise<TrainingPlanAdjustmentResult> {
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
    if (payload?.error === "INSUFFICIENT_TOKENS") {
      throw new Error("INSUFFICIENT_TOKENS");
    }
    if (response.status === 429) {
      throw new Error(payload?.message ?? "RATE_LIMITED");
    }
    throw new Error("AI_GENERATION_FAILED");
  }

  const data = (await response.json()) as {
    plan?: TrainingPlan;
    aiTokenBalance?: number;
    aiTokenRenewalAt?: string | null;
    updatedAt?: string;
    effectiveFrom?: string;
    weekStart?: string;
  };
  const plan = data.plan ?? (data as unknown as TrainingPlan);
  const nextPlan = ensurePlanStartDate(plan);
  const updatedProfile = await updateUserProfile({ trainingPlan: nextPlan });

  return {
    profile: updatedProfile,
    aiTokenBalance: typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : undefined,
    aiTokenRenewalAt:
      typeof data.aiTokenRenewalAt === "string" || data.aiTokenRenewalAt === null ? data.aiTokenRenewalAt : undefined,
    metadata: {
      updatedAt: data.updatedAt,
      effectiveFrom: data.effectiveFrom,
      weekStart: data.weekStart,
    },
  };
}
