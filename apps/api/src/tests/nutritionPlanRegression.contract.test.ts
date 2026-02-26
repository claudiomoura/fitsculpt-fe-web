import assert from "node:assert/strict";
import { normalizeNutritionPlanDays } from "../ai/nutrition-plan/normalizeNutritionPlanDays.js";
import {
  applyNutritionPlanVarietyGuard,
  type NutritionRecipeCatalogItem,
} from "../ai/nutrition-plan/recipeCatalogResolution.js";

const startDate = new Date("2024-01-01T00:00:00.000Z");
const repeatedDays = Array.from({ length: 3 }, () => ({
  date: "2024-01-01",
  dayLabel: "Lunes",
  meals: [
    {
      type: "lunch" as const,
      recipeId: "rcp_1",
      title: "Pollo base",
      description: null,
      macros: { calories: 600, protein: 35, carbs: 55, fats: 20 },
      ingredients: null,
    },
  ],
}));

const normalizedPlanResult = normalizeNutritionPlanDays(
  {
    title: "Plan",
    startDate: null,
    dailyCalories: 2000,
    proteinG: 120,
    fatG: 70,
    carbsG: 220,
    days: repeatedDays,
    shoppingList: null,
  },
  startDate,
  7
);

const expectedDates = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07"];
const actualDates = normalizedPlanResult.plan.days.map((day) => day.date);
assert.deepEqual(actualDates, expectedDates);

const dayLabels = normalizedPlanResult.plan.days.map((day) => day.dayLabel);
assert.notEqual(new Set(dayLabels).size, 1, "dayLabel must be derived from each date and vary across a week");
assert.equal(dayLabels[0], "Lunes");
assert.equal(dayLabels[1], "Martes");

const catalog: NutritionRecipeCatalogItem[] = [
  {
    id: "rcp_1",
    name: "Pollo con arroz",
    calories: 650,
    protein: 45,
    carbs: 70,
    fat: 18,
    ingredients: [{ name: "Pollo", grams: 180 }],
  },
  {
    id: "rcp_2",
    name: "Salmón con quinoa",
    calories: 620,
    protein: 40,
    carbs: 60,
    fat: 20,
    ingredients: [{ name: "Salmón", grams: 170 }],
  },
  {
    id: "rcp_3",
    name: "Pasta integral",
    calories: 700,
    protein: 30,
    carbs: 95,
    fat: 16,
    ingredients: [{ name: "Pasta", grams: 190 }],
  },
  {
    id: "rcp_4",
    name: "Tofu salteado",
    calories: 580,
    protein: 33,
    carbs: 52,
    fat: 19,
    ingredients: [{ name: "Tofu", grams: 180 }],
  },
];

const repeatedPlan = {
  title: "Plan repetido",
  days: Array.from({ length: 7 }, (_, index) => ({
    dayLabel: `Día ${index + 1}`,
    meals: [
      {
        type: "lunch" as const,
        recipeId: "rcp_1",
        title: "Pollo con arroz",
        description: null,
        macros: { calories: 650, protein: 45, carbs: 70, fats: 18 },
        ingredients: null,
      },
      {
        type: "dinner" as const,
        recipeId: "rcp_1",
        title: "Pollo con arroz",
        description: null,
        macros: { calories: 650, protein: 45, carbs: 70, fats: 18 },
        ingredients: null,
      },
    ],
  })),
};

const varietyResult = applyNutritionPlanVarietyGuard(repeatedPlan, catalog, ["lunch", "dinner"]);
assert.equal(varietyResult.varietyGuardApplied, true, "variety guard should activate for repeated AI output");

const weeklyRecipeIds = new Set(
  varietyResult.plan.days.flatMap((day) => day.meals.map((meal) => meal.recipeId).filter(Boolean))
);
assert.ok(
  weeklyRecipeIds.size > 2,
  `expected more than 2 unique recipeIds across the week, got ${weeklyRecipeIds.size}`
);

console.log("nutrition plan regression contract test passed");
