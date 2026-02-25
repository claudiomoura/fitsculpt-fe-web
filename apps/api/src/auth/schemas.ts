import { z } from "zod";
import { effectiveEntitlementsSchema, type EffectiveEntitlements } from "../entitlements.js";

export const authMeResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(["USER", "ADMIN"]),
  emailVerifiedAt: z.date().nullable(),
  lastLoginAt: z.date().nullable(),
  subscriptionPlan: z.enum(["FREE", "PRO"]),
  plan: z.enum(["FREE", "PRO"]),
  subscriptionStatus: z.string().nullable(),
  currentPeriodEnd: z.date().nullable(),
  aiTokenBalance: z.number().int().nonnegative().nullable(),
  aiTokenRenewalAt: z.date().nullable(),
  modules: z.object({
    strength: z.boolean(),
    nutrition: z.boolean(),
    ai: z.boolean(),
  }),
  entitlements: effectiveEntitlementsSchema,
  effectiveEntitlements: effectiveEntitlementsSchema,
  gymMembershipState: z.enum(["active", "none"]),
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
  activeMembership:
    | {
        gym: {
          id: string;
          name: string;
        };
        status: "ACTIVE";
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
    subscriptionPlan: params.entitlements.legacy.tier,
    plan: params.entitlements.legacy.tier,
    subscriptionStatus: params.user.subscriptionStatus,
    currentPeriodEnd: params.user.currentPeriodEnd,
    aiTokenBalance: params.aiTokenBalance,
    aiTokenRenewalAt: params.aiTokenRenewalAt,
    modules: buildSessionModules(params.entitlements),
    entitlements: params.entitlements,
    effectiveEntitlements: params.entitlements,
    gymMembershipState: params.activeMembership ? "active" : "none",
    gymId: params.activeMembership?.gym.id,
    gymName: params.activeMembership?.gym.name,
    isTrainer:
      params.activeMembership?.status === "ACTIVE" &&
      (params.activeMembership?.role === "TRAINER" || params.activeMembership?.role === "ADMIN"),
  });
}
