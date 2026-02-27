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
    payload?.aiEntitlements?.nutrition === true ||
    payload?.entitlements?.modules?.nutrition?.enabled === true;
  const strength =
    payload?.aiEntitlements?.strength === true ||
    payload?.entitlements?.modules?.strength?.enabled === true;

  const tokenBalanceRaw =
    typeof payload?.tokenBalance === "number"
      ? payload.tokenBalance
      : typeof payload?.aiTokenBalance === "number"
        ? payload.aiTokenBalance
        : 0;

  return {
    subscriptionPlan,
    aiEntitlements: { nutrition, strength },
    tokenBalance: Number.isFinite(tokenBalanceRaw) && tokenBalanceRaw > 0 ? tokenBalanceRaw : 0,
  };
}
