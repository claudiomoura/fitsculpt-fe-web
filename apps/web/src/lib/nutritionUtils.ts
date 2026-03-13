import type { Activity, MealDistribution, NutritionDietType, NutritionMeal, ProfileData } from "@/lib/profile";

export type NutritionForm = {
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: string;
  mealsPerDay: number;
  dietType: NutritionDietType;
  allergies: string[];
  preferredFoods: string;
  dislikedFoods: string;
  dietaryPrefs: string;
  cookingTime: string;
  mealDistribution: MealDistribution;
};

export type Meal = {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  description?: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  ingredients?: { name: string; grams: number }[];
};

export type DayPlan = {
  dayLabel: string;
  meals: Meal[];
};

export type MealMediaCandidate = {
  imageUrl?: unknown;
  thumbnailUrl?: unknown;
  mediaUrl?: unknown;
  instructions?: unknown;
  media?: {
    url?: unknown;
    thumbnailUrl?: unknown;
  };
};

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export function round(n: number) {
  return Math.round(n);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function activityMultiplier(activity: Activity): number {
  const multipliers: Partial<Record<Activity, number>> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9,
  };
  return multipliers[activity] || 1.55;
}

export function gramsForMacro(target: number, macroPer100: number): number {
  return Math.round((target / macroPer100) * 100);
}

export function toMacroSegment(grams: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((grams / total) * 100);
}

export function computeAiMacroTargets(profile: ProfileData, targetKcal: number) {
  const weightKg = clamp(Number(profile.weightKg) || 0, 35, 250);
  const proteinGPerKg = Number(profile.macroPreferences?.proteinGPerKg);
  const fatGPerKg = Number(profile.macroPreferences?.fatGPerKg);

  const proteinG = Math.max(0, (Number.isFinite(proteinGPerKg) && proteinGPerKg > 0 ? proteinGPerKg : 1.8) * weightKg);
  const fatsG = Math.max(0, (Number.isFinite(fatGPerKg) && fatGPerKg > 0 ? fatGPerKg : 0.8) * weightKg);
  const carbsG = Math.max(0, (targetKcal - proteinG * 4 - fatsG * 9) / 4);

  return {
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatsG: round(fatsG),
  };
}

export const INGREDIENT_PROFILES: Record<string, { category: string; defaultGrams: number }> = {
  chicken: { category: "protein", defaultGrams: 150 },
  beef: { category: "protein", defaultGrams: 150 },
  fish: { category: "protein", defaultGrams: 150 },
  salmon: { category: "protein", defaultGrams: 150 },
  rice: { category: "carbs", defaultGrams: 150 },
  pasta: { category: "carbs", defaultGrams: 150 },
  bread: { category: "carbs", defaultGrams: 50 },
  potato: { category: "carbs", defaultGrams: 150 },
  oats: { category: "carbs", defaultGrams: 80 },
  quinoa: { category: "carbs", defaultGrams: 150 },
  broccoli: { category: "vegetable", defaultGrams: 150 },
  spinach: { category: "vegetable", defaultGrams: 50 },
  salad: { category: "vegetable", defaultGrams: 100 },
  avocado: { category: "fat", defaultGrams: 50 },
  olive: { category: "fat", defaultGrams: 15 },
  nuts: { category: "fat", defaultGrams: 30 },
  cheese: { category: "fat", defaultGrams: 30 },
  egg: { category: "protein", defaultGrams: 100 },
  yogurt: { category: "dairy", defaultGrams: 150 },
  milk: { category: "dairy", defaultGrams: 250 },
  banana: { category: "fruit", defaultGrams: 120 },
  apple: { category: "fruit", defaultGrams: 150 },
  orange: { category: "fruit", defaultGrams: 150 },
};

export const MEAL_TEMPLATES: Record<string, { name: string; type: string; calories: number; protein: number; carbs: number; fats: number }[]> = {
  breakfast: [
    { name: "Oatmeal con frutas", type: "breakfast", calories: 350, protein: 12, carbs: 55, fats: 8 },
    { name: "Huevos revueltos", type: "breakfast", calories: 280, protein: 18, carbs: 4, fats: 20 },
    { name: "Tostadas integrales", type: "breakfast", calories: 300, protein: 10, carbs: 40, fats: 10 },
    { name: "Yogur con granola", type: "breakfast", calories: 320, protein: 14, carbs: 45, fats: 8 },
  ],
  lunch: [
    { name: "Pollo con arroz", type: "lunch", calories: 550, protein: 45, carbs: 60, fats: 12 },
    { name: "Ensalada con proteína", type: "lunch", calories: 400, protein: 35, carbs: 20, fats: 18 },
    { name: "Pasta con carne", type: "lunch", calories: 600, protein: 40, carbs: 70, fats: 15 },
    { name: "Sándwich saludable", type: "lunch", calories: 450, protein: 25, carbs: 45, fats: 16 },
  ],
  dinner: [
    { name: "Pescado con verduras", type: "dinner", calories: 380, protein: 35, carbs: 15, fats: 18 },
    { name: "Carne con ensalada", type: "dinner", calories: 480, protein: 42, carbs: 12, fats: 28 },
    { name: "Wraps de pollo", type: "dinner", calories: 420, protein: 30, carbs: 35, fats: 16 },
    { name: "Sopa con pan", type: "dinner", calories: 350, protein: 15, carbs: 45, fats: 10 },
  ],
  snack: [
    { name: "Fruta", type: "snack", calories: 80, protein: 1, carbs: 20, fats: 0 },
    { name: "Nueces", type: "snack", calories: 180, protein: 5, carbs: 6, fats: 16 },
    { name: "Yogur", type: "snack", calories: 120, protein: 8, carbs: 15, fats: 2 },
    { name: "Barra proteica", type: "snack", calories: 200, protein: 20, carbs: 22, fats: 6 },
  ],
};

export function getMealTypeLabel(meal: NutritionMeal, t: (key: string) => string): string {
  return t(`nutrition.mealTypes.${meal.type}`) || meal.type;
}

export function getMealTitle(meal: NutritionMeal, t: (key: string) => string): string {
  const anyMeal = meal as Record<string, unknown>;
  return (anyMeal.name as string) || (anyMeal.title as string) || getMealTypeLabel(meal, t);
}

export function getMealDescription(meal: NutritionMeal): string {
  return meal.description || "";
}

export function getMealMediaUrl(meal: NutritionMeal): string | null {
  const candidate: MealMediaCandidate = meal as unknown as MealMediaCandidate;
  return (candidate.imageUrl as string) || (candidate.thumbnailUrl as string) || (candidate.mediaUrl as string) || (candidate.media?.url as string) || null;
}

export function getMealInstructions(meal: NutritionMeal): string[] {
  const candidate: MealMediaCandidate = meal as unknown as MealMediaCandidate;
  if (candidate.instructions && Array.isArray(candidate.instructions)) {
    return candidate.instructions.filter((i): i is string => typeof i === "string");
  }
  return [];
}

export function getMealKey(meal: NutritionMeal, dayKey: string, index: number): string {
  return `${dayKey}-${meal.type}-${index}`;
}

export function matchesRestrictedKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}
