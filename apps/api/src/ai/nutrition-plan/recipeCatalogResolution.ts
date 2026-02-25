export type NutritionRecipeCatalogItem = {
  id: string;
  name: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{ name: string; grams: number }>;
};

type NutritionMeal = {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  recipeId?: string | null;
  title: string;
  description: string | null;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  ingredients: Array<{ name: string; grams: number }> | null;
};

type NutritionPlan = {
  title: string;
  days: Array<{
    dayLabel: string;
    meals: NutritionMeal[];
  }>;
};

export type InvalidNutritionRecipeId = {
  day: string;
  mealType: NutritionMeal["type"];
  title: string;
  recipeId: string | null;
  reason: "MISSING_RECIPE_ID" | "UNKNOWN_RECIPE_ID";
};

function roundToNearest5(value: number) {
  return Math.max(0, Math.round(value / 5) * 5);
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scaleRecipe(recipe: NutritionRecipeCatalogItem, targetCalories: number) {
  const safeTargetCalories = Number.isFinite(targetCalories) && targetCalories > 0 ? targetCalories : recipe.calories;
  const scale = recipe.calories > 0 ? safeTargetCalories / recipe.calories : 1;

  return {
    macros: {
      calories: Math.round(recipe.calories * scale),
      protein: Math.round(recipe.protein * scale),
      carbs: Math.round(recipe.carbs * scale),
      fats: Math.round(recipe.fat * scale),
    },
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      grams: roundToNearest5(ingredient.grams * scale),
    })),
  };
}

function resolveMealRecipe(
  meal: NutritionMeal,
  recipeCatalog: NutritionRecipeCatalogItem[],
  recipesById: Map<string, NutritionRecipeCatalogItem>,
  recipesByName: Map<string, NutritionRecipeCatalogItem>,
  fallbackRecipe: NutritionRecipeCatalogItem
) {
  if (meal.recipeId) {
    const byId = recipesById.get(meal.recipeId);
    if (byId) return byId;
  }

  const normalizedMealName = normalizeName(meal.title);
  if (normalizedMealName) {
    const byName = recipesByName.get(normalizedMealName);
    if (byName) return byName;
  }

  return fallbackRecipe ?? recipeCatalog[0];
}

export function findInvalidNutritionRecipeIds(
  plan: NutritionPlan,
  recipeCatalog: NutritionRecipeCatalogItem[]
): InvalidNutritionRecipeId[] {
  const recipeIds = new Set(recipeCatalog.map((recipe) => recipe.id));
  const issues: InvalidNutritionRecipeId[] = [];

  for (const day of plan.days ?? []) {
    for (const meal of day.meals ?? []) {
      if (!meal.recipeId) {
        issues.push({
          day: day.dayLabel,
          mealType: meal.type,
          title: meal.title,
          recipeId: null,
          reason: "MISSING_RECIPE_ID",
        });
        continue;
      }
      if (!recipeIds.has(meal.recipeId)) {
        issues.push({
          day: day.dayLabel,
          mealType: meal.type,
          title: meal.title,
          recipeId: meal.recipeId,
          reason: "UNKNOWN_RECIPE_ID",
        });
      }
    }
  }

  return issues;
}

export function resolveNutritionPlanRecipeIds(
  plan: NutritionPlan,
  recipeCatalog: NutritionRecipeCatalogItem[]
): { plan: NutritionPlan; invalidMeals: InvalidNutritionRecipeId[]; catalogAvailable: boolean } {
  if (recipeCatalog.length === 0) {
    return {
      plan,
      invalidMeals: [],
      catalogAvailable: false,
    };
  }

  const recipesById = new Map(recipeCatalog.map((recipe) => [recipe.id, recipe]));
  const recipesByName = new Map(recipeCatalog.map((recipe) => [normalizeName(recipe.name), recipe]));
  const invalidMeals = findInvalidNutritionRecipeIds(plan, recipeCatalog);

  const resolvedPlan: NutritionPlan = {
    ...plan,
    days: plan.days.map((day, dayIndex) => ({
      ...day,
      meals: day.meals.map((meal, mealIndex) => {
        const fallbackRecipe = recipeCatalog[(dayIndex + mealIndex) % recipeCatalog.length] ?? recipeCatalog[0]!;
        const resolvedRecipe = resolveMealRecipe(meal, recipeCatalog, recipesById, recipesByName, fallbackRecipe);
        const scaledRecipe = scaleRecipe(resolvedRecipe, meal.macros.calories);

        return {
          ...meal,
          recipeId: resolvedRecipe.id,
          title: resolvedRecipe.name,
          description: resolvedRecipe.description ?? meal.description,
          macros: scaledRecipe.macros,
          ingredients: scaledRecipe.ingredients,
        };
      }),
    })),
  };

  return {
    plan: resolvedPlan,
    invalidMeals,
    catalogAvailable: true,
  };
}
