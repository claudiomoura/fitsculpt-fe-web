import type { AuthMeEntitlements, AuthMeResponse } from "@/lib/types";
import { normalizeSubscriptionPlan, type SubscriptionPlan } from "@/lib/subscriptionPlan";

export type { SubscriptionPlan } from "@/lib/subscriptionPlan";

type ModuleFlags = {
  ai: boolean;
  nutrition: boolean;
  strength: boolean;
  billing: boolean;
};

export type AuthEntitlementSnapshot = {
  subscriptionPlan: SubscriptionPlan;
  modules: ModuleFlags;
  aiEntitlements: Omit<ModuleFlags, "billing">;
  tokenBalance: number;
};

function readEntitlementSource(payload: AuthMeResponse | null | undefined): AuthMeEntitlements | null | undefined {
  return payload?.effectiveEntitlements ?? payload?.entitlements;
}

function readModuleEnabled(source: AuthMeEntitlements | null | undefined, key: "ai" | "nutrition" | "strength" | "billing") {
  return source?.modules?.[key]?.enabled;
}

function resolveModuleFlags(payload: AuthMeResponse | null | undefined): ModuleFlags {
  const source = readEntitlementSource(payload);
  const strengthFromModules = readModuleEnabled(source, "strength");
  const nutritionFromModules = readModuleEnabled(source, "nutrition");
  const aiFromModules = readModuleEnabled(source, "ai");
  const billingFromModules = readModuleEnabled(source, "billing");

  const strengthFromLegacy = payload?.aiEntitlements?.strength;
  const nutritionFromLegacy = payload?.aiEntitlements?.nutrition;

  const strength = strengthFromModules ?? strengthFromLegacy ?? false;
  const nutrition = nutritionFromModules ?? nutritionFromLegacy ?? false;
  const ai = aiFromModules ?? (strength || nutrition);
  const billing = billingFromModules ?? Boolean(payload);

  return {
    ai,
    nutrition,
    strength,
    billing,
  };
}

export function readAuthEntitlementSnapshot(payload: AuthMeResponse | null | undefined): AuthEntitlementSnapshot {
  const subscriptionPlan =
    normalizeSubscriptionPlan(payload?.subscriptionPlan) ??
    normalizeSubscriptionPlan(payload?.plan) ??
    normalizeSubscriptionPlan(payload?.effectiveEntitlements?.plan?.effective) ??
    normalizeSubscriptionPlan(payload?.effectiveEntitlements?.plan?.base) ??
    normalizeSubscriptionPlan(payload?.entitlements?.plan?.effective) ??
    normalizeSubscriptionPlan(payload?.entitlements?.plan?.base) ??
    "FREE";

  const tokenBalanceRaw =
    typeof payload?.aiTokenBalance === "number"
      ? payload.aiTokenBalance
      : typeof payload?.tokenBalance === "number"
        ? payload.tokenBalance
        : 0;

  const modules = resolveModuleFlags(payload);

  return {
    subscriptionPlan,
    modules,
    aiEntitlements: {
      ai: modules.ai,
      nutrition: modules.nutrition,
      strength: modules.strength,
    },
    tokenBalance: Number.isFinite(tokenBalanceRaw) && tokenBalanceRaw > 0 ? tokenBalanceRaw : 0,
  };
}
