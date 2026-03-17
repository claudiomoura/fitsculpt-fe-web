import type { SubscriptionPlanLike } from "../entitlements.js";

const PRO_TOKENS = 50_000;
const DOMAIN_TOKENS = 40_000;

export function tokenGrantForPlan(plan: SubscriptionPlanLike): number {
  if (plan === "PRO") return PRO_TOKENS;
  if (plan === "STRENGTH_AI" || plan === "NUTRI_AI") return DOMAIN_TOKENS;
  return 0;
}
