export type AiEntitlementProfile = {
  subscriptionPlan?: "FREE" | "PRO" | null;
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
  return profile.subscriptionPlan === "PRO" || hasGymEntitlement(profile);
}
