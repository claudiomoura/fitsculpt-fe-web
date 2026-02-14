export type AuthMePayload = {
  subscriptionPlan?: string | null;
};

export type EntitlementTier = "FREE" | "PRO" | "GYM";

export type UiEntitlements =
  | {
      status: "known";
      tier: EntitlementTier;
      features: {
        canUseAI: boolean;
        hasProSupport: boolean;
        hasGymAccess: boolean;
      };
    }
  | {
      status: "unknown";
    };

function normalizeTier(plan?: string | null): EntitlementTier | null {
  if (typeof plan !== "string") return null;

  const normalized = plan.trim().toUpperCase();
  if (normalized === "FREE" || normalized === "PRO" || normalized === "GYM") {
    return normalized;
  }

  return null;
}

export function getUiEntitlements(payload: AuthMePayload): UiEntitlements {
  const tier = normalizeTier(payload.subscriptionPlan);

  if (!tier) {
    return { status: "unknown" };
  }

  return {
    status: "known",
    tier,
    features: {
      canUseAI: tier === "PRO",
      hasProSupport: tier === "PRO" || tier === "GYM",
      hasGymAccess: tier === "GYM",
    },
  };
}
