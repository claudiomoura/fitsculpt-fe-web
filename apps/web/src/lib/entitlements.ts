export type AuthMePayload = {
  subscriptionPlan?: string | null;
  entitlements?: {
    modules?: {
      ai?: { enabled?: boolean };
      strength?: { enabled?: boolean };
      nutrition?: { enabled?: boolean };
    };
    legacy?: {
      tier?: string;
    };
  } | null;
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
  if (normalized === "FREE") {
    return "FREE";
  }

  if (normalized === "PRO" || normalized === "STRENGTH_AI" || normalized === "NUTRI_AI") {
    return "PRO";
  }

  if (normalized === "GYM") {
    return "GYM";
  }

  return null;
}

export function getUiEntitlements(payload: AuthMePayload): UiEntitlements {
  const tier = normalizeTier(payload.entitlements?.legacy?.tier ?? payload.subscriptionPlan);

  if (!tier) {
    return { status: "unknown" };
  }

  const modules = payload.entitlements?.modules;
  const canUseAI = typeof modules?.ai?.enabled === "boolean" ? modules.ai.enabled : tier === "PRO";

  return {
    status: "known",
    tier,
    features: {
      canUseAI,
      hasProSupport: tier === "PRO" || tier === "GYM",
      hasGymAccess: tier === "GYM",
    },
  };
}
