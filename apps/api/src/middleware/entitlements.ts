import type { EffectiveEntitlements } from "../entitlements.js";

export function hasPremiumAiAccess(entitlements: EffectiveEntitlements, tokenBalance: number): boolean {
  if (!entitlements.modules.ai.enabled) {
    return false;
  }

  if (entitlements.role.adminOverride) {
    return true;
  }

  return tokenBalance > 0;
}

export function hasAiDomainAccess(
  entitlements: EffectiveEntitlements,
  domain: "nutrition" | "strength",
  tokenBalance: number
): boolean {
  if (!hasPremiumAiAccess(entitlements, tokenBalance)) {
    return false;
  }

  return domain === "nutrition" ? entitlements.modules.nutrition.enabled : entitlements.modules.strength.enabled;
}
