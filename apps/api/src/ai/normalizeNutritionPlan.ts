import { NUTRITION_MATH_ROUNDING } from "./nutritionMathValidation.js";

type NutritionMeal = {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  description: string | null;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  ingredients:
    | {
        name: string;
        grams: number;
      }[]
    | null;
};

type NutritionPlan = {
  title: string;
  startDate: string | null;
  dailyCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  days: {
    date?: string;
    dayLabel: string;
    meals: NutritionMeal[];
  }[];
  shoppingList:
    | {
        name: string;
        grams: number;
      }[]
    | null;
};

function roundValue(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toNumber(value: number) {
  return Number.isFinite(value) ? value : Number(value);
}

export function normalizeNutritionPlan<T extends NutritionPlan>(plan: T): T {
  const normalizedDays = plan.days.map((day) => {
    const meals = day.meals.map((meal) => {
      const protein = roundValue(toNumber(meal.macros.protein), NUTRITION_MATH_ROUNDING.gramsDecimals);
      const carbs = roundValue(toNumber(meal.macros.carbs), NUTRITION_MATH_ROUNDING.gramsDecimals);
      const fats = roundValue(toNumber(meal.macros.fats), NUTRITION_MATH_ROUNDING.gramsDecimals);
      const calories = roundValue(
        protein * 4 + carbs * 4 + fats * 9,
        NUTRITION_MATH_ROUNDING.kcalDecimals
      );

      return {
        ...meal,
        macros: {
          calories,
          protein,
          carbs,
          fats,
        },
        ingredients: meal.ingredients ? meal.ingredients.map((ingredient) => ({ ...ingredient })) : null,
      };
    });

    return {
      ...day,
      meals,
    };
  });

  const dayTotals = normalizedDays.map((day) =>
    day.meals.reduce(
      (acc, meal) => {
        acc.calories += meal.macros.calories;
        acc.protein += meal.macros.protein;
        acc.carbs += meal.macros.carbs;
        acc.fats += meal.macros.fats;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )
  );

  const dayCount = Math.max(1, dayTotals.length);
  const totals = dayTotals.reduce(
    (acc, dayTotal) => {
      acc.calories += dayTotal.calories;
      acc.protein += dayTotal.protein;
      acc.carbs += dayTotal.carbs;
      acc.fats += dayTotal.fats;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return {
    ...plan,
    days: normalizedDays,
    dailyCalories: roundValue(totals.calories / dayCount, NUTRITION_MATH_ROUNDING.kcalDecimals),
    proteinG: roundValue(totals.protein / dayCount, NUTRITION_MATH_ROUNDING.gramsDecimals),
    carbsG: roundValue(totals.carbs / dayCount, NUTRITION_MATH_ROUNDING.gramsDecimals),
    fatG: roundValue(totals.fats / dayCount, NUTRITION_MATH_ROUNDING.gramsDecimals),
  };
}
