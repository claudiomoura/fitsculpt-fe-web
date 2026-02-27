import type { AuthMeResponse } from "@/lib/types";

export type AuthMePayload = AuthMeResponse;

export type UiEntitlements =
  | {
      status: "known";
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

export function getUiEntitlements(payload: AuthMePayload): UiEntitlements {
  const aiEntitlements = payload.aiEntitlements;
  if (!aiEntitlements) {
    return { status: "unknown" };
  }

  const canUseNutrition = aiEntitlements.nutrition === true;
  const canUseStrength = aiEntitlements.strength === true;
  const canUseAI = canUseNutrition || canUseStrength || payload.subscriptionPlan === "PRO";

  return {
    status: "known",
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
