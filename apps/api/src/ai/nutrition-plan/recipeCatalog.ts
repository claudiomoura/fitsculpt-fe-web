export type NutritionIngredientLike = {
  name: string;
  grams: number;
};

export type NutritionMealLike = {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  description: string | null;
  recipeId?: string | null;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  ingredients: NutritionIngredientLike[] | null;
};

export type NutritionDayLike = {
  meals: NutritionMealLike[];
};

export type NutritionPlanLike = {
  days: NutritionDayLike[];
};

export type CatalogRecipe = {
  id: string;
  name: string;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: NutritionIngredientLike[];
};

export type RecipeResolutionResult<TPlan extends NutritionPlanLike> = {
  plan: TPlan;
  hasCatalog: boolean;
  fallbackApplied: boolean;
  invalidReferences: number;
};

export function resolveNutritionPlanRecipeReferences<TPlan extends NutritionPlanLike>(
  plan: TPlan,
  recipes: CatalogRecipe[]
): RecipeResolutionResult<TPlan> {
  if (recipes.length === 0) {
    const nullCatalogPlan = {
      ...plan,
      days: plan.days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) => ({
          ...meal,
          recipeId: null,
        })),
      })),
    } as TPlan;

    return {
      plan: nullCatalogPlan,
      hasCatalog: false,
      fallbackApplied: false,
      invalidReferences: 0,
    };
  }

  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  let fallbackApplied = false;
  let invalidReferences = 0;

  const resolved = {
    ...plan,
    days: plan.days.map((day, dayIndex) => ({
      ...day,
      meals: day.meals.map((meal, mealIndex) => {
        const recipe = meal.recipeId ? recipeMap.get(meal.recipeId) : undefined;
        const fallbackRecipe = recipes[(dayIndex + mealIndex) % recipes.length];
        const resolvedRecipe = recipe ?? fallbackRecipe;

        if (!recipe) {
          fallbackApplied = true;
          invalidReferences += 1;
        }

        return {
          ...meal,
          recipeId: resolvedRecipe.id,
          title: resolvedRecipe.name,
          description: resolvedRecipe.description,
          macros: {
            calories: Math.round(resolvedRecipe.calories),
            protein: Math.round(resolvedRecipe.protein * 10) / 10,
            carbs: Math.round(resolvedRecipe.carbs * 10) / 10,
            fats: Math.round(resolvedRecipe.fat * 10) / 10,
          },
          ingredients: resolvedRecipe.ingredients.map((ingredient) => ({ ...ingredient })),
        };
      }),
    })),
  } as TPlan;

  return {
    plan: resolved,
    hasCatalog: true,
    fallbackApplied,
    invalidReferences,
  };
}
