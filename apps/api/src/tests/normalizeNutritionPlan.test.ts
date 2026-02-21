import assert from "node:assert/strict";
import { normalizeNutritionPlan } from "../ai/normalizeNutritionPlan.js";
import { validateNutritionMath } from "../ai/nutritionMathValidation.js";

const basePlan = {
  title: "Plan test",
  startDate: "2024-01-01",
  dailyCalories: 999,
  proteinG: 1,
  fatG: 1,
  carbsG: 1,
  shoppingList: null,
  days: [
    {
      date: "2024-01-01",
      dayLabel: "Lunes",
      meals: [
        {
          type: "breakfast" as const,
          title: "Desayuno",
          description: null,
          macros: { calories: 400, protein: 30.06, carbs: 40.05, fats: 13.94 },
          ingredients: null,
        },
        {
          type: "dinner" as const,
          title: "Cena",
          description: null,
          macros: { calories: 700, protein: 49.96, carbs: 69.94, fats: 23.36 },
          ingredients: null,
        },
      ],
    },
  ],
};

const normalized = normalizeNutritionPlan(basePlan);

assert.equal(basePlan.dailyCalories, 999, "normalization must be side-effect free");
assert.equal(normalized.dailyCalories, 1060, "daily calories should be recomputed from meals");
assert.equal(normalized.proteinG, 80, "protein should be recomputed and rounded");
assert.equal(normalized.carbsG, 110, "carbs should be recomputed and rounded");
assert.equal(normalized.fatG, 37.3, "fats should be recomputed and rounded");
assert.equal(normalized.days[0].meals[0].macros.calories, 417, "meal calories should be derived from rounded macros");
assert.deepEqual(normalizeNutritionPlan(normalized), normalized, "normalization should be deterministic");

const mathIssue = validateNutritionMath(normalized, {
  targetKcal: 1060,
  mealsPerDay: 2,
  macroTargets: {
    proteinG: 80,
    carbsG: 110,
    fatsG: 37.3,
  },
});

assert.equal(mathIssue, null, "normalized plan should pass strict nutrition math validation");

console.log("normalizeNutritionPlan tests passed");
