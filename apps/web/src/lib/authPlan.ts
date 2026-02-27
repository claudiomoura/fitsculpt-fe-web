import type { AuthMeResponse } from "@/lib/types";
import { readAuthEntitlementSnapshot, type SubscriptionPlan } from "@/context/auth/entitlements";

export type HeaderPlan = SubscriptionPlan;

export function resolveHeaderPlan(payload: AuthMeResponse | null | undefined): HeaderPlan {
  return readAuthEntitlementSnapshot(payload).subscriptionPlan;
}
