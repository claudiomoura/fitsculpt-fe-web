import { describe, expect, it } from "vitest";
import { buildAdherenceStoreFromMeals, hasConsumedEntryForKey } from "@/lib/nutritionAdherence";

describe("nutritionAdherence helpers", () => {
  it("reconstructs full mealKey from API meal logs (only with completedAt)", () => {
    const store = buildAdherenceStoreFromMeals([
      {
        id: "1",
        userId: "u1",
        date: "2026-03-30",
        mealType: "BREAKFAST",
        title: "Avena con frutas",
        items: [],
        calories: 400,
        protein: 20,
        carbs: 55,
        fats: 10,
        completedAt: "2026-03-30T08:00:00.000Z",
        createdAt: "2026-03-30T08:00:00.000Z",
        updatedAt: "2026-03-30T08:00:00.000Z",
      },
      // Without completedAt — should be ignored (planned, not logged)
      {
        id: "2",
        userId: "u1",
        date: "2026-03-30",
        mealType: "LUNCH",
        title: "Ensalada",
        items: [],
        calories: 500,
        protein: 30,
        carbs: 40,
        fats: 20,
        completedAt: null,
        createdAt: "2026-03-30T08:00:00.000Z",
        updatedAt: "2026-03-30T08:00:00.000Z",
      },
    ]);

    // Should only include the breakfast (has completedAt), with full key format
    expect(store["2026-03-30"]).toEqual(["2026-03-30:breakfast:avena-con-frutas"]);
  });

  it("only matches exact mealKey — no type-level fallback", () => {
    // Exact match works
    expect(hasConsumedEntryForKey(["2026-03-30:breakfast:oatmeal"], "2026-03-30:breakfast:oatmeal")).toBe(true);
    // Different mealKey does NOT match (this was the bug — type fallback matched everything)
    expect(hasConsumedEntryForKey(["2026-03-30:breakfast:oatmeal"], "2026-03-30:breakfast:eggs")).toBe(false);
    // Different date does NOT match
    expect(hasConsumedEntryForKey(["2026-03-30:breakfast:oatmeal"], "2026-03-31:breakfast:oatmeal")).toBe(false);
    // Empty entries returns false
    expect(hasConsumedEntryForKey([], "breakfast:oatmeal")).toBe(false);
    expect(hasConsumedEntryForKey(undefined, "breakfast:oatmeal")).toBe(false);
  });
});
