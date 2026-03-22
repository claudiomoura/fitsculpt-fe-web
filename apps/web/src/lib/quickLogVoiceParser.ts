import { QUICK_LOG_FOOD_CATALOG, type QuickLogFoodItem } from "@/lib/quickLogFoodCatalog";

export type QuickVoiceMealDraft = {
  sourceText: string;
  title: string;
  mealType: "meal" | "breakfast" | "lunch" | "dinner" | "snack";
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  matchedFoods: QuickLogFoodItem[];
};

function round(n: number): number {
  return Math.max(0, Math.round(n));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectMealType(text: string): QuickVoiceMealDraft["mealType"] {
  if (/(desayuno|breakfast)/i.test(text)) return "breakfast";
  if (/(almuerzo|comida|lunch)/i.test(text)) return "lunch";
  if (/(cena|dinner)/i.test(text)) return "dinner";
  if (/(snack|colacion|merienda)/i.test(text)) return "snack";
  return "meal";
}

function extractGrams(text: string): number {
  const match = text.match(/(\d{2,4})\s*(g|gr|gramos|grams|ml)/i);
  if (!match) return 180;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? Math.max(20, Math.min(1000, parsed)) : 180;
}

function detectFoods(text: string): QuickLogFoodItem[] {
  const normalizedText = normalize(text);
  return QUICK_LOG_FOOD_CATALOG.filter((item) => {
    const terms = [item.name, ...item.aliases].map((value) => normalize(value));
    return terms.some((term) => term.length > 1 && normalizedText.includes(term));
  }).slice(0, 4);
}

export function parseQuickVoiceMeal(text: string): QuickVoiceMealDraft {
  const trimmed = text.trim();
  const grams = extractGrams(trimmed);
  const matchedFoods = detectFoods(trimmed);
  const mealType = detectMealType(trimmed);

  if (matchedFoods.length === 0) {
    return {
      sourceText: trimmed,
      title: trimmed.length > 0 ? trimmed : "Comida rápida",
      mealType,
      grams,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      matchedFoods: [],
    };
  }

  const gramsPerFood = grams / matchedFoods.length;
  const totals = matchedFoods.reduce(
    (acc, food) => {
      acc.calories += (food.per100.calories * gramsPerFood) / 100;
      acc.protein += (food.per100.protein * gramsPerFood) / 100;
      acc.carbs += (food.per100.carbs * gramsPerFood) / 100;
      acc.fats += (food.per100.fats * gramsPerFood) / 100;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  return {
    sourceText: trimmed,
    title: matchedFoods.map((food) => food.name).join(" + "),
    mealType,
    grams,
    calories: round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fats: round(totals.fats),
    matchedFoods,
  };
}
