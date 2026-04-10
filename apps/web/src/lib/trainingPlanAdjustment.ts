import { addDays, parseDate, startOfWeek, toDateKey } from "@/lib/calendar";
import { runAiCapabilityPreflight, type AiTokenReservation } from "@/domains/ai";
import { requestAiTrainingPlan, saveAiTrainingPlan } from "@/components/training-plan/aiPlanGeneration";
import { isProfileComplete } from "@/lib/profileCompletion";
import type { AuthMeResponse } from "@/lib/types";
import type {
  Goal,
  ProfileData,
  SessionTime,
  TrainingEquipment,
  TrainingFocus,
  TrainingLevel,
  TrainingPlanData,
} from "@/lib/profile";

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
  input: TrainingPreferencesInput,
  options?: {
    aiProfile?: AuthMeResponse | null;
    reserveTokens?: (input: {
      capability: "training-plan-generation";
      estimatedTokens: number;
      profile: AuthMeResponse;
    }) => Promise<AiTokenReservation>;
  },
): Promise<TrainingPlanAdjustmentResult> {
  const preflight = await runAiCapabilityPreflight({
    capability: "training-plan-generation",
    payload: { profile, input },
    profile: options?.aiProfile,
    entitlement: { module: "ai", minimumPlan: "PRO" },
    estimateTokens: ({ input }) => 190 + Math.max(1, input.daysPerWeek) * 24,
    reserveTokens: options?.reserveTokens
      ? async ({ estimatedTokens, profile }) =>
          options.reserveTokens?.({
            capability: "training-plan-generation",
            estimatedTokens,
            profile,
          }) ?? { ok: false, reason: "missing_reservation" }
      : undefined,
  });

  if (!preflight.ok) {
    if (preflight.failureReason === "insufficient_balance") {
      throw new Error("INSUFFICIENT_TOKENS");
    }
    throw new Error(preflight.failureReason ?? "AI_GENERATION_BLOCKED");
  }

  const generated = await requestAiTrainingPlan(profile, input, toDateKey(startOfWeek(new Date())));
  const persisted = ensurePlanStartDate(generated.plan);
  const updatedProfile = await saveAiTrainingPlan(persisted);

  return {
    profile: updatedProfile,
    aiTokenBalance:
      typeof generated.aiTokenBalance === "number" ? generated.aiTokenBalance : undefined,
    aiTokenRenewalAt:
      typeof generated.aiTokenRenewalAt === "string" ||
      generated.aiTokenRenewalAt === null
        ? generated.aiTokenRenewalAt
        : undefined,
    metadata: {
      updatedAt: generated.metadata.updatedAt,
      effectiveFrom: generated.metadata.effectiveFrom,
      weekStart: generated.metadata.weekStart,
    },
  };
}
