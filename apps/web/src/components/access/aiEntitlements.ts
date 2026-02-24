export type AiEntitlementProfile = {
  entitlements?: {
    modules?: {
      ai?: { enabled?: boolean };
      strength?: { enabled?: boolean };
      nutrition?: { enabled?: boolean };
    };
  } | null;
} & Record<string, unknown>;

function hasEnabledModule(
  profile: AiEntitlementProfile | null | undefined,
  moduleName: "strength" | "nutrition",
): boolean {
  if (!profile) return false;
  return profile.entitlements?.modules?.[moduleName]?.enabled === true;
}

export function hasStrengthAiEntitlement(profile: AiEntitlementProfile | null | undefined): boolean {
  return hasEnabledModule(profile, "strength");
}

export function hasNutritionAiEntitlement(profile: AiEntitlementProfile | null | undefined): boolean {
  return hasEnabledModule(profile, "nutrition");
}

export function hasAiEntitlement(profile: AiEntitlementProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.entitlements?.modules?.ai?.enabled === true || hasStrengthAiEntitlement(profile) || hasNutritionAiEntitlement(profile);
}
