import { describe, expect, it } from "vitest";
import type { NutritionPlanListItem } from "@/lib/types";
import {
  buildNutritionPlanSearch,
  getNutritionPlansFromResponse,
  resolveActiveNutritionPlanId,
} from "@/lib/nutritionPlanLibrary";

describe("nutritionPlanLibrary", () => {
  const basePlan: NutritionPlanListItem = {
    id: "plan-id",
    title: "Plan",
    dailyCalories: 2000,
    proteinG: 120,
    fatG: 70,
    carbsG: 210,
    startDate: "2026-01-01",
    daysCount: 7,
    createdAt: "2026-01-01",
  };

  it("normalizes plans payload from items/data/plans", () => {
    expect(getNutritionPlansFromResponse({ items: [{ ...basePlan, id: "a", title: "A" }] })).toHaveLength(1);
    expect(getNutritionPlansFromResponse({ data: [{ ...basePlan, id: "b", title: "B" }] })).toHaveLength(1);
    expect(getNutritionPlansFromResponse({ plans: [{ ...basePlan, id: "c", title: "C" }] })).toHaveLength(1);
    expect(getNutritionPlansFromResponse({})).toEqual([]);
  });

  it("resolves active plan id from query first, then storage, then assigned", () => {
    expect(resolveActiveNutritionPlanId(" query-plan ", "stored-plan", "assigned-plan")).toBe("query-plan");
    expect(resolveActiveNutritionPlanId("   ", " stored-plan ", "assigned-plan")).toBe("stored-plan");
    expect(resolveActiveNutritionPlanId(null, "", " assigned-plan ")).toBe("assigned-plan");
    expect(resolveActiveNutritionPlanId(null, "", "")).toBeNull();
  });

  it("builds next search params for active-plan selection", () => {
    expect(buildNutritionPlanSearch("/app/dietas", "query=abc", "plan-1")).toBe("/app/dietas?query=abc&planId=plan-1");
    expect(buildNutritionPlanSearch("/app/dietas", "", "plan-1")).toBe("/app/dietas?planId=plan-1");
  });
});
