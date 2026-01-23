import type { ProfileData } from "@/lib/profile";

export function isProfileComplete(profile?: ProfileData | null): boolean {
  if (!profile) return false;
  const hasBasics =
    Boolean(profile.sex) &&
    Number.isFinite(profile.age) &&
    Number.isFinite(profile.heightCm) &&
    Number.isFinite(profile.weightKg) &&
    Boolean(profile.activity) &&
    Boolean(profile.goal);

  const training = profile.trainingPreferences;
  const nutrition = profile.nutritionPreferences;
  const hasTrainingPrefs =
    Boolean(training?.level) &&
    Number.isFinite(training?.daysPerWeek) &&
    Boolean(training?.sessionTime) &&
    Boolean(training?.focus) &&
    Boolean(training?.equipment);
  const hasNutritionPrefs =
    Number.isFinite(nutrition?.mealsPerDay) &&
    Boolean(nutrition?.dietType) &&
    Boolean(nutrition?.cookingTime) &&
    Boolean(nutrition?.mealDistribution?.preset);

  return Boolean(hasBasics && hasTrainingPrefs && hasNutritionPrefs);
}
