import type { AuthMeResponse } from "@/lib/types";

export type AuthMePayload = AuthMeResponse;

export type EntitlementTier = "FREE" | "PRO" | "GYM";

export type UiEntitlements =
  | {
      status: "known";
      tier: EntitlementTier;
      features: {
        canUseAI: boolean;
        canUseNutrition: boolean;
        canUseStrength: boolean;
      };
    }
  | {
      status: "unknown";
    };

export type EntitlementFeature = "ai" | "nutrition" | "strength";

function normalizeTier(plan?: string | null): EntitlementTier | null {
  if (typeof plan !== "string") return null;

  const normalized = plan.trim().toUpperCase();
  if (normalized === "FREE") {
    return "FREE";
  }

  if (normalized === "PRO" || normalized === "STRENGTH_AI" || normalized === "NUTRI_AI") {
    return "PRO";
  }

  if (normalized === "GYM") {
    return "GYM";
  }

  return null;
}

export function getUiEntitlements(payload: AuthMePayload): UiEntitlements {
  const modules = payload.entitlements?.modules;
  if (!modules) {
    return { status: "unknown" };
  }

  const tier = normalizeTier(
    payload.entitlements?.legacy?.tier ?? payload.entitlements?.plan?.effective ?? payload.plan ?? payload.subscriptionPlan,
  );

  if (!tier) {
    return { status: "unknown" };
  }

  const canUseAI = modules.ai?.enabled === true;
  const canUseNutrition = modules.nutrition?.enabled === true;
  const canUseStrength = modules.strength?.enabled === true;

  return {
    status: "known",
    tier,
    features: {
      canUseAI,
      canUseNutrition,
      canUseStrength,
    },
  };
}

export function canAccessFeature(entitlements: UiEntitlements, feature: EntitlementFeature): boolean {
  if (entitlements.status !== "known") {
    return false;
  }

  if (feature === "ai") {
    return entitlements.features.canUseAI;
  }

  if (feature === "nutrition") {
    return entitlements.features.canUseNutrition;
  }

  return entitlements.features.canUseStrength;
}
