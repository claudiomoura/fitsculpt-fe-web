import { slugifyExerciseName } from "@/lib/slugify";

type MealKeySource = {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  description?: unknown;
};

export function getNutritionMealKey(meal: MealKeySource, dayKey: string, index: number) {
  if (typeof meal.id === "string" && meal.id.trim().length > 0) {
    return meal.id;
  }

  const title = typeof meal.title === "string" ? meal.title.trim() : "";
  const type = typeof meal.type === "string" ? meal.type.toLowerCase() : "meal";
  const safeTitle = title ? slugifyExerciseName(title) : "";
  const parts = [dayKey, type, safeTitle].filter((value) => typeof value === "string" && value.length > 0);
  return parts.length > 0 ? parts.join(":") : `meal:${dayKey}:${index}`;
}
