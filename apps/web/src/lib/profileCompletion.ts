import type { ProfileData } from "@/lib/profile";

export function isProfileComplete(profile?: ProfileData | null): boolean {
  if (!profile) return false;
  const hasBasics =
    Boolean(profile.sex) &&
    Number.isFinite(profile.age) &&
    (profile.age ?? 0) > 0 &&
    Number.isFinite(profile.heightCm) &&
    (profile.heightCm ?? 0) > 0 &&
    Number.isFinite(profile.weightKg) &&
    (profile.weightKg ?? 0) > 0 &&
    Boolean(profile.activity) &&
    Boolean(profile.goal);

  const training = profile.trainingPreferences;
  const nutrition = profile.nutritionPreferences;
  const hasTrainingPrefs =
    Boolean(training?.level) &&
    Number.isFinite(training?.daysPerWeek) &&
    (training?.daysPerWeek ?? 0) > 0 &&
    Boolean(training?.sessionTime) &&
    Boolean(training?.focus) &&
    Boolean(training?.equipment);
  const hasNutritionPrefs =
    Number.isFinite(nutrition?.mealsPerDay) &&
    (nutrition?.mealsPerDay ?? 0) > 0 &&
    Boolean(nutrition?.dietType) &&
    Boolean(nutrition?.cookingTime) &&
    Boolean(nutrition?.mealDistribution?.preset);

  return Boolean(hasBasics && hasTrainingPrefs && hasNutritionPrefs);
}
