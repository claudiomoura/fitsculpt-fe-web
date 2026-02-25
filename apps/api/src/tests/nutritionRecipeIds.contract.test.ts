import assert from "node:assert/strict";
import {
  findInvalidNutritionRecipeIds,
  resolveNutritionPlanRecipeIds,
  type NutritionRecipeCatalogItem,
} from "../ai/nutrition-plan/recipeCatalogResolution.js";

const catalog: NutritionRecipeCatalogItem[] = [
  {
    id: "rcp_1",
    name: "Bowl de avena",
    description: "Avena con frutas",
    calories: 400,
    protein: 20,
    carbs: 55,
    fat: 10,
    ingredients: [
      { name: "Avena", grams: 80 },
      { name: "Fruta", grams: 120 },
    ],
  },
  {
    id: "rcp_2",
    name: "Pollo con arroz",
    description: "Almuerzo clásico",
    calories: 650,
    protein: 45,
    carbs: 70,
    fat: 18,
    ingredients: [
      { name: "Pollo", grams: 180 },
      { name: "Arroz", grams: 200 },
    ],
  },
];

const planWithInvalidIds = {
  title: "Plan",
  days: [
    {
      dayLabel: "Día 1",
      meals: [
        {
          type: "breakfast" as const,
          recipeId: "unknown",
          title: "Inventado",
          description: null,
          macros: { calories: 420, protein: 20, carbs: 52, fats: 12 },
          ingredients: null,
        },
        {
          type: "lunch" as const,
          recipeId: null,
          title: "Pollo con arroz",
          description: null,
          macros: { calories: 650, protein: 45, carbs: 70, fats: 18 },
          ingredients: null,
        },
      ],
    },
  ],
};

const issues = findInvalidNutritionRecipeIds(planWithInvalidIds, catalog);
assert.deepEqual(issues, [
  {
    day: "Día 1",
    mealType: "breakfast",
    title: "Inventado",
    recipeId: "unknown",
    reason: "UNKNOWN_RECIPE_ID",
  },
  {
    day: "Día 1",
    mealType: "lunch",
    title: "Pollo con arroz",
    recipeId: null,
    reason: "MISSING_RECIPE_ID",
  },
]);

const resolved = resolveNutritionPlanRecipeIds(planWithInvalidIds, catalog);
assert.equal(resolved.catalogAvailable, true);
assert.equal(resolved.invalidMeals.length, 2);
assert.equal(resolved.plan.days[0]?.meals[0]?.recipeId, "rcp_1");
assert.equal(resolved.plan.days[0]?.meals[1]?.recipeId, "rcp_2");
assert.equal(resolved.plan.days[0]?.meals[1]?.title, "Pollo con arroz");

const emptyCatalogResult = resolveNutritionPlanRecipeIds(planWithInvalidIds, []);
assert.equal(emptyCatalogResult.catalogAvailable, false);
assert.deepEqual(emptyCatalogResult.plan, planWithInvalidIds);

console.log("nutrition recipe ids contract test passed");
