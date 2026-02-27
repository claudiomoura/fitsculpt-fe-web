import { z } from "zod";
import { effectiveEntitlementsSchema, type EffectiveEntitlements } from "../entitlements.js";

const subscriptionPlanSchema = z.enum(["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"]);

export const authMeResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(["USER", "ADMIN"]),
  emailVerifiedAt: z.date().nullable(),
  lastLoginAt: z.date().nullable(),
  subscriptionPlan: subscriptionPlanSchema,
  plan: z.enum(["FREE", "PRO"]),
  subscriptionStatus: z.string().nullable(),
  currentPeriodEnd: z.date().nullable(),
  aiTokenBalance: z.number().int().nonnegative().nullable(),
  tokenBalance: z.number().int().nonnegative().nullable(),
  aiTokenRenewalAt: z.date().nullable(),
  aiEntitlements: z.object({
    nutrition: z.boolean(),
    strength: z.boolean(),
  }),
  modules: z.object({
    strength: z.boolean(),
    nutrition: z.boolean(),
    ai: z.boolean(),
  }),
  entitlements: effectiveEntitlementsSchema,
  effectiveEntitlements: effectiveEntitlementsSchema,
  gymMembershipState: z.enum(["NONE", "PENDING", "ACTIVE"]),
  gymRole: z.enum(["USER", "TRAINER", "ADMIN"]),
  gymId: z.string().nullable().optional(),
  gymName: z.string().nullable().optional(),
  isTrainer: z.boolean(),
});

export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;

type SessionModules = AuthMeResponse["modules"];

type AuthMeUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
};

export function buildSessionModules(entitlements: EffectiveEntitlements): SessionModules {
  return {
    strength: entitlements.modules.strength.enabled,
    nutrition: entitlements.modules.nutrition.enabled,
    ai: entitlements.modules.ai.enabled,
  };
}

export function buildAuthMeResponse(params: {
  user: AuthMeUser;
  role: "USER" | "ADMIN";
  aiTokenBalance: number | null;
  aiTokenRenewalAt: Date | null;
  entitlements: EffectiveEntitlements;
  membership:
    | {
        gym: {
          id: string;
          name: string;
        };
        status: "PENDING" | "ACTIVE" | "REJECTED";
        role: "MEMBER" | "TRAINER" | "ADMIN";
      }
    | null;
}): AuthMeResponse {
  return authMeResponseSchema.parse({
    id: params.user.id,
    email: params.user.email,
    name: params.user.name,
    role: params.role,
    emailVerifiedAt: params.user.emailVerifiedAt,
    lastLoginAt: params.user.lastLoginAt,
    subscriptionPlan: params.entitlements.plan.effective,
    plan: params.entitlements.legacy.tier,
    subscriptionStatus: params.user.subscriptionStatus,
    currentPeriodEnd: params.user.currentPeriodEnd,
    aiTokenBalance: params.aiTokenBalance,
    tokenBalance: params.aiTokenBalance,
    aiTokenRenewalAt: params.aiTokenRenewalAt,
    aiEntitlements: {
      strength: params.entitlements.modules.strength.enabled,
      nutrition: params.entitlements.modules.nutrition.enabled,
    },
    modules: buildSessionModules(params.entitlements),
    entitlements: params.entitlements,
    effectiveEntitlements: params.entitlements,
    gymMembershipState:
      params.membership?.status === "ACTIVE"
        ? "ACTIVE"
        : params.membership?.status === "PENDING"
          ? "PENDING"
          : "NONE",
    gymRole:
      params.membership?.status === "ACTIVE" || params.membership?.status === "PENDING"
        ? params.membership.role === "MEMBER"
          ? "USER"
          : params.membership.role
        : "USER",
    gymId: params.membership?.gym.id,
    gymName: params.membership?.gym.name,
    isTrainer:
      params.membership?.status === "ACTIVE" &&
      (params.membership?.role === "TRAINER" || params.membership?.role === "ADMIN"),
  });
}
