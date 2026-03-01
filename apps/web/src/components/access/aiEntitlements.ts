import type { AuthMeResponse } from "@/lib/types";
import { readAuthEntitlementSnapshot } from "@/context/auth/entitlements";

export type AiEntitlementProfile = AuthMeResponse;

function readModules(profile: AiEntitlementProfile | null | undefined) {
  return readAuthEntitlementSnapshot(profile).aiEntitlements;
}

export function hasStrengthAiEntitlement(profile: AiEntitlementProfile | null | undefined): boolean {
  return readModules(profile).strength;
}

export function hasNutritionAiEntitlement(profile: AiEntitlementProfile | null | undefined): boolean {
  return readModules(profile).nutrition;
}

export function hasAiEntitlement(profile: AiEntitlementProfile | null | undefined): boolean {
  return readModules(profile).ai;
}
