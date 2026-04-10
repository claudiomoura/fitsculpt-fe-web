import { runAiCapabilityPreflight, type AiTokenReservation } from "@/domains/ai";
import {
  requestAiTrainingPlan,
  saveAiTrainingPlan,
  type TrainingPreferencesInput,
} from "@/components/training-plan/aiPlanGeneration";
import type { AuthMeResponse } from "@/lib/types";
import type { ProfileData } from "@/lib/profile";
import type { TrackingRecommendationItem } from "@/domains/tracking-intelligence/contracts";

export type TrackingRecommendationPlanConsumerResult =
  | {
      ok: true;
      status: "applied";
      reservationId: string;
      estimatedTokens: number;
      aiRequestId: string | null;
    }
  | {
      ok: false;
      status: "skipped" | "blocked" | "failed";
      reason:
        | "not_training_plan_cta"
        | "missing_training_preferences"
        | "ai_preflight_failed"
        | "plan_generation_failed";
      message: string;
      failureReason?: string | null;
      estimatedTokens?: number | null;
    };

function estimateTrainingPlanTokens(input: {
  profile: ProfileData;
  trainingPreferences: TrainingPreferencesInput;
}): number {
  const preferenceDensity =
    (input.trainingPreferences.daysPerWeek ?? 3) * 25 +
    (input.profile.goals.length > 0 ? input.profile.goals.length * 12 : 8);
  return 180 + preferenceDensity;
}

export async function consumeTrackingRecommendationForAiPlan(input: {
  recommendation: TrackingRecommendationItem;
  profile: ProfileData;
  trainingPreferences: TrainingPreferencesInput | null;
  aiProfile?: AuthMeResponse | null;
  reserveTokens?: (request: {
    capability: "training-plan-generation";
    estimatedTokens: number;
    profile: AuthMeResponse;
  }) => Promise<AiTokenReservation>;
}): Promise<TrackingRecommendationPlanConsumerResult> {
  if (input.recommendation.cta.target !== "training-plan") {
    return {
      ok: false,
      status: "skipped",
      reason: "not_training_plan_cta",
      message: "La recomendacion no apunta a generar plan de entrenamiento.",
    };
  }

  if (!input.trainingPreferences) {
    return {
      ok: false,
      status: "blocked",
      reason: "missing_training_preferences",
      message: "Faltan preferencias base para generar un plan de entrenamiento.",
    };
  }

  const preflight = await runAiCapabilityPreflight({
    capability: "training-plan-generation",
    payload: {
      profile: input.profile,
      trainingPreferences: input.trainingPreferences,
      recommendationId: input.recommendation.id,
    },
    profile: input.aiProfile,
    entitlement: { module: "ai", minimumPlan: "PRO" },
    estimateTokens: ({ profile, trainingPreferences }) =>
      estimateTrainingPlanTokens({ profile, trainingPreferences }),
    reserveTokens: input.reserveTokens
      ? async ({ capability, estimatedTokens, profile }) =>
          input.reserveTokens?.({
            capability: capability as "training-plan-generation",
            estimatedTokens,
            profile,
          }) ?? { ok: false, reason: "missing_reservation" }
      : undefined,
  });

  if (!preflight.ok) {
    return {
      ok: false,
      status: "blocked",
      reason: "ai_preflight_failed",
      message: preflight.message,
      failureReason: preflight.failureReason,
      estimatedTokens: preflight.estimate?.estimatedTokens ?? null,
    };
  }

  try {
    const generated = await requestAiTrainingPlan(input.profile, input.trainingPreferences);
    await saveAiTrainingPlan(generated.plan);
    return {
      ok: true,
      status: "applied",
      reservationId: preflight.reservation.reservationId,
      estimatedTokens: preflight.estimate.estimatedTokens,
      aiRequestId: generated.aiRequestId ?? null,
    };
  } catch (_error) {
    return {
      ok: false,
      status: "failed",
      reason: "plan_generation_failed",
      message: "No pudimos generar ni guardar el plan AI desde recommendation.",
      estimatedTokens: preflight.estimate.estimatedTokens,
    };
  }
}
