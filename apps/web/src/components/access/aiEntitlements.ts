export type AiEntitlementProfile = {
  subscriptionPlan?: "FREE" | "PRO" | "STRENGTH_AI" | "NUTRI_AI" | null;
  role?: string | null;
  entitlements?: {
    modules?: {
      ai?: { enabled?: boolean };
    };
  } | null;
} & Record<string, unknown>;

function hasGymEntitlement(profile: AiEntitlementProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.gymId ||
      profile.gymName ||
      profile.tenantId ||
      profile.tenant ||
      profile.scope ||
      profile.gym
  );
}

export function hasAiEntitlement(profile: AiEntitlementProfile | null | undefined): boolean {
  if (!profile) return false;

  const aiEnabled = profile.entitlements?.modules?.ai?.enabled;
  if (typeof aiEnabled === "boolean") {
    return aiEnabled;
  }

  const role = typeof profile.role === "string" ? profile.role.toUpperCase() : "";
  if (role === "ADMIN") return true;

  return profile.subscriptionPlan !== "FREE" || hasGymEntitlement(profile);
}
