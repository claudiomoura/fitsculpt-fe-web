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

type VarietyGuardMealType = NutritionMeal["type"];

type VarietyGuardResult = {
  plan: NutritionPlan;
  varietyGuardApplied: boolean;
  replacements: number;
};

function toCatalogMacros(recipe: NutritionRecipeCatalogItem) {
  return {
    calories: Math.round(recipe.calories),
    protein: Math.round(recipe.protein),
    carbs: Math.round(recipe.carbs),
    fats: Math.round(recipe.fat),
  };
}

function selectBestCandidate(
  candidates: NutritionRecipeCatalogItem[],
  usedRecipeIds: Set<string>,
  currentRecipeId: string | null,
  recipeUsage: Map<string, number>
) {
  const unused = candidates.find((candidate) => !usedRecipeIds.has(candidate.id));
  if (unused) {
    return unused;
  }

  const sortedByUsage = [...candidates].sort((left, right) => {
    const leftUsage = recipeUsage.get(left.id) ?? 0;
    const rightUsage = recipeUsage.get(right.id) ?? 0;
    if (leftUsage !== rightUsage) return leftUsage - rightUsage;
    return left.id.localeCompare(right.id);
  });

  return sortedByUsage.find((candidate) => candidate.id !== currentRecipeId) ?? sortedByUsage[0] ?? null;
}

export function applyNutritionPlanVarietyGuard(
  plan: NutritionPlan,
  recipeCatalog: NutritionRecipeCatalogItem[],
  guardedMealTypes: VarietyGuardMealType[] = ["lunch", "dinner"]
): VarietyGuardResult {
  if (recipeCatalog.length === 0 || plan.days.length <= 1) {
    return { plan, varietyGuardApplied: false, replacements: 0 };
  }

  const candidates = recipeCatalog;
  const candidatesById = new Map(candidates.map((recipe) => [recipe.id, recipe]));
  const guardedTypes = new Set<VarietyGuardMealType>(guardedMealTypes);
  const usedByMealType = new Map<VarietyGuardMealType, Set<string>>();
  const usageByMealType = new Map<VarietyGuardMealType, Map<string, number>>();
  let replacements = 0;

  const nextDays = plan.days.map((day) => ({
    ...day,
    meals: day.meals.map((meal) => ({
      ...meal,
      macros: { ...meal.macros },
      ingredients: meal.ingredients ? meal.ingredients.map((ingredient) => ({ ...ingredient })) : null,
    })),
  }));

  for (const day of nextDays) {
    for (const meal of day.meals) {
      if (!guardedTypes.has(meal.type)) continue;

      const usedForType = usedByMealType.get(meal.type) ?? new Set<string>();
      const usageForType = usageByMealType.get(meal.type) ?? new Map<string, number>();
      const currentRecipeId = meal.recipeId ?? null;
      const currentRecipe = currentRecipeId ? candidatesById.get(currentRecipeId) : undefined;
      const shouldReplace = !currentRecipe || usedForType.has(currentRecipe.id);

      const selectedRecipe = shouldReplace
        ? selectBestCandidate(candidates, usedForType, currentRecipeId, usageForType)
        : currentRecipe;

      if (!selectedRecipe) continue;

      if (meal.recipeId !== selectedRecipe.id) {
        replacements += 1;
      }

      meal.recipeId = selectedRecipe.id;
      meal.title = selectedRecipe.name;
      meal.description = selectedRecipe.description ?? meal.description;
      meal.macros = toCatalogMacros(selectedRecipe);
      meal.ingredients = selectedRecipe.ingredients.map((ingredient) => ({ ...ingredient }));

      usedForType.add(selectedRecipe.id);
      usageForType.set(selectedRecipe.id, (usageForType.get(selectedRecipe.id) ?? 0) + 1);
      usedByMealType.set(meal.type, usedForType);
      usageByMealType.set(meal.type, usageForType);
    }
  }

  return {
    plan: replacements > 0 ? { ...plan, days: nextDays } : plan,
    varietyGuardApplied: replacements > 0,
    replacements,
  };
}
