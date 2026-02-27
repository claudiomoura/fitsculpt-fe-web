import type { AuthMeResponse } from "@/lib/types";
import { readAuthEntitlementSnapshot } from "@/context/auth/entitlements";

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
  if (!payload) {
    return { status: "unknown" };
  }

  const snapshot = readAuthEntitlementSnapshot(payload);
  const canUseAI = snapshot.subscriptionPlan !== "FREE";
  const canUseNutrition = snapshot.aiEntitlements.nutrition;
  const canUseStrength = snapshot.aiEntitlements.strength;

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
