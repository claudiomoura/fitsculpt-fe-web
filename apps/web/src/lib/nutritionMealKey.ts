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
  const description = typeof meal.description === "string" ? meal.description.trim() : "";
  const type = typeof meal.type === "string" ? meal.type : "meal";
  const safeTitle = title ? slugifyExerciseName(title) : "";
  const safeDescription = description ? slugifyExerciseName(description) : "";
  const parts = [dayKey, type, safeTitle, safeDescription].filter((value) => typeof value === "string" && value.length > 0);
  return parts.length > 0 ? parts.join(":") : `meal:${dayKey}:${index}`;
}
