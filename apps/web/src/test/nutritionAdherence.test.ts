import { describe, expect, it } from "vitest";
import { buildAdherenceStoreFromMeals, hasConsumedEntryForKey } from "@/lib/nutritionAdherence";

describe("nutritionAdherence helpers", () => {
  it("normalizes API meal types to lowercase store keys", () => {
    const store = buildAdherenceStoreFromMeals([
      {
        id: "1",
        userId: "u1",
        date: "2026-03-30",
        mealType: "BREAKFAST",
        title: "Avena",
        items: [],
        calories: 400,
        protein: 20,
        carbs: 55,
        fats: 10,
        completedAt: "2026-03-30T08:00:00.000Z",
        createdAt: "2026-03-30T08:00:00.000Z",
        updatedAt: "2026-03-30T08:00:00.000Z",
      },
    ]);

    expect(store["2026-03-30"]).toEqual(["breakfast"]);
  });

  it("treats typed meal key as consumed when store has meal type token", () => {
    expect(hasConsumedEntryForKey(["breakfast"], "breakfast:oatmeal")).toBe(true);
    expect(hasConsumedEntryForKey(["dinner"], "cena:pescado")).toBe(true);
    expect(hasConsumedEntryForKey(["lunch"], "breakfast:oatmeal")).toBe(false);
  });
});
