import type { ProfileData } from "@/lib/profile";

export interface ProfileCompletionDebugInfo {
  hasBasics: boolean;
  hasTrainingPrefs: boolean;
  hasNutritionPrefs: boolean;
  hasRequiredBackendFields: boolean;
  missingFields: string[];
  profileKeys: string[];
}

export function isProfileComplete(profile?: ProfileData | null): boolean {
  const debug = getProfileCompletionDebugInfo(profile);
  return debug.missingFields.length === 0;
}

export function getProfileCompletionDebugInfo(profile?: ProfileData | null): ProfileCompletionDebugInfo {
  const missingFields: string[] = [];

  if (!profile) {
    return {
      hasBasics: false,
      hasTrainingPrefs: false,
      hasNutritionPrefs: false,
      hasRequiredBackendFields: false,
      missingFields: ["profile is null or undefined"],
      profileKeys: [],
    };
  }

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

  if (!hasBasics) {
    missingFields.push(
      ...getMissingFields([
        { name: "sex", value: profile.sex, required: Boolean },
        { name: "age", value: profile.age, required: (v: unknown) => Number.isFinite(v as number) && (v as number) > 0 },
        { name: "heightCm", value: profile.heightCm, required: (v: unknown) => Number.isFinite(v as number) && (v as number) > 0 },
        { name: "weightKg", value: profile.weightKg, required: (v: unknown) => Number.isFinite(v as number) && (v as number) > 0 },
        { name: "activity", value: profile.activity, required: Boolean },
        { name: "goal", value: profile.goal, required: Boolean },
      ])
    );
  }

  const training = profile.trainingPreferences;
  const hasTrainingPrefs =
    Boolean(training?.level) &&
    Number.isFinite(training?.daysPerWeek) &&
    (training?.daysPerWeek ?? 0) > 0 &&
    Boolean(training?.sessionTime) &&
    Boolean(training?.focus) &&
    Boolean(training?.equipment);

  if (!hasTrainingPrefs) {
    missingFields.push(
      ...getMissingFields([
        { name: "trainingPreferences.level", value: training?.level, required: Boolean },
        { name: "trainingPreferences.daysPerWeek", value: training?.daysPerWeek, required: (v: unknown) => Number.isFinite(v as number) && (v as number) > 0 },
        { name: "trainingPreferences.sessionTime", value: training?.sessionTime, required: Boolean },
        { name: "trainingPreferences.focus", value: training?.focus, required: Boolean },
        { name: "trainingPreferences.equipment", value: training?.equipment, required: Boolean },
      ])
    );
  }

  const nutrition = profile.nutritionPreferences;
  const hasNutritionPrefs =
    Number.isFinite(nutrition?.mealsPerDay) &&
    (nutrition?.mealsPerDay ?? 0) > 0 &&
    Boolean(nutrition?.dietType) &&
    Boolean(nutrition?.cookingTime) &&
    Boolean(nutrition?.mealDistribution?.preset);

  if (!hasNutritionPrefs) {
    missingFields.push(
      ...getMissingFields([
        { name: "nutritionPreferences.mealsPerDay", value: nutrition?.mealsPerDay, required: (v: unknown) => Number.isFinite(v as number) && (v as number) > 0 },
        { name: "nutritionPreferences.dietType", value: nutrition?.dietType, required: Boolean },
        { name: "nutritionPreferences.cookingTime", value: nutrition?.cookingTime, required: Boolean },
        { name: "nutritionPreferences.mealDistribution.preset", value: nutrition?.mealDistribution?.preset, required: Boolean },
      ])
    );
  }

  const macros = profile.macroPreferences;
  const hasMacroPrefs = Boolean(macros?.formula);

  if (!hasMacroPrefs) {
    missingFields.push(
      ...getMissingFields([
        { name: "macroPreferences.formula", value: macros?.formula, required: Boolean },
      ])
    );
  }

  const hasRequiredBackendFields =
    Boolean(profile.goalWeightKg) ||
    Number.isFinite(profile.goalWeightKg);

  if (!hasRequiredBackendFields && profile.goalWeightKg === null) {
    missingFields.push("goalWeightKg (required by backend)");
  }

  return {
    hasBasics,
    hasTrainingPrefs,
    hasNutritionPrefs,
    hasRequiredBackendFields: hasMacroPrefs,
    missingFields,
    profileKeys: Object.keys(profile),
  };
}

function getMissingFields(
  fields: Array<{ name: string; value: unknown; required: (v: unknown) => boolean }>
): string[] {
  return fields.filter((f) => !f.required(f.value)).map((f) => f.name);
}
