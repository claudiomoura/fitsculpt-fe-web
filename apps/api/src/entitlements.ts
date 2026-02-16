import { z } from "zod";

const subscriptionPlanSchema = z.enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"]);

export type SubscriptionPlanLike = z.infer<typeof subscriptionPlanSchema>;

const moduleEntitlementSchema = z.object({
  enabled: z.boolean(),
  reason: z.enum(["plan", "admin_override", "none"]),
});

export const effectiveEntitlementsSchema = z.object({
  version: z.literal("2026-02-01"),
  plan: z.object({
    base: subscriptionPlanSchema,
    effective: subscriptionPlanSchema,
  }),
  role: z.object({
    isAdmin: z.boolean(),
    adminOverride: z.boolean(),
  }),
  modules: z.object({
    strength: moduleEntitlementSchema,
    nutrition: moduleEntitlementSchema,
    ai: moduleEntitlementSchema,
  }),
  legacy: z.object({
    tier: z.enum(["FREE", "PRO"]),
    canUseAI: z.boolean(),
  }),
});

export type EffectiveEntitlements = z.infer<typeof effectiveEntitlementsSchema>;

function planHasStrength(plan: SubscriptionPlanLike): boolean {
  return plan === "STRENGTH_AI" || plan === "PRO";
}

function planHasNutrition(plan: SubscriptionPlanLike): boolean {
  return plan === "NUTRI_AI" || plan === "PRO";
}

function planHasAi(plan: SubscriptionPlanLike): boolean {
  return plan !== "FREE";
}

function toModule(enabled: boolean): { enabled: boolean; reason: "plan" | "none" } {
  return enabled ? { enabled: true, reason: "plan" } : { enabled: false, reason: "none" };
}

export function buildEffectiveEntitlements(params: {
  plan: string | null | undefined;
  isAdmin: boolean;
}): EffectiveEntitlements {
  const parsedPlan = subscriptionPlanSchema.safeParse(params.plan ?? "FREE");
  const basePlan: SubscriptionPlanLike = parsedPlan.success ? parsedPlan.data : "FREE";
  const adminOverride = params.isAdmin;

  if (adminOverride) {
    return effectiveEntitlementsSchema.parse({
      version: "2026-02-01",
      plan: {
        base: basePlan,
        effective: "PRO",
      },
      role: {
        isAdmin: true,
        adminOverride: true,
      },
      modules: {
        strength: { enabled: true, reason: "admin_override" },
        nutrition: { enabled: true, reason: "admin_override" },
        ai: { enabled: true, reason: "admin_override" },
      },
      legacy: {
        tier: "PRO",
        canUseAI: true,
      },
    });
  }

  return effectiveEntitlementsSchema.parse({
    version: "2026-02-01",
    plan: {
      base: basePlan,
      effective: basePlan,
    },
    role: {
      isAdmin: false,
      adminOverride: false,
    },
    modules: {
      strength: toModule(planHasStrength(basePlan)),
      nutrition: toModule(planHasNutrition(basePlan)),
      ai: toModule(planHasAi(basePlan)),
    },
    legacy: {
      tier: basePlan === "FREE" ? "FREE" : "PRO",
      canUseAI: planHasAi(basePlan),
    },
  });
}
