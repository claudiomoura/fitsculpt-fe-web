import assert from "node:assert/strict";
import {
  applyNutritionPlanVarietyGuard,
  type NutritionRecipeCatalogItem,
} from "../ai/nutrition-plan/recipeCatalogResolution.js";

type MealType = "lunch" | "dinner";

function buildCatalog(size: number): NutritionRecipeCatalogItem[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `rcp_${index + 1}`,
    name: `Receta ${index + 1}`,
    calories: 550 + index,
    protein: 30 + index,
    carbs: 45 + index,
    fat: 18 + index,
    ingredients: [{ name: `Ingrediente ${index + 1}`, grams: 120 + index }],
  }));
}

function buildMockAiPlan(repeatedRecipeId: string) {
  return {
    title: "Respuesta IA repetitiva",
    days: Array.from({ length: 7 }, (_, index) => ({
      dayLabel: `Día ${index + 1}`,
      meals: [
        {
          type: "lunch" as const,
          recipeId: repeatedRecipeId,
          title: "Receta repetida",
          description: null,
          macros: { calories: 600, protein: 40, carbs: 60, fats: 20 },
          ingredients: null,
        },
        {
          type: "dinner" as const,
          recipeId: repeatedRecipeId,
          title: "Receta repetida",
          description: null,
          macros: { calories: 600, protein: 40, carbs: 60, fats: 20 },
          ingredients: null,
        },
      ],
    })),
  };
}

function assertNoSameDayDuplicates(days: Array<{ meals: Array<{ type: MealType; recipeId?: string | null }> }>) {
  for (const day of days) {
    const lunch = day.meals.find((meal) => meal.type === "lunch");
    const dinner = day.meals.find((meal) => meal.type === "dinner");
    assert.ok(lunch?.recipeId, "expected lunch recipeId");
    assert.ok(dinner?.recipeId, "expected dinner recipeId");
    assert.notEqual(lunch?.recipeId, dinner?.recipeId, "lunch and dinner must not repeat in the same day");
  }
}

const repeatedMockPlan = buildMockAiPlan("rcp_1");

const largeCatalogResult = applyNutritionPlanVarietyGuard(repeatedMockPlan, buildCatalog(20), ["lunch", "dinner"]);
assert.equal(largeCatalogResult.varietyGuardApplied, true);
assert.equal(largeCatalogResult.hadEnoughUniqueRecipes, true);
assert.equal(largeCatalogResult.uniqueRecipeIdsWeek, 14, "expected unique IDs for every guarded slot when catalog is sufficient");
assert.equal(largeCatalogResult.replacements, 14, "expected replacement on every guarded slot from repetitive AI output");
assertNoSameDayDuplicates(largeCatalogResult.plan.days);

const weeklyIdsLargeCatalog = new Set(
  largeCatalogResult.plan.days.flatMap((day) => day.meals.map((meal) => meal.recipeId).filter(Boolean))
);
assert.equal(weeklyIdsLargeCatalog.size, 14, "weekly recipe IDs should be unique when enough catalog recipes exist");

const smallCatalogResult = applyNutritionPlanVarietyGuard(repeatedMockPlan, buildCatalog(4), ["lunch", "dinner"]);
assert.equal(smallCatalogResult.varietyGuardApplied, true);
assert.equal(smallCatalogResult.hadEnoughUniqueRecipes, false);
assertNoSameDayDuplicates(smallCatalogResult.plan.days);

const weeklyIdsSmallCatalog = new Set(
  smallCatalogResult.plan.days.flatMap((day) => day.meals.map((meal) => meal.recipeId).filter(Boolean))
);
assert.ok(
  weeklyIdsSmallCatalog.size <= 4,
  `expected weekly repeats with small catalog; got ${weeklyIdsSmallCatalog.size} unique IDs for 14 slots`
);

console.log("nutrition variety guard regression tests passed");
