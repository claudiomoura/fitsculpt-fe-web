import { describe, expect, it } from "vitest";
import { DAY_LABELS, normalizeNutritionPlan } from "@/app/(app)/app/nutricion/NutritionPlanClient";

describe("normalizeNutritionPlan", () => {
  it("expands short plans to 7 days using day labels", () => {
    const plan = {
      dailyCalories: 2000,
      proteinG: 140,
      fatG: 60,
      carbsG: 240,
      days: [
        { dayLabel: "Lunes", meals: [] },
        { dayLabel: "Martes", meals: [] },
        { dayLabel: "Miércoles", meals: [] },
      ],
    };

    const normalized = normalizeNutritionPlan(plan, DAY_LABELS.es);

    expect(normalized?.days).toHaveLength(7);
    expect(normalized?.days.map((day) => day.dayLabel)).toEqual(DAY_LABELS.es);
  });
});
