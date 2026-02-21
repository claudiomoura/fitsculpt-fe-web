import { validateNutritionMath } from "../ai/nutritionMathValidation.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildBasePlan() {
  return {
    dailyCalories: 2000,
    proteinG: 150,
    carbsG: 220,
    fatG: 60,
    days: [
      {
        dayLabel: "Día 1",
        meals: [
          { title: "Comida 1", macros: { calories: 1000, protein: 75, carbs: 110, fats: 30 } },
          { title: "Comida 2", macros: { calories: 1000, protein: 75, carbs: 110, fats: 30 } },
        ],
      },
    ],
  };
}

const constraints = {
  targetKcal: 2000,
  mealsPerDay: 2,
  macroTargets: {
    proteinG: 150,
    carbsG: 220,
    fatsG: 60,
  },
};

const perfectMatch = validateNutritionMath(buildBasePlan(), constraints);
assert(perfectMatch === null, "Perfect math match should pass");

const smallMismatchPlan = buildBasePlan();
smallMismatchPlan.dailyCalories = 2100;
smallMismatchPlan.days[0].meals[0].macros.calories = 1060;
smallMismatchPlan.days[0].meals[1].macros.calories = 1040;
smallMismatchPlan.proteinG = 157.8;
smallMismatchPlan.days[0].meals[0].macros.protein = 80.1;
smallMismatchPlan.days[0].meals[1].macros.protein = 77.7;

const smallMismatch = validateNutritionMath(smallMismatchPlan, constraints);
assert(smallMismatch === null, "Small mismatch within tolerance should pass");

const largeMismatchPlan = buildBasePlan();
largeMismatchPlan.dailyCalories = 2235;
largeMismatchPlan.days[0].meals[0].macros.calories = 1300;
largeMismatchPlan.days[0].meals[1].macros.calories = 935;

const largeMismatch = validateNutritionMath(largeMismatchPlan, constraints);
assert(largeMismatch !== null, "Large mismatch should fail");
assert(largeMismatch?.reason === "DAILY_CALORIES_MISMATCH", "Large mismatch should fail on daily calories");
assert(largeMismatch?.diff.expected === 2000, "Error payload should include expected value");
assert(largeMismatch?.diff.actual === 2235, "Error payload should include actual value");
assert(largeMismatch?.diff.withinTolerance === false, "Error payload should include withinTolerance=false");

console.log("nutritionMathValidation tests passed");
