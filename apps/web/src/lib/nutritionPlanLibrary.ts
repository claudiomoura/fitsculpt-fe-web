import type { NutritionPlanListItem } from "@/lib/types";

export const ACTIVE_NUTRITION_PLAN_STORAGE_KEY = "fs_active_nutrition_plan_id";
export const NUTRITION_PLANS_UPDATED_AT_KEY = "fs_nutrition_plans_updated_at";

export type NutritionPlanResponse = {
  items?: NutritionPlanListItem[];
  data?: NutritionPlanListItem[];
  plans?: NutritionPlanListItem[];
};

export function getNutritionPlanId(plan: NutritionPlanListItem): string {
  const candidate = (plan as NutritionPlanListItem & { planId?: string }).planId;
  return (typeof candidate === "string" && candidate.trim().length > 0) ? candidate : plan.id;
}

export function getNutritionPlanDate(plan: NutritionPlanListItem): string {
  return plan.createdAt || plan.startDate;
}

export function getNutritionPlansFromResponse(payload: NutritionPlanResponse): NutritionPlanListItem[] {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.plans)) return payload.plans;
  return [];
}

export function isUnavailableNutritionStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 404 || status === 405 || status === 501;
}

export function normalizePlanSelection(planId: string | null | undefined): string | null {
  if (!planId) return null;
  const normalized = planId.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveActiveNutritionPlanId(
  queryPlanId: string | null | undefined,
  storedPlanId: string | null | undefined,
): string | null {
  return normalizePlanSelection(queryPlanId) ?? normalizePlanSelection(storedPlanId);
}

export function buildNutritionPlanSearch(pathname: string, currentSearch: string, planId: string): string {
  const normalized = normalizePlanSelection(planId);
  if (!normalized) return pathname;
  const params = new URLSearchParams(currentSearch);
  params.set("planId", normalized);
  return `${pathname}?${params.toString()}`;
}
