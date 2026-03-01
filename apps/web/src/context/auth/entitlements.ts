import type { AuthMeResponse } from "@/lib/types";

export type SubscriptionPlan = "FREE" | "STRENGTH_AI" | "NUTRI_AI" | "PRO";

const PLAN_BY_TOKEN: Record<string, SubscriptionPlan> = {
  FREE: "FREE",
  PRO: "PRO",
  STRENGTH_AI: "STRENGTH_AI",
  NUTRI_AI: "NUTRI_AI",
  STRENGTHAI: "STRENGTH_AI",
  NUTRIAI: "NUTRI_AI",
};

function toPlan(value: unknown): SubscriptionPlan | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\s-]/g, "_").toUpperCase();
  return PLAN_BY_TOKEN[normalized] ?? null;
}

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
    toPlan(payload?.subscriptionPlan) ??
    toPlan(payload?.plan) ??
    toPlan(payload?.entitlements?.plan?.effective) ??
    toPlan(payload?.entitlements?.plan?.base) ??
    "FREE";

  const nutrition =
    payload?.entitlements?.modules?.nutrition?.enabled === true ||
    payload?.aiEntitlements?.nutrition === true;
  const strength =
    payload?.entitlements?.modules?.strength?.enabled === true ||
    payload?.aiEntitlements?.strength === true;
  const ai =
    payload?.entitlements?.modules?.ai?.enabled === true ||
    nutrition ||
    strength;

  const tokenBalanceRaw =
    typeof payload?.aiTokenBalance === "number"
      ? payload.aiTokenBalance
      : typeof payload?.tokenBalance === "number"
        ? payload.tokenBalance
        : 0;

  return {
    subscriptionPlan,
    aiEntitlements: { ai, nutrition, strength },
    tokenBalance: Number.isFinite(tokenBalanceRaw) && tokenBalanceRaw > 0 ? tokenBalanceRaw : 0,
  };
}
