import type { SubscriptionPlanLike } from "../entitlements.js";

export const PAID_SUBSCRIPTION_TOKEN_GRANT = 44_444;

export function tokenGrantForPlan(plan: SubscriptionPlanLike): number {
  return plan === "FREE" ? 0 : PAID_SUBSCRIPTION_TOKEN_GRANT;
}

export function shouldGrantTokensForBillingCycle(params: {
  plan: SubscriptionPlanLike;
  currentPeriodEnd?: Date | null;
  aiTokenRenewalAt?: Date | null;
}): boolean {
  if (params.plan === "FREE") return false;
  if (!params.currentPeriodEnd) {
    return !params.aiTokenRenewalAt;
  }

  return params.aiTokenRenewalAt?.getTime() !== params.currentPeriodEnd.getTime();
}
