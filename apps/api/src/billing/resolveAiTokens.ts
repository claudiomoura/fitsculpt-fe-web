export type BillingStatusReason = "active" | "past_due" | "canceled" | "expired";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const PAST_DUE_STATUSES = new Set(["past_due", "unpaid", "incomplete"]);
const CANCELED_STATUSES = new Set(["canceled"]);
const EXPIRED_STATUSES = new Set(["incomplete_expired", "paused"]);

export function resolveBillingStatusReason(subscriptionStatus?: string | null): BillingStatusReason {
  const normalizedStatus = subscriptionStatus?.trim().toLowerCase();
  if (!normalizedStatus) {
    return "expired";
  }
  if (ACTIVE_STATUSES.has(normalizedStatus)) {
    return "active";
  }
  if (PAST_DUE_STATUSES.has(normalizedStatus)) {
    return "past_due";
  }
  if (CANCELED_STATUSES.has(normalizedStatus)) {
    return "canceled";
  }
  if (EXPIRED_STATUSES.has(normalizedStatus)) {
    return "expired";
  }
  return "expired";
}

export function resolveAiTokens(params: {
  subscriptionStatus?: string | null;
  planMonthlyAllowance: number;
}): number {
  const reason = resolveBillingStatusReason(params.subscriptionStatus);
  if (reason !== "active") {
    return 0;
  }

  return Math.max(0, Math.trunc(params.planMonthlyAllowance));
}
