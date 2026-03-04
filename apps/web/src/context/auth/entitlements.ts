import type { AuthMeResponse } from "@/lib/types";
import {
  getPlanCapabilities,
  normalizeSubscriptionPlan,
  type SubscriptionPlan,
} from "@/lib/subscriptionPlan";

export type { SubscriptionPlan } from "@/lib/subscriptionPlan";

export type AuthEntitlementSnapshot = {
  subscriptionPlan: SubscriptionPlan;
  aiEntitlements: {
    ai: boolean;
    nutrition: boolean;
    strength: boolean;
  };
  tokenBalance: number;
};

export function readAuthEntitlementSnapshot(payload: AuthMeResponse | null | undefined): AuthEntitlementSnapshot {
  const subscriptionPlan =
    normalizeSubscriptionPlan(payload?.subscriptionPlan) ??
    normalizeSubscriptionPlan(payload?.plan) ??
    normalizeSubscriptionPlan(payload?.entitlements?.plan?.effective) ??
    normalizeSubscriptionPlan(payload?.entitlements?.plan?.base) ??
    "FREE";
  const capabilities = getPlanCapabilities(subscriptionPlan);

  const tokenBalanceRaw =
    typeof payload?.aiTokenBalance === "number"
      ? payload.aiTokenBalance
      : typeof payload?.tokenBalance === "number"
        ? payload.tokenBalance
        : 0;

  return {
    subscriptionPlan,
    aiEntitlements: {
      ai: capabilities.hasAI,
      nutrition: capabilities.hasNutriAI,
      strength: capabilities.hasStrengthAI,
    },
    tokenBalance: Number.isFinite(tokenBalanceRaw) && tokenBalanceRaw > 0 ? tokenBalanceRaw : 0,
  };
}
