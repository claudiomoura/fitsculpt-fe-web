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
  const modules = payload.entitlements?.modules;
  if (!modules) {
    return { status: "unknown" };
  }

  const canUseAI = modules.ai?.enabled === true;
  const canUseNutrition = modules.nutrition?.enabled === true;
  const canUseStrength = modules.strength?.enabled === true;

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
