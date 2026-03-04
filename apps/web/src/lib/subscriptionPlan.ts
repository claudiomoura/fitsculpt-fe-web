export type SubscriptionPlan = "FREE" | "STRENGTH_AI" | "NUTRI_AI" | "PRO";

const PLAN_BY_TOKEN: Record<string, SubscriptionPlan> = {
  FREE: "FREE",
  PRO: "PRO",
  STRENGTH_AI: "STRENGTH_AI",
  NUTRI_AI: "NUTRI_AI",
  STRENGTHAI: "STRENGTH_AI",
  NUTRIAI: "NUTRI_AI",
};

export type PlanCapabilities = {
  hasAI: boolean;
  hasStrengthAI: boolean;
  hasNutriAI: boolean;
};

export function normalizeSubscriptionPlan(value: unknown): SubscriptionPlan | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\s-]/g, "_").toUpperCase();
  return PLAN_BY_TOKEN[normalized] ?? null;
}

export function resolveSubscriptionPlan(value: unknown): SubscriptionPlan {
  return normalizeSubscriptionPlan(value) ?? "FREE";
}

export function getPlanCapabilities(plan: SubscriptionPlan): PlanCapabilities {
  if (plan === "PRO") {
    return { hasAI: true, hasStrengthAI: true, hasNutriAI: true };
  }

  if (plan === "STRENGTH_AI") {
    return { hasAI: true, hasStrengthAI: true, hasNutriAI: false };
  }

  if (plan === "NUTRI_AI") {
    return { hasAI: true, hasStrengthAI: false, hasNutriAI: true };
  }

  return { hasAI: false, hasStrengthAI: false, hasNutriAI: false };
}

export function isSupportedSubscriptionPlan(value: unknown): boolean {
  return normalizeSubscriptionPlan(value) !== null;
}
