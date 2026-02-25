import assert from "node:assert/strict";
import { resolveNutritionPlanRecipeReferences } from "../ai/nutrition-plan/recipeCatalog.js";

const catalog = [
  {
    id: "rec_1",
    name: "Avena proteica",
    description: "Desayuno",
    calories: 420,
    protein: 28,
    carbs: 52,
    fat: 12,
    ingredients: [{ name: "Avena", grams: 60 }],
  },
  {
    id: "rec_2",
    name: "Pollo con arroz",
    description: "Almuerzo",
    calories: 680,
    protein: 48,
    carbs: 70,
    fat: 20,
    ingredients: [{ name: "Pollo", grams: 180 }],
  },
];

const plan = {
  days: [
    {
      meals: [
        {
          type: "breakfast" as const,
          title: "Inventado",
          description: null,
          recipeId: "rec_404",
          macros: { calories: 999, protein: 1, carbs: 1, fats: 1 },
          ingredients: null,
        },
      ],
    },
  ],
};

const resolved = resolveNutritionPlanRecipeReferences(plan, catalog);
assert.equal(resolved.hasCatalog, true);
assert.equal(resolved.fallbackApplied, true);
assert.equal(resolved.invalidReferences, 1);
assert.equal(resolved.plan.days[0].meals[0].recipeId, "rec_1");
assert.equal(resolved.plan.days[0].meals[0].title, "Avena proteica");

const noCatalog = resolveNutritionPlanRecipeReferences(plan, []);
assert.equal(noCatalog.hasCatalog, false);
assert.equal(noCatalog.plan.days[0].meals[0].recipeId, null);

console.log("nutrition recipe catalog tests passed");
