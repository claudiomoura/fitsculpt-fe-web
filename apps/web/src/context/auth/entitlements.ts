import type { AuthMeResponse } from "@/lib/types";

export type AuthEntitlementsSnapshot = {
  subscriptionPlan: "FREE" | "STRENGTH_AI" | "NUTRI_AI" | "PRO";
  aiEntitlements: {
    nutrition: boolean;
    strength: boolean;
  };
  tokenBalance: number | null;
};

const ALLOWED_PLAN = new Set(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"] as const);

export function getAuthEntitlementsSnapshot(payload: AuthMeResponse | null | undefined): AuthEntitlementsSnapshot {
  const subscriptionPlan =
    typeof payload?.subscriptionPlan === "string" && ALLOWED_PLAN.has(payload.subscriptionPlan as never)
      ? (payload.subscriptionPlan as AuthEntitlementsSnapshot["subscriptionPlan"])
      : "FREE";

  const aiEntitlements = {
    nutrition: payload?.aiEntitlements?.nutrition === true,
    strength: payload?.aiEntitlements?.strength === true,
  };

  const tokenBalance = typeof payload?.tokenBalance === "number" ? payload.tokenBalance : null;

  return {
    subscriptionPlan,
    aiEntitlements,
    tokenBalance,
  };
}
