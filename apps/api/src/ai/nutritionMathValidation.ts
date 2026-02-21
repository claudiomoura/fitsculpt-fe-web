export const NUTRITION_MATH_TOLERANCES = {
  dailyKcalAbsolute: 120,
  dailyKcalRelative: 0.06,
  macroGramsAbsolute: 12,
  twoMealSplitKcalAbsolute: 80,
} as const;

export const NUTRITION_MATH_ROUNDING = {
  kcalDecimals: 0,
  gramsDecimals: 1,
} as const;

type MacroTargets = {
  proteinG: number;
  carbsG: number;
  fatsG: number;
};

export type NutritionMathConstraints = {
  targetKcal: number;
  mealsPerDay: number;
  macroTargets?: MacroTargets;
};

type Meal = {
  title: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
};

type PlanDay = {
  dayLabel: string;
  meals: Meal[];
};

export type NutritionMathPlan = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  days: PlanDay[];
};

export type NutritionDiff = {
  expected: number;
  actual: number;
  delta: number;
  absDelta: number;
  tolerance: number;
  withinTolerance: boolean;
};

export type NutritionMathValidationIssue = {
  reason: string;
  dayLabel?: string;
  mealTitle?: string;
  diff: NutritionDiff;
};

function roundValue(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getDailyKcalTolerance(expectedKcal: number) {
  const absoluteTolerance = NUTRITION_MATH_TOLERANCES.dailyKcalAbsolute;
  const relativeTolerance = Math.abs(expectedKcal) * NUTRITION_MATH_TOLERANCES.dailyKcalRelative;
  return Math.max(absoluteTolerance, relativeTolerance);
}

function buildDiff(actual: number, expected: number, tolerance: number, decimals: number): NutritionDiff {
  const roundedActual = roundValue(actual, decimals);
  const roundedExpected = roundValue(expected, decimals);
  const delta = roundValue(roundedActual - roundedExpected, decimals);
  const absDelta = Math.abs(delta);
  const roundedTolerance = roundValue(tolerance, decimals);

  return {
    expected: roundedExpected,
    actual: roundedActual,
    delta,
    absDelta,
    tolerance: roundedTolerance,
    withinTolerance: absDelta <= roundedTolerance,
  };
}

function asIssue(reason: string, actual: number, expected: number, tolerance: number, decimals: number): NutritionMathValidationIssue | null {
  const diff = buildDiff(actual, expected, tolerance, decimals);
  if (diff.withinTolerance) return null;
  return { reason, diff };
}

export function validateNutritionMath(
  plan: NutritionMathPlan,
  constraints: NutritionMathConstraints
): NutritionMathValidationIssue | null {
  const macroTargets = constraints.macroTargets;

  const caloriesIssue = asIssue(
    "DAILY_CALORIES_MISMATCH",
    plan.dailyCalories,
    constraints.targetKcal,
    getDailyKcalTolerance(constraints.targetKcal),
    NUTRITION_MATH_ROUNDING.kcalDecimals
  );
  if (caloriesIssue) return caloriesIssue;

  if (macroTargets) {
    const proteinIssue = asIssue(
      "PROTEIN_MISMATCH",
      plan.proteinG,
      macroTargets.proteinG,
      NUTRITION_MATH_TOLERANCES.macroGramsAbsolute,
      NUTRITION_MATH_ROUNDING.gramsDecimals
    );
    if (proteinIssue) return proteinIssue;

    const carbsIssue = asIssue(
      "CARBS_MISMATCH",
      plan.carbsG,
      macroTargets.carbsG,
      NUTRITION_MATH_TOLERANCES.macroGramsAbsolute,
      NUTRITION_MATH_ROUNDING.gramsDecimals
    );
    if (carbsIssue) return carbsIssue;

    const fatsIssue = asIssue(
      "FATS_MISMATCH",
      plan.fatG,
      macroTargets.fatsG,
      NUTRITION_MATH_TOLERANCES.macroGramsAbsolute,
      NUTRITION_MATH_ROUNDING.gramsDecimals
    );
    if (fatsIssue) return fatsIssue;
  }

  for (const day of plan.days) {
    if (day.meals.length !== constraints.mealsPerDay) {
      return {
        reason: "MEALS_PER_DAY_MISMATCH",
        dayLabel: day.dayLabel,
        diff: {
          expected: constraints.mealsPerDay,
          actual: day.meals.length,
          delta: day.meals.length - constraints.mealsPerDay,
          absDelta: Math.abs(day.meals.length - constraints.mealsPerDay),
          tolerance: 0,
          withinTolerance: false,
        },
      };
    }

    const dayTotals = day.meals.reduce(
      (acc, meal) => {
        acc.calories += meal.macros.calories;
        acc.protein += meal.macros.protein;
        acc.carbs += meal.macros.carbs;
        acc.fats += meal.macros.fats;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    const dayCaloriesIssue = asIssue(
      "DAY_TOTAL_CALORIES_MISMATCH",
      dayTotals.calories,
      constraints.targetKcal,
      getDailyKcalTolerance(constraints.targetKcal),
      NUTRITION_MATH_ROUNDING.kcalDecimals
    );
    if (dayCaloriesIssue) {
      return { ...dayCaloriesIssue, dayLabel: day.dayLabel };
    }

    if (macroTargets) {
      const dayProteinIssue = asIssue(
        "DAY_TOTAL_PROTEIN_MISMATCH",
        dayTotals.protein,
        macroTargets.proteinG,
        NUTRITION_MATH_TOLERANCES.macroGramsAbsolute,
        NUTRITION_MATH_ROUNDING.gramsDecimals
      );
      if (dayProteinIssue) return { ...dayProteinIssue, dayLabel: day.dayLabel };

      const dayCarbsIssue = asIssue(
        "DAY_TOTAL_CARBS_MISMATCH",
        dayTotals.carbs,
        macroTargets.carbsG,
        NUTRITION_MATH_TOLERANCES.macroGramsAbsolute,
        NUTRITION_MATH_ROUNDING.gramsDecimals
      );
      if (dayCarbsIssue) return { ...dayCarbsIssue, dayLabel: day.dayLabel };

      const dayFatsIssue = asIssue(
        "DAY_TOTAL_FATS_MISMATCH",
        dayTotals.fats,
        macroTargets.fatsG,
        NUTRITION_MATH_TOLERANCES.macroGramsAbsolute,
        NUTRITION_MATH_ROUNDING.gramsDecimals
      );
      if (dayFatsIssue) return { ...dayFatsIssue, dayLabel: day.dayLabel };
    }

    if (constraints.mealsPerDay === 2) {
      const expectedMealKcal = constraints.targetKcal / 2;
      for (const meal of day.meals) {
        const splitIssue = asIssue(
          "TWO_MEAL_SPLIT_MISMATCH",
          meal.macros.calories,
          expectedMealKcal,
          NUTRITION_MATH_TOLERANCES.twoMealSplitKcalAbsolute,
          NUTRITION_MATH_ROUNDING.kcalDecimals
        );
        if (splitIssue) {
          return {
            ...splitIssue,
            dayLabel: day.dayLabel,
            mealTitle: meal.title,
          };
        }
      }
    }
  }

  return null;
}
