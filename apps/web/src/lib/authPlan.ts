import type { AuthMeResponse } from "@/lib/types";

export type HeaderPlan = "FREE" | "PRO" | "STRENGTH_AI" | "NUTRI_AI";

const PLAN_BY_TOKEN: Record<string, HeaderPlan> = {
  FREE: "FREE",
  PRO: "PRO",
  STRENGTH_AI: "STRENGTH_AI",
  NUTRI_AI: "NUTRI_AI",
  STRENGTHAI: "STRENGTH_AI",
  NUTRIAI: "NUTRI_AI",
};

function toPlan(value: unknown): HeaderPlan | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/[\s-]/g, "_").toUpperCase();
  return PLAN_BY_TOKEN[normalized] ?? null;
}

export function resolveHeaderPlan(payload: AuthMeResponse | null | undefined): HeaderPlan {
  const directPlan = toPlan(payload?.subscriptionPlan) ?? toPlan(payload?.plan);
  if (directPlan) {
    return directPlan;
  }

  const basePlan = toPlan(payload?.entitlements?.plan?.effective) ?? toPlan(payload?.entitlements?.plan?.base);
  if (basePlan) {
    return basePlan;
  }

  const modules = payload?.entitlements?.modules;
  if (modules?.strength?.enabled === true) {
    return "STRENGTH_AI";
  }
  if (modules?.nutrition?.enabled === true) {
    return "NUTRI_AI";
  }
  if (modules?.ai?.enabled === true) {
    return "PRO";
  }

  return "FREE";
}
