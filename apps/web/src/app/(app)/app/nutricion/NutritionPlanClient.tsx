"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import type { Locale } from "@/lib/i18n";
import { addDays, buildMonthGrid, isSameDay, parseDate, startOfWeek, toDateKey } from "@/lib/calendar";
import { addWeeks, clampWeekOffset, getWeekOffsetFromCurrent, getWeekStart, projectDaysForWeek } from "@/lib/planProjection";
import { slugifyExerciseName } from "@/lib/slugify";
import {
  type Activity,
  type Goal,
  type MealDistribution,
  type NutritionDietType,
  type NutritionCookingTime,
  type ProfileData,
  type NutritionPlanData,
  type NutritionMeal,
} from "@/lib/profile";
import { getUserProfile, updateUserProfile } from "@/lib/profileService";
import { isProfileComplete } from "@/lib/profileCompletion";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { hasAiEntitlement, type AiEntitlementProfile } from "@/components/access/aiEntitlements";
import { Modal } from "@/components/ui/Modal";
import { MealCard, MealCardSkeleton } from "@/components/nutrition/MealCard";
import { useNutritionAdherence } from "@/lib/nutritionAdherence";
import { type NutritionQuickFavorite, useNutritionQuickFavorites } from "@/lib/nutritionQuickFavorites";
import { useToast } from "@/components/ui/Toast";

type NutritionForm = {
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  mealsPerDay: 1 | 2 | 3 | 4 | 5 | 6;
  dietType: NutritionDietType;
  allergies: string[];
  preferredFoods: string;
  dislikedFoods: string;
  dietaryPrefs: string;
  cookingTime: NutritionCookingTime;
  mealDistribution: MealDistribution;
};

type Meal = {
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

type DayPlan = {
  dayLabel: string;
  meals: Meal[];
};

type NutritionPlan = NutritionPlanData;

type NutritionPlanClientProps = {
  mode?: "suggested" | "manual";
};

type MealMediaCandidate = {
  imageUrl?: unknown;
  thumbnailUrl?: unknown;
  mediaUrl?: unknown;
  instructions?: unknown;
  media?: {
    url?: unknown;
    thumbnailUrl?: unknown;
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

type ShoppingItem = {
  name: string;
  grams: number;
};

type IngredientProfile = {
  nameKey: string;
  protein: number;
  carbs: number;
  fat: number;
};

type MealTemplate = {
  titleKey: string;
  descriptionKey: string;
  protein: IngredientProfile;
  carbs?: IngredientProfile;
  fat?: IngredientProfile;
  veg?: IngredientProfile;
};

const INGREDIENT_PROFILES: Record<string, IngredientProfile> = {
  salmon: { nameKey: "nutrition.ingredient.salmon", protein: 20, carbs: 0, fat: 13 },
  chicken: { nameKey: "nutrition.ingredient.chicken", protein: 31, carbs: 0, fat: 3.6 },
  turkey: { nameKey: "nutrition.ingredient.turkey", protein: 29, carbs: 0, fat: 2 },
  eggs: { nameKey: "nutrition.ingredient.eggs", protein: 13, carbs: 1.1, fat: 10 },
  yogurt: { nameKey: "nutrition.ingredient.yogurt", protein: 10, carbs: 4, fat: 4 },
  oats: { nameKey: "nutrition.ingredient.oats", protein: 17, carbs: 66, fat: 7 },
  rice: { nameKey: "nutrition.ingredient.rice", protein: 2.7, carbs: 28, fat: 0.3 },
  quinoa: { nameKey: "nutrition.ingredient.quinoa", protein: 4.4, carbs: 21, fat: 1.9 },
  chickpeas: { nameKey: "nutrition.ingredient.chickpeas", protein: 9, carbs: 27, fat: 2.6 },
  potatoes: { nameKey: "nutrition.ingredient.potatoes", protein: 2, carbs: 17, fat: 0.1 },
  zucchini: { nameKey: "nutrition.ingredient.zucchini", protein: 1.2, carbs: 3.1, fat: 0.3 },
  avocado: { nameKey: "nutrition.ingredient.avocado", protein: 2, carbs: 9, fat: 15 },
  oliveOil: { nameKey: "nutrition.ingredient.oliveOil", protein: 0, carbs: 0, fat: 100 },
  berries: { nameKey: "nutrition.ingredient.berries", protein: 1, carbs: 12, fat: 0.3 },
  milk: { nameKey: "nutrition.ingredient.milk", protein: 3.3, carbs: 5, fat: 3.2 },
  bread: { nameKey: "nutrition.ingredient.bread", protein: 13, carbs: 43, fat: 4 },
};

const MEAL_TEMPLATES: Record<string, MealTemplate[]> = {
    breakfast: [
      {
        titleKey: "nutrition.template.breakfast.oatsWithFruit.title",
        descriptionKey: "nutrition.template.breakfast.oatsWithFruit.description",
        protein: INGREDIENT_PROFILES.yogurt,
        carbs: INGREDIENT_PROFILES.oats,
        fat: INGREDIENT_PROFILES.oliveOil,
        veg: INGREDIENT_PROFILES.berries,
      },
      {
        titleKey: "nutrition.template.breakfast.eggToast.title",
        descriptionKey: "nutrition.template.breakfast.eggToast.description",
        protein: INGREDIENT_PROFILES.eggs,
        carbs: INGREDIENT_PROFILES.bread,
        fat: INGREDIENT_PROFILES.avocado,
      },
    ],
    lunch: [
      {
        titleKey: "nutrition.template.lunch.chickenWithRice.title",
        descriptionKey: "nutrition.template.lunch.chickenWithRice.description",
        protein: INGREDIENT_PROFILES.chicken,
        carbs: INGREDIENT_PROFILES.rice,
        veg: INGREDIENT_PROFILES.zucchini,
      },
      {
        titleKey: "nutrition.template.lunch.mediterraneanBowl.title",
        descriptionKey: "nutrition.template.lunch.mediterraneanBowl.description",
        protein: INGREDIENT_PROFILES.chickpeas,
        carbs: INGREDIENT_PROFILES.quinoa,
        fat: INGREDIENT_PROFILES.oliveOil,
        veg: INGREDIENT_PROFILES.zucchini,
      },
    ],
    dinner: [
      {
        titleKey: "nutrition.template.dinner.salmonWithVeggies.title",
        descriptionKey: "nutrition.template.dinner.salmonWithVeggies.description",
        protein: INGREDIENT_PROFILES.salmon,
        carbs: INGREDIENT_PROFILES.potatoes,
        veg: INGREDIENT_PROFILES.zucchini,
      },
      {
        titleKey: "nutrition.template.dinner.quickStirFry.title",
        descriptionKey: "nutrition.template.dinner.quickStirFry.description",
        protein: INGREDIENT_PROFILES.turkey,
        carbs: INGREDIENT_PROFILES.rice,
        veg: INGREDIENT_PROFILES.zucchini,
      },
    ],
    snack: [
      {
        titleKey: "nutrition.template.snack.proteinSnack.title",
        descriptionKey: "nutrition.template.snack.proteinSnack.description",
        protein: INGREDIENT_PROFILES.yogurt,
        fat: INGREDIENT_PROFILES.avocado,
        carbs: INGREDIENT_PROFILES.berries,
      },
      {
        titleKey: "nutrition.template.snack.shake.title",
        descriptionKey: "nutrition.template.snack.shake.description",
        protein: INGREDIENT_PROFILES.milk,
        carbs: INGREDIENT_PROFILES.berries,
        fat: INGREDIENT_PROFILES.oliveOil,
      },
    ],
};

const getMealTypeLabel = (meal: NutritionMeal, t: (key: string) => string) => {
  switch (meal.type) {
    case "breakfast":
      return t("nutrition.mealTypeBreakfast");
    case "lunch":
      return t("nutrition.mealTypeLunch");
    case "dinner":
      return t("nutrition.mealTypeDinner");
    case "snack":
      return t("nutrition.mealTypeSnack");
    default:
      return t("nutrition.mealTypeFallback");
  }
};

const getMealTitle = (meal: NutritionMeal, t: (key: string) => string) => {
  const title = meal.title?.trim();
  return title && title.length > 0 ? title : t("nutrition.mealTitleFallback");
};

const getMealDescription = (meal: NutritionMeal) => {
  const description = meal.description?.trim();
  return description && description.length > 0 ? description : null;
};

const getMealMediaUrl = (meal: NutritionMeal) => {
  const candidate = meal as MealMediaCandidate;
  const urls = [
    candidate.imageUrl,
    candidate.thumbnailUrl,
    candidate.mediaUrl,
    candidate.media?.thumbnailUrl,
    candidate.media?.url,
  ];
  const match = urls.find((url) => typeof url === "string" && url.trim().length > 0);
  return typeof match === "string" ? match : null;
};

const getMealInstructions = (meal: NutritionMeal) => {
  const candidate = meal as MealMediaCandidate;
  if (typeof candidate.instructions !== "string") return null;
  const instructions = candidate.instructions.trim();
  return instructions.length > 0 ? instructions : null;
};

const getMealKey = (meal: NutritionMeal, dayKey: string, index: number) => {
  const maybeMeal = meal as unknown as { id?: unknown };
  if (typeof maybeMeal.id === "string" && maybeMeal.id.trim().length > 0) {
    return maybeMeal.id;
  }
  const title = meal.title?.trim();
  const description = meal.description?.trim();
  const safeTitle = title ? slugifyExerciseName(title) : "";
  const safeDescription = description ? slugifyExerciseName(description) : "";
  const parts = [dayKey, meal.type, safeTitle, safeDescription].filter((value) => typeof value === "string" && value.length > 0);
  return parts.length > 0 ? parts.join(":") : `meal:${dayKey}:${index}`;
};

const DAY_LABEL_KEYS = [
  "training.dayNames.monday",
  "training.dayNames.tuesday",
  "training.dayNames.wednesday",
  "training.dayNames.thursday",
  "training.dayNames.friday",
  "training.dayNames.saturday",
  "training.dayNames.sunday",
] as const;

export const DAY_LABELS: Record<Locale, string[]> = {
  es: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

const ALLERGY_KEYWORDS: Record<string, string[]> = {
  gluten: ["pan", "bread", "avena", "oats"],
  lactose: ["leche", "milk", "yogur", "yogurt"],
  nuts: ["nueces", "nuts", "almendras", "peanuts"],
  shellfish: ["mariscos", "shrimp", "shellfish"],
  egg: ["huevo", "eggs"],
  soy: ["soja", "soy", "tofu"],
};

const DIET_EXCLUSIONS: Record<NutritionDietType, string[]> = {
  balanced: [],
  mediterranean: [],
  keto: ["pan", "bread", "arroz", "rice", "avena", "oats", "quinoa", "patata", "potato"],
  vegetarian: ["pollo", "chicken", "pavo", "turkey", "salmón", "salmon"],
  vegan: ["pollo", "chicken", "pavo", "turkey", "salmón", "salmon", "huevo", "eggs", "leche", "milk", "yogur", "yogurt"],
  pescatarian: ["pollo", "chicken", "pavo", "turkey"],
  paleo: ["pan", "bread", "avena", "oats", "arroz", "rice", "quinoa", "lentejas", "legumbre", "legume"],
  flexible: [],
};

function round(n: number) {
  return Math.round(n);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function computeAiMacroTargets(profile: ProfileData, targetKcal: number) {
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

function extractAiFieldErrorsMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const details = (payload as { details?: unknown }).details;
  if (!details || typeof details !== "object") return null;
  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return null;

  const entries = Object.entries(fieldErrors)
    .map(([field, message]) => {
      if (Array.isArray(message) && typeof message[0] === "string") {
        return `${field}: ${message[0]}`;
      }
      if (typeof message === "string") {
        return `${field}: ${message}`;
      }
      return null;
    })
    .filter((message): message is string => Boolean(message));

  return entries.length > 0 ? entries.join(" · ") : null;
}


function activityMultiplier(activity: Activity) {
  switch (activity) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "very":
      return 1.725;
    default:
      return 1.9;
  }
}

function gramsForMacro(target: number, macroPer100: number) {
  if (macroPer100 <= 0) return 0;
  return Math.max(0, Math.round((target / macroPer100) * 100));
}

function matchesRestrictedKeywords(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function filterMealTemplates(
  templates: MealTemplate[],
  form: NutritionForm,
  t: (key: string) => string
) {
  const restrictions = [
    ...form.allergies.flatMap((allergy) => ALLERGY_KEYWORDS[allergy] ?? []),
    ...form.allergies.map((allergy) => allergy.toLowerCase()),
    ...DIET_EXCLUSIONS[form.dietType],
    ...form.dislikedFoods
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ];
  if (restrictions.length === 0) return templates;
  const filtered = templates.filter((template) => {
    const haystack = [
      t(template.titleKey),
      t(template.descriptionKey),
      t(template.protein.nameKey),
      template.carbs ? t(template.carbs.nameKey) : null,
      template.fat ? t(template.fat.nameKey) : null,
      template.veg ? t(template.veg.nameKey) : null,
    ]
      .filter(Boolean)
      .join(" ");
    return !matchesRestrictedKeywords(haystack, restrictions);
  });
  const available = filtered.length > 0 ? filtered : templates;
  const preferred = form.preferredFoods
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (preferred.length === 0) return available;
  return [...available].sort((a, b) => {
    const aText = `${t(a.titleKey)} ${t(a.descriptionKey)}`.toLowerCase();
    const bText = `${t(b.titleKey)} ${t(b.descriptionKey)}`.toLowerCase();
    const aScore = preferred.reduce((acc, keyword) => acc + (aText.includes(keyword.toLowerCase()) ? 1 : 0), 0);
    const bScore = preferred.reduce((acc, keyword) => acc + (bText.includes(keyword.toLowerCase()) ? 1 : 0), 0);
    return bScore - aScore;
  });
}

function buildMealDistributionWeights(mealSlots: string[], mealDistribution: MealDistribution) {
  const baseWeights: Record<string, Record<string, number>> = {
    balanced: { breakfast: 1, lunch: 1, dinner: 1, snack: 1 },
    lightDinner: { breakfast: 1.1, lunch: 1.2, dinner: 0.7, snack: 0.6 },
    bigBreakfast: { breakfast: 1.4, lunch: 1, dinner: 0.8, snack: 0.6 },
    bigLunch: { breakfast: 1, lunch: 1.4, dinner: 0.8, snack: 0.6 },
  };
  if (mealDistribution.preset === "custom" && mealDistribution.percentages?.length) {
    const percentages = mealDistribution.percentages;
    const weights = mealSlots.map((slot, index) => {
      if (slot === "breakfast") return percentages[0] ?? 0;
      if (slot === "lunch") return percentages[1] ?? 0;
      if (slot === "dinner") return percentages[2] ?? 0;
      return percentages[3] ?? 0;
    });
    const total = weights.reduce((acc, value) => acc + value, 0) || 1;
    return weights.map((value) => value / total);
  }
  const weights = mealSlots.map((slot) => baseWeights[mealDistribution.preset]?.[slot] ?? 1);
  const total = weights.reduce((acc, value) => acc + value, 0) || 1;
  return weights.map((value) => value / total);
}

function buildMealIngredients(
  template: MealTemplate,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  t: (key: string) => string
) {
  const ingredients: { name: string; grams: number }[] = [];
  const proteinGrams = gramsForMacro(targetProtein, template.protein.protein);
  const proteinFat = (proteinGrams * template.protein.fat) / 100;
  const proteinCarbs = (proteinGrams * template.protein.carbs) / 100;
  ingredients.push({ name: t(template.protein.nameKey), grams: proteinGrams });

  const remainingCarbs = Math.max(0, targetCarbs - proteinCarbs);
  if (template.carbs) {
    const carbsGrams = gramsForMacro(remainingCarbs, template.carbs.carbs);
    ingredients.push({ name: t(template.carbs.nameKey), grams: carbsGrams });
  }

  const remainingFat = Math.max(0, targetFat - proteinFat);
  if (template.fat) {
    const fatGrams = gramsForMacro(remainingFat, template.fat.fat);
    ingredients.push({ name: t(template.fat.nameKey), grams: fatGrams });
  }

  if (template.veg) {
    ingredients.push({ name: t(template.veg.nameKey), grams: 150 });
  }

  return ingredients;
}

function calculatePlan(
  form: NutritionForm,
  mealTemplates: Record<string, MealTemplate[]>,
  dayLabels: string[],
  t: (key: string) => string
): NutritionPlan {
  const weight = clamp(form.weightKg, 35, 250);
  const height = clamp(form.heightCm, 120, 230);
  const age = clamp(form.age, 10, 100);

  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = bmr * activityMultiplier(form.activity);

  let targetCalories = tdee;
  if (form.goal === "cut") targetCalories = tdee * 0.85;
  if (form.goal === "bulk") targetCalories = tdee * 1.1;

  const proteinG = Math.max(0, weight * 1.8);
  const fatG = Math.max(0, weight * 0.8);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsG = Math.max(0, (targetCalories - proteinKcal - fatKcal) / 4);

  const mealsOrder =
    form.mealsPerDay === 1
      ? ["lunch"]
      : form.mealsPerDay === 2
        ? ["breakfast", "dinner"]
        : form.mealsPerDay === 3
          ? ["breakfast", "lunch", "dinner"]
          : form.mealsPerDay === 4
            ? ["breakfast", "snack", "lunch", "dinner"]
            : form.mealsPerDay === 5
              ? ["breakfast", "snack", "lunch", "snack", "dinner"]
              : ["breakfast", "snack", "lunch", "snack", "dinner", "snack"];

  const distributionWeights = buildMealDistributionWeights(mealsOrder, form.mealDistribution);

  const days = dayLabels.map((label, dayIndex) => {
    const meals = mealsOrder.map((slot, slotIndex) => {
      const options = filterMealTemplates(mealTemplates[slot], form, t);
      const option = options[(dayIndex + slotIndex) % options.length];
      const weight = distributionWeights[slotIndex] ?? 1 / mealsOrder.length;
      const mealProtein = proteinG * weight;
      const mealCarbs = carbsG * weight;
      const mealFat = fatG * weight;
      return {
        type: slot as Meal["type"],
        title: `${slotIndex + 1}. ${t(option.titleKey)}`,
        description: t(option.descriptionKey),
        macros: {
          calories: round(mealProtein * 4 + mealCarbs * 4 + mealFat * 9),
          protein: round(mealProtein),
          carbs: round(mealCarbs),
          fats: round(mealFat),
        },
        ingredients: buildMealIngredients(option, mealProtein, mealCarbs, mealFat, t),
      };
    });

    return {
      dayLabel: label,
      meals,
    };
  });

  return {
    dailyCalories: round(targetCalories),
    proteinG: round(proteinG),
    fatG: round(fatG),
    carbsG: round(carbsG),
    days,
  };
}

export function normalizeNutritionPlan(plan: NutritionPlan | null, dayLabels: string[]): NutritionPlan | null {
  if (!plan) return null;
  const normalizedDays = plan.days.map((day) => ({
    ...day,
    meals: day.meals.map((meal) => ({
      ...meal,
      description: meal.description ?? "",
      ingredients: meal.ingredients ?? [],
    })),
  }));
  if (normalizedDays.length >= dayLabels.length) {
    return { ...plan, days: normalizedDays };
  }
  const nextDays = [...normalizedDays];
  let index = 0;
  while (nextDays.length < dayLabels.length) {
    const source = normalizedDays[index % normalizedDays.length];
    nextDays.push({
      ...source,
      dayLabel: dayLabels[nextDays.length] ?? source.dayLabel,
    });
    index += 1;
  }
  return { ...plan, days: nextDays };
}

export default function NutritionPlanClient({ mode = "suggested" }: NutritionPlanClientProps) {
  const { t, locale } = useLanguage();
  const { notify } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeT = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const mealTemplates = MEAL_TEMPLATES;
  const dayLabels = DAY_LABEL_KEYS.map((key) => t(key));
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiTokenBalance, setAiTokenBalance] = useState<number | null>(null);
  const [aiTokenRenewalAt, setAiTokenRenewalAt] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<AiEntitlementProfile["subscriptionPlan"]>(null);
  const [aiEntitled, setAiEntitled] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [savedPlan, setSavedPlan] = useState<NutritionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingTokenToastId, setPendingTokenToastId] = useState(0);
  const [manualPlan, setManualPlan] = useState<NutritionPlan | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month" | "agenda">("day");
  const [selectedDate, setSelectedDate] = useState(() => {
    const dayParam = searchParams.get("day");
    const weekOffsetParam = Number(searchParams.get("weekOffset") ?? "0");
    const dayDate = parseDate(dayParam);
    if (dayDate) return dayDate;
    if (Number.isFinite(weekOffsetParam)) {
      return addWeeks(getWeekStart(new Date()), weekOffsetParam);
    }
    return new Date();
  });
  const [selectedMeal, setSelectedMeal] = useState<{
    meal: NutritionMeal;
    dayLabel?: string | null;
    dayKey: string;
    mealKey: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const autoGenerated = useRef(false);
  const renderedTokenToastId = useRef(0);
  const calendarInitialized = useRef(false);
  const urlSyncInitialized = useRef(false);
  const isManualView = mode === "manual";
  const loadProfile = async (activeRef: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile();
      if (!activeRef.current) return;
      setProfile(data);
      setSavedPlan(data.nutritionPlan ?? null);
    } catch (_err) {
      if (activeRef.current) setError(t("nutrition.profileError"));
    } finally {
      if (activeRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const ref = { current: true };
    void loadProfile(ref);
    return () => {
      ref.current = false;
    };
  }, []);

  const refreshSubscription = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as AiEntitlementProfile & {
        aiTokenBalance?: number;
        aiTokenRenewalAt?: string | null;
      };
      setSubscriptionPlan(data.subscriptionPlan === "FREE" || data.subscriptionPlan === "PRO" ? data.subscriptionPlan : null);
      setAiTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      setAiEntitled(hasAiEntitlement(data));
      window.dispatchEvent(new Event("auth:refresh"));
    } catch (_err) {
    }
  };

  useEffect(() => {
    void refreshSubscription();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = () => {
      setIsMobile(media.matches);
    };
    handleChange();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const plan = useMemo(() => {
    if (!profile || !isProfileComplete(profile)) return null;
    return calculatePlan(
      {
        age: profile.age as number,
        heightCm: profile.heightCm as number,
        weightKg: profile.weightKg as number,
        activity: profile.activity as Activity,
        goal: profile.goal as Goal,
        mealsPerDay: profile.nutritionPreferences.mealsPerDay as NutritionForm["mealsPerDay"],
        dietType: profile.nutritionPreferences.dietType as NutritionDietType,
        allergies: profile.nutritionPreferences.allergies,
        preferredFoods: profile.nutritionPreferences.preferredFoods,
        dislikedFoods: profile.nutritionPreferences.dislikedFoods,
        dietaryPrefs: profile.nutritionPreferences.dietaryPrefs,
        cookingTime: profile.nutritionPreferences.cookingTime as NutritionCookingTime,
        mealDistribution: profile.nutritionPreferences.mealDistribution,
      },
      mealTemplates,
      dayLabels,
      t
    );
  }, [profile, mealTemplates, dayLabels, t]);
  const visiblePlan = useMemo(
    () => normalizeNutritionPlan(isManualView ? savedPlan ?? plan : savedPlan, dayLabels),
    [isManualView, savedPlan, plan, dayLabels]
  );
  const planStartDate = useMemo(
    () => parseDate(visiblePlan?.startDate ?? visiblePlan?.days?.[0]?.date),
    [visiblePlan?.startDate, visiblePlan?.days]
  );
  const planDays = visiblePlan?.days ?? [];
  const planEntries = useMemo(
    () =>
      planDays
        .map((day, index) => {
          const date = day.date ? parseDate(day.date) : planStartDate ? addDays(planStartDate, index) : null;
          return date ? { day, index, date } : null;
        })
        .filter((entry): entry is { day: DayPlan; index: number; date: Date } => Boolean(entry)),
    [planDays, planStartDate]
  );
  const calendarMealSkeletons = useMemo(
    () => Array.from({ length: 4 }, (_, index) => <MealCardSkeleton key={`meal-skeleton-${index}`} />),
    []
  );
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const maxProjectedWeeksAhead = 3;
  const weekOffset = useMemo(() => getWeekOffsetFromCurrent(weekStart), [weekStart]);
  const clampedWeekOffset = useMemo(
    () => clampWeekOffset(weekOffset, maxProjectedWeeksAhead),
    [weekOffset, maxProjectedWeeksAhead]
  );
  const modelWeekStart = useMemo(() => {
    if (planEntries.length > 0) {
      return getWeekStart(planEntries[0].date);
    }
    return getWeekStart(new Date());
  }, [planEntries]);
  const projectedWeek = useMemo(
    () => projectDaysForWeek({ entries: planEntries, selectedWeekStart: weekStart, modelWeekStart }),
    [planEntries, weekStart, modelWeekStart]
  );
  const visiblePlanEntries = useMemo(() => {
    const all = new Map<string, { day: DayPlan; index: number; date: Date; isReplicated: boolean }>();
    planEntries.forEach((entry) => {
      all.set(toDateKey(entry.date), { ...entry, isReplicated: false });
    });
    for (let offset = 1; offset <= maxProjectedWeeksAhead; offset += 1) {
      const nextWeek = projectDaysForWeek({
        entries: planEntries,
        selectedWeekStart: addWeeks(getWeekStart(new Date()), offset),
        modelWeekStart,
      });
      if (!nextWeek.isReplicated) continue;
      nextWeek.days.forEach((entry) => {
        const key = toDateKey(entry.date);
        if (!all.has(key)) {
          all.set(key, { ...entry, isReplicated: true });
        }
      });
    }
    return Array.from(all.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [maxProjectedWeeksAhead, planEntries, modelWeekStart]);
  const visibleDayMap = useMemo(() => {
    const next = new Map<string, { day: DayPlan; index: number; date: Date; isReplicated: boolean }>();
    visiblePlanEntries.forEach((entry) => {
      next.set(toDateKey(entry.date), entry);
    });
    return next;
  }, [visiblePlanEntries]);
  const selectedVisiblePlanDay = useMemo(() => visibleDayMap.get(toDateKey(selectedDate)) ?? null, [selectedDate, visibleDayMap]);
  const isSelectedDayReplicated = selectedVisiblePlanDay?.isReplicated ?? false;
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const weekEntries = useMemo(() => weekDates.map((date) => visibleDayMap.get(toDateKey(date)) ?? null), [visibleDayMap, weekDates]);
  const hasWeeklyMeals = useMemo(
    () => weekEntries.some((entry) => Boolean(entry && entry.day.meals.length > 0)),
    [weekEntries]
  );
  const monthDates = useMemo(() => buildMonthGrid(selectedDate), [selectedDate]);
  const localeCode = locale === "es" ? "es-ES" : "en-US";
  const monthLabel = selectedDate.toLocaleDateString(localeCode, { month: "long", year: "numeric" });
  const today = new Date();
  const calendarOptions = useMemo(() => {
    const baseOptions = [
      { value: "today", label: t("calendar.today") },
      { value: "week", label: t("calendar.viewWeek") },
      { value: "month", label: t("calendar.viewMonth") },
    ];
    const agendaOption = { value: "agenda", label: t("calendar.viewAgenda") };
    return isMobile ? [agendaOption, ...baseOptions] : [...baseOptions, agendaOption];
  }, [isMobile, t]);

  useEffect(() => {
    if (!manualPlan && visiblePlan) {
      setManualPlan(visiblePlan);
    }
  }, [manualPlan, visiblePlan]);

  useEffect(() => {
    if (!planStartDate || calendarInitialized.current) return;
    calendarInitialized.current = true;
    const dayParam = searchParams.get("day");
    setSelectedDate(parseDate(dayParam) ?? new Date());
  }, [planStartDate, searchParams]);

  const updateNutritionSearchParams = (nextDayKey: string, dishKey?: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("day", nextDayKey);
    const selectedWeek = getWeekStart(parseDate(nextDayKey) ?? selectedDate);
    const offset = getWeekOffsetFromCurrent(selectedWeek);
    if (offset !== 0) {
      params.set("weekOffset", String(offset));
    } else {
      params.delete("weekOffset");
    }
    if (dishKey && dishKey.length > 0) {
      params.set("dish", dishKey);
    } else {
      params.delete("dish");
    }
    const query = params.toString();
    router.replace(`/app/nutricion${query.length > 0 ? `?${query}` : ""}`, { scroll: false });
  };

  const openMealDetail = (
    meal: NutritionMeal,
    dayKey: string,
    mealKey: string,
    dayLabel?: string | null
  ) => {
    setSelectedMeal({ meal, dayKey, dayLabel, mealKey });
    updateNutritionSearchParams(dayKey, mealKey);
  };

  const closeMealDetail = () => {
    setSelectedMeal((prev) => {
      const currentDay = prev?.dayKey ?? toDateKey(selectedDate);
      updateNutritionSearchParams(currentDay);
      return null;
    });
  };

  function buildShoppingList(activePlan: NutritionPlan) {
    const totals: Record<string, number> = {};
    activePlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        (meal.ingredients ?? []).forEach((ingredient) => {
          totals[ingredient.name] = (totals[ingredient.name] || 0) + ingredient.grams;
        });
      });
    });
    const list = Object.entries(totals).map(([name, grams]) => ({
      name,
      grams: Math.round(grams),
    }));
    setShoppingList(list);
  }

  function aggregateShoppingList(activePlan: NutritionPlan) {
    const totals: Record<string, number> = {};
    activePlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        (meal.ingredients ?? []).forEach((ingredient) => {
          totals[ingredient.name] = (totals[ingredient.name] || 0) + ingredient.grams;
        });
      });
    });
    return Object.entries(totals).map(([name, grams]) => ({
      name,
      grams: Math.round(grams),
    }));
  }

  const ensurePlanStartDate = (planData: NutritionPlan, date = new Date()) => {
    const baseDate = parseDate(planData.startDate) ?? date;
    const days = planData.days.map((day, index) => ({
      ...day,
      date: day.date ?? toDateKey(addDays(baseDate, index)),
    }));
    return { ...planData, startDate: baseDate.toISOString(), days };
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const planToSave = ensurePlanStartDate({
        ...plan,
        shoppingList: shoppingList.length > 0 ? shoppingList : undefined,
      });
      const updated = await updateUserProfile({ nutritionPlan: planToSave });
      setSavedPlan(updated.nutritionPlan ?? planToSave);
      setSaveMessage(t("nutrition.savePlanSuccess"));
    } catch (_err) {
      setSaveMessage(t("nutrition.savePlanError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleSaveManualPlan = async () => {
    if (!manualPlan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const planToSave = ensurePlanStartDate(manualPlan);
      const updated = await updateUserProfile({ nutritionPlan: planToSave });
      setSavedPlan(updated.nutritionPlan ?? planToSave);
      setSaveMessage(t("nutrition.manualSaveSuccess"));
    } catch (_err) {
      setSaveMessage(t("nutrition.savePlanError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleSetStartDate = async () => {
    if (!visiblePlan) return;
    const nextPlan = ensurePlanStartDate({ ...visiblePlan, startDate: new Date().toISOString() });
    const updated = await updateUserProfile({ nutritionPlan: nextPlan });
    setSavedPlan(updated.nutritionPlan ?? nextPlan);
    setManualPlan(updated.nutritionPlan ?? nextPlan);
  };

  function updateManualDayLabel(dayIndex: number, value: string) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      days[dayIndex] = { ...days[dayIndex], dayLabel: value };
      return { ...prev, days };
    });
  }

  function updateManualMeal(dayIndex: number, mealIndex: number, field: keyof Meal, value: string) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const meals = [...days[dayIndex].meals];
      const meal = { ...meals[mealIndex], [field]: value };
      meals[mealIndex] = meal;
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  }

  function updateManualMealMacro(
    dayIndex: number,
    mealIndex: number,
    field: keyof Meal["macros"],
    value: number
  ) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const meals = [...days[dayIndex].meals];
      const meal = meals[mealIndex];
      meals[mealIndex] = { ...meal, macros: { ...meal.macros, [field]: value } };
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  }

  function addManualMeal(dayIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const meals = [
        ...days[dayIndex].meals,
        {
          type: "breakfast" as Meal["type"],
          title: t("nutrition.manualMealTitle"),
          description: "",
          macros: { calories: 0, protein: 0, carbs: 0, fats: 0 },
          ingredients: [],
        },
      ];
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  }

  function removeManualMeal(dayIndex: number, mealIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const meals = days[dayIndex].meals.filter((_, index) => index !== mealIndex);
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  }

  function addIngredient(dayIndex: number, mealIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const meals = [...days[dayIndex].meals];
      const meal = meals[mealIndex];
      const ingredients = [...(meal.ingredients ?? []), { name: "", grams: 0 }];
      meals[mealIndex] = { ...meal, ingredients };
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  }

  function updateIngredient(
    dayIndex: number,
    mealIndex: number,
    ingredientIndex: number,
    field: "name" | "grams",
    value: string | number
  ) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const meals = [...days[dayIndex].meals];
      const meal = meals[mealIndex];
      const ingredients = [...(meal.ingredients ?? [])];
      ingredients[ingredientIndex] = { ...ingredients[ingredientIndex], [field]: value };
      meals[mealIndex] = { ...meal, ingredients };
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  }

  function removeIngredient(dayIndex: number, mealIndex: number, ingredientIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const meals = [...days[dayIndex].meals];
      const meal = meals[mealIndex];
      const ingredients = (meal.ingredients ?? []).filter((_, index) => index !== ingredientIndex);
      meals[mealIndex] = { ...meal, ingredients };
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  }

  const selectedMealDetails = selectedMeal?.meal ?? null;
  const selectedMealTitle = selectedMealDetails ? getMealTitle(selectedMealDetails, t) : "";
  const selectedMealDescription = selectedMealDetails ? getMealDescription(selectedMealDetails) : null;
  const selectedMealInstructions = selectedMealDetails ? getMealInstructions(selectedMealDetails) : null;
  const selectedMealIngredients =
    selectedMealDetails?.ingredients?.filter((ingredient) => ingredient.name.trim().length > 0) ?? [];
  const activeQuickLogDayKey = selectedMeal?.dayKey ?? toDateKey(selectedDate);
  const { isConsumed, toggle, error: adherenceError } = useNutritionAdherence(activeQuickLogDayKey);
  const {
    favorites: quickFavorites,
    loading: quickFavoritesLoading,
    hasError: quickFavoritesError,
    toggleFavorite: toggleQuickFavorite,
  } = useNutritionQuickFavorites();
  const [quickLogMessage, setQuickLogMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedMealMacros = selectedMealDetails
    ? [
        Number.isFinite(selectedMealDetails.macros?.calories)
          ? `${selectedMealDetails.macros.calories} ${t("units.kcal")}`
          : null,
        Number.isFinite(selectedMealDetails.macros?.protein)
          ? `${t("nutrition.protein")}: ${selectedMealDetails.macros.protein}g`
          : null,
        Number.isFinite(selectedMealDetails.macros?.carbs)
          ? `${t("nutrition.carbs")}: ${selectedMealDetails.macros.carbs}g`
          : null,
        Number.isFinite(selectedMealDetails.macros?.fats)
          ? `${t("nutrition.fat")}: ${selectedMealDetails.macros.fats}g`
          : null,
      ].filter((value): value is string => Boolean(value))
    : [];

  const buildQuickFavorite = (meal: NutritionMeal): NutritionQuickFavorite => {
    const title = getMealTitle(meal, t);
    const description = getMealDescription(meal);
    return {
      id: `${meal.type}:${slugifyExerciseName(`${title}-${description ?? ""}`)}`,
      mealType: meal.type,
      title,
      description,
      calories: Number.isFinite(meal.macros?.calories) ? meal.macros?.calories : null,
      source: "device-local",
    };
  };

  const handleQuickLogMeal = (mealKey: string, dayKey?: string | null) => {
    if (!dayKey || adherenceError) {
      setQuickLogMessage({ type: "error", message: t("nutrition.quickLogError") });
      return;
    }
    const nextConsumed = !isConsumed(mealKey, dayKey);
    toggle(mealKey, dayKey);
    setQuickLogMessage({
      type: "success",
      message: nextConsumed ? t("nutrition.quickLogSuccess") : t("nutrition.quickLogUndo"),
    });
  };

  const handleFavoriteAction = (meal: NutritionMeal) => {
    const result = toggleQuickFavorite(buildQuickFavorite(meal));
    setQuickLogMessage({
      type: "success",
      message: result.exists ? t("nutrition.favoriteRemoved") : t("nutrition.favoriteAdded"),
    });
  };

  const selectedMealFavorite = selectedMealDetails ? buildQuickFavorite(selectedMealDetails) : null;
  const isSelectedMealFavorite = selectedMealFavorite
    ? quickFavorites.some((favorite) => favorite.id === selectedMealFavorite.id)
    : false;

  const handleUseFavorite = (favorite: NutritionQuickFavorite) => {
    const dayKey = toDateKey(selectedDate);
    const favoriteMeal: NutritionMeal = {
      type: favorite.mealType,
      title: favorite.title,
      description: favorite.description ?? undefined,
      macros: {
        calories: favorite.calories ?? 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      },
      ingredients: [],
    };
    const favoriteMealKey = `favorite:${favorite.id}`;
    setSelectedMeal({
      meal: favoriteMeal,
      dayKey,
      dayLabel: selectedDate.toLocaleDateString(localeCode, { weekday: "long", month: "short", day: "numeric" }),
      mealKey: favoriteMealKey,
    });
    handleQuickLogMeal(favoriteMealKey, dayKey);
  };

  useEffect(() => {
    if (urlSyncInitialized.current) return;
    if (!visiblePlan) return;

    const dayParam = searchParams.get("day");
    const dishParam = searchParams.get("dish");
    const parsedDay = parseDate(dayParam);
    if (parsedDay) {
      setSelectedDate(parsedDay);
    }

    if (!dayParam || !dishParam) {
      urlSyncInitialized.current = true;
      return;
    }

    const dayEntry = visiblePlan.days.find((day, index) => {
      const reference = day.date ?? (planStartDate ? toDateKey(addDays(planStartDate, index)) : null);
      return reference === dayParam;
    });

    if (!dayEntry) {
      urlSyncInitialized.current = true;
      return;
    }

    const mealEntry = dayEntry.meals.find((meal, index) => getMealKey(meal, dayParam, index) === dishParam);
    if (mealEntry) {
      setSelectedMeal({
        meal: mealEntry,
        dayKey: dayParam,
        dayLabel: dayEntry.dayLabel,
        mealKey: dishParam,
      });
    }

    urlSyncInitialized.current = true;
  }, [searchParams, visiblePlan, planStartDate]);

  useEffect(() => {
    if (!planStartDate) return;
    const dayKey = toDateKey(selectedDate);
    if (searchParams.get("day") === dayKey) return;
    updateNutritionSearchParams(dayKey, selectedMeal?.mealKey ?? null);
  }, [planStartDate, searchParams, selectedDate, selectedMeal?.mealKey]);

  const handleAiPlan = async () => {
    if (!profile || aiLoading) return;
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=nutrition&next=/app/nutricion");
      return;
    }
    setAiLoading(true);
    setError(null);
   try {
  const startDate = toDateKey(startOfWeek(new Date()));

  const mealsPerDay = Math.min(
    6,
    Math.max(2, Number(profile.nutritionPreferences.mealsPerDay ?? 3))
  );

  const baseCalories = plan?.dailyCalories ?? 2000;
  const targetKcal = clampInt(baseCalories, 600, 4000, 2000);

  // 🔥 Forzar macroTargets en GRAMOS (lo que normalmente espera el backend)
  const proteinRatio = 0.3;
  const carbsRatio = 0.4;
  const fatRatio = 0.3;

  const proteinGrams = Math.round((targetKcal * proteinRatio) / 4);
  const carbsGrams = Math.round((targetKcal * carbsRatio) / 4);
  const fatGrams = Math.round((targetKcal * fatRatio) / 9);

const macroTargets = {
  proteinG: proteinGrams,
  carbsG: carbsGrams,
  fatsG: fatGrams,
};

  const response = await fetch("/api/ai/nutrition-plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: profile.name || undefined,
      age: profile.age,
      sex: profile.sex,
      goal: profile.goal,
      mealsPerDay,
      targetKcal,          // 🔥 solo este, NO calories
      macroTargets,
      startDate,
      daysCount: 7,
      dietType: profile.nutritionPreferences.dietType,
      allergies: profile.nutritionPreferences.allergies,
      preferredFoods: profile.nutritionPreferences.preferredFoods,
      dislikedFoods: profile.nutritionPreferences.dislikedFoods,
      mealDistribution: profile.nutritionPreferences.mealDistribution,
    }),
  });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; retryAfterSec?: number; details?: { fieldErrors?: unknown } }
          | null;
        if (payload?.error === "INSUFFICIENT_TOKENS") {
          throw new Error(t("ai.insufficientTokens"));
        }
        if (response.status === 400) {
          const fieldErrorsMessage = extractAiFieldErrorsMessage(payload);
          if (fieldErrorsMessage) {
            throw new Error(fieldErrorsMessage);
          }
          if (payload?.message) {
            throw new Error(payload.message);
          }
        }
        if (response.status === 429) {
          const message = payload?.message ?? t("nutrition.aiRateLimit");
          throw new Error(message);
        }
        throw new Error(t("nutrition.aiError"));
      }
      const data = (await response.json()) as {
        plan?: NutritionPlan;
        aiTokenBalance?: number;
        aiTokenRenewalAt?: string | null;
      };
      const generatedPlan = data.plan ?? (data as unknown as NutritionPlan);
      if (typeof data.aiTokenBalance === "number") {
        setAiTokenBalance(data.aiTokenBalance);
      }
      if (typeof data.aiTokenRenewalAt === "string" || data.aiTokenRenewalAt === null) {
        setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      }
      const planToSave = ensurePlanStartDate(generatedPlan);
      setSavedPlan(planToSave);
      setSelectedDate(parseDate(planToSave.startDate) ?? selectedDate);
      const updated = await updateUserProfile({ nutritionPlan: planToSave });
      setSavedPlan(updated.nutritionPlan ?? planToSave);
      setPendingTokenToastId((value) => value + 1);
      setSaveMessage(t("nutrition.aiSuccess"));
      void refreshSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("nutrition.aiError"));
    } finally {
      setAiLoading(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

useEffect(() => {
  if (!profile) return;
  if (autoGenerated.current) return;
  if (searchParams.get("ai") !== "1") return;
  autoGenerated.current = true;
  void handleAiPlan();
}, [profile, searchParams]);

  const handleGenerateClick = () => {
    if (!profile) return;
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=nutrition&next=/app/nutricion");
      return;
    }
    void handleAiPlan();
  };

  const isAiLocked = !aiEntitled || (subscriptionPlan === "FREE" && (aiTokenBalance ?? 0) <= 0);
  const isAiDisabled = aiLoading || isAiLocked || !plan;

  const handlePrevDay = () => {
    setSelectedDate((prev) => addDays(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => addDays(prev, 1));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStartX.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null) return;
    const delta = event.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      handlePrevDay();
    } else {
      handleNextDay();
    }
  };

  const handleExportCsv = () => {
    if (!visiblePlan) {
      setExportMessage(t("nutrition.exportEmpty"));
      return;
    }

    const escape = (value: string | number) => {
      const text = String(value).replace(/\"/g, "\"\"");
      return `"${text}"`;
    };

    const rows = [
      [
        t("nutrition.exportDay"),
        t("nutrition.exportMealType"),
        t("nutrition.exportMealTitle"),
        t("nutrition.exportDescription"),
        t("nutrition.exportCalories"),
        t("nutrition.exportProtein"),
        t("nutrition.exportCarbs"),
        t("nutrition.exportFats"),
        t("nutrition.exportIngredients"),
      ].map(escape).join(","),
    ];

    visiblePlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        const ingredients = (meal.ingredients ?? [])
          .map((ingredient) => `${ingredient.name} ${ingredient.grams}g`)
          .join(" | ");
        rows.push([
          day.dayLabel,
          meal.type,
          meal.title,
          meal.description ?? "",
          meal.macros.calories,
          meal.macros.protein,
          meal.macros.carbs,
          meal.macros.fats,
          ingredients,
        ].map(escape).join(","));
      });
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitsculpt-nutrition-plan.csv";
    link.click();
    URL.revokeObjectURL(url);
    setExportMessage(t("nutrition.exportSuccess"));
    window.setTimeout(() => setExportMessage(null), 2000);
  };

  const handleCopyShoppingList = async () => {
    if (!visiblePlan) {
      setExportMessage(t("nutrition.exportEmpty"));
      return;
    }
    const items = aggregateShoppingList(visiblePlan);
    if (items.length === 0) {
      setExportMessage(t("nutrition.exportEmpty"));
      return;
    }
    const text = items.map((item) => `${item.name}: ${item.grams} g`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch (_err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setExportMessage(t("nutrition.exportCopySuccess"));
    window.setTimeout(() => setExportMessage(null), 2000);
  };

  const hasPlan = Boolean(visiblePlan?.days.length);

  useEffect(() => {
    if (!hasPlan) return;
    if (!pendingTokenToastId) return;
    if (renderedTokenToastId.current === pendingTokenToastId) return;
    renderedTokenToastId.current = pendingTokenToastId;
    notify({
      title: t("ai.tokenConsumed"),
      variant: "success",
    });
  }, [hasPlan, notify, pendingTokenToastId, t]);
  const handleRetry = () => window.location.reload();

  return (
    <div className="page">
      {!isManualView ? (
        <>
          <section className="card">
            <div className="section-head section-head-actions">
              <div>
                <h2 className="section-title section-title-sm">{t("nutrition.formTitle")}</h2>
                <p className="section-subtitle">{t("nutrition.tips")}</p>
              </div>

              <div className="section-actions">
                {/* <button type="button" className="btn" disabled={!plan} onClick={() => loadProfile({ current: true })}>
                  {t("nutrition.generate")}
                </button> */}
                <button
                  type="button"
                  className="btn"
                  disabled={isAiDisabled}
                  onClick={handleGenerateClick}
                >
                  {aiLoading ? t("nutrition.aiGenerating") : t("nutrition.aiGenerate")}
                </button>
                {/* <button type="button" className="btn secondary" disabled={!plan || saving} onClick={handleSavePlan}>
                  {saving ? t("nutrition.savePlanSaving") : t("nutrition.savePlan")}
                </button> */}
                <Link href="/app/nutricion/editar" className="btn secondary">
                  {t("nutrition.editPlan")}
                </Link>
              </div>
            </div>

            {aiTokenBalance !== null ? (
              <p className="muted mt-8">
                {t("ai.tokensRemaining")} {aiTokenBalance}
                {aiTokenRenewalAt ? ` · ${t("ai.tokensReset")} ${formatDate(aiTokenRenewalAt)}` : ""}
              </p>
            ) : null}

            {isAiLocked ? (
              <div className="feature-card mt-12">
                <strong>{t("aiLockedTitle")}</strong>
                <p className="muted mt-6">{aiEntitled ? t("aiLockedSubtitle") : t("ai.notPro")}</p>
              </div>
            ) : null}

            {exportMessage && (
              <p className="muted mt-8">{exportMessage}</p>
            )}

            <div className="export-actions mt-12">
              <button type="button" className="btn secondary" onClick={handleExportCsv}>
                {t("nutrition.exportCsv")}
              </button>
              <button type="button" className="btn secondary" disabled title={t("nutrition.comingSoon")}>
                {t("nutrition.exportPdf")}
              </button>
              <button type="button" className="btn" onClick={handleCopyShoppingList}>
                {t("nutrition.exportCopyList")}
              </button>
            </div>

            {loading ? (
              <div className="form-stack">
                <Skeleton variant="line" className="w-40" />
                <Skeleton variant="line" className="w-70" />
              </div>
            ) : error ? (
              <div className="status-card status-card--warning">
                <div className="inline-actions-sm">
                  <Icon name="warning" />
                  <strong>{t("nutrition.errorTitle")}</strong>
                </div>
                <p className="muted">{error}</p>
                <div className="inline-actions-sm">
                  <button type="button" className="btn secondary fit-content" onClick={handleRetry}>
                    {t("ui.retry")}
                  </button>
                  <button type="button" className="btn secondary fit-content" onClick={() => router.back()}>
                    {t("ui.back")}
                  </button>
                </div>
              </div>
            ) : saveMessage ? (
              <p className="muted">{saveMessage}</p>
            ) : profile ? (
              <>
                <div className="badge-list">
                  <Badge>
                    {t("macros.goal")}: {t(profile.goal === "cut" ? "macros.goalCut" : profile.goal === "bulk" ? "macros.goalBulk" : "macros.goalMaintain")}
                  </Badge>
                  <Badge>{t("nutrition.mealsPerDay")}: {profile.nutritionPreferences.mealsPerDay}</Badge>
                  <Badge>
                    {t("nutrition.cookingTime")}: {t(profile.nutritionPreferences.cookingTime === "quick" ? "nutrition.cookingTimeOptionQuick" : profile.nutritionPreferences.cookingTime === "long" ? "nutrition.cookingTimeOptionLong" : "nutrition.cookingTimeOptionMedium")}
                  </Badge>
                </div>

                <div className="info-grid mt-16">
                  <div className="info-item">
                    <div className="info-label">{t("macros.weight")}</div>
                    <div className="info-value">{profile.weightKg ?? "-"} kg</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("macros.height")}</div>
                    <div className="info-value">{profile.heightCm ?? "-"} cm</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("macros.activity")}</div>
                    <div className="info-value">
                      {t(profile.activity === "sedentary" ? "macros.activitySedentary" : profile.activity === "light" ? "macros.activityLight" : profile.activity === "moderate" ? "macros.activityModerate" : profile.activity === "very" ? "macros.activityVery" : "macros.activityExtra")}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.dietTypeLabel")}</div>
                    <div className="info-value">{t(`nutrition.dietType.${profile.nutritionPreferences.dietType}`)}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.mealDistributionLabel")}</div>
                    <div className="info-value">
                      {t(`nutrition.mealDistribution.${profile.nutritionPreferences.mealDistribution.preset}`)}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.allergiesLabel")}</div>
                    <div className="info-value">
                      {profile.nutritionPreferences.allergies.length > 0
                        ? profile.nutritionPreferences.allergies.join(", ")
                        : "-"}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.dietaryPrefs")}</div>
                    <div className="info-value">{profile.nutritionPreferences.dietaryPrefs || "-"}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.preferredFoods")}</div>
                    <div className="info-value">{profile.nutritionPreferences.preferredFoods || "-"}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.dislikedFoods")}</div>
                    <div className="info-value">{profile.nutritionPreferences.dislikedFoods || "-"}</div>
                  </div>
                </div>
              </>
            ) : null}

            <p className="muted mt-12">
              {t("nutrition.preferencesHint")}
            </p>
          </section>

          {loading ? (
            <section className="card">
              <div className="section-head">
                <div>
                  <h2 className="section-title section-title-sm">{t("nutrition.calendarTitle")}</h2>
                  <p className="section-subtitle">{t("nutrition.calendarSubtitle")}</p>
                </div>
              </div>
              <div className="list-grid">{calendarMealSkeletons}</div>
            </section>
          ) : !error && profile && !isProfileComplete(profile) ? (
            <section className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Icon name="info" />
                </div>
                <div>
                  <h3 className="m-0">{t("nutrition.profileIncompleteTitle")}</h3>
                  <p className="muted">{t("nutrition.profileIncompleteSubtitle")}</p>
                </div>
                <ButtonLink href="/app/onboarding?next=/app/nutricion">
                  {t("profile.openOnboarding")}
                </ButtonLink>
              </div>
            </section>
          ) : !error && !hasPlan ? (
            <section className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Icon name="info" />
                </div>
                <div>
                  <h3 className="m-0">{t("nutrition.emptyTitle")}</h3>
                  <p className="muted">{t("nutrition.emptySubtitle")}</p>
                </div>
                <div className="empty-state-actions">
                  <Button
                    disabled={isAiDisabled}
                    loading={aiLoading}
                    onClick={handleGenerateClick}
                  >
                    {aiLoading ? t("nutrition.aiGenerating") : t("nutrition.aiGenerate")}
                  </Button>
                  <ButtonLink variant="secondary" href="/app/nutricion/editar">
                    {t("nutrition.manualCreate")}
                  </ButtonLink>
                </div>
              </div>
            </section>
          ) : hasPlan ? (
            <>
              <section className="card">
                <div className="section-head section-head-actions">
                  <div>
                    <h2 className="section-title section-title-sm">{t("nutrition.calendarTitle")}</h2>
                    <p className="section-subtitle">{t("nutrition.calendarSubtitle")}</p>
                  </div>
                  <div className="section-actions calendar-actions">
                    <div className="segmented-control">
                      {calendarOptions.map((option) => {
                        const isActive =
                          option.value === "today" ? calendarView === "day" : calendarView === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`segmented-control-btn ${isActive ? "active" : ""}`}
                            onClick={() => {
                              if (option.value === "today") {
                                setSelectedDate(new Date());
                                setCalendarView("day");
                                return;
                              }
                              setCalendarView(option.value as typeof calendarView);
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {!planStartDate ? (
                  <div className="calendar-empty">
                    <div className="empty-state">
                      <h3 className="m-0">{t("nutrition.calendarStartDateTitle")}</h3>
                      <p className="muted">{t("nutrition.calendarStartDateSubtitle")}</p>
                      <Button onClick={handleSetStartDate}>{t("nutrition.calendarStartDateCta")}</Button>
                    </div>
                    <div className="list-grid">
                      {visiblePlan?.days.map((day) => (
                        <div key={day.dayLabel} className="feature-card">
                          <strong>{day.dayLabel}</strong>
                          <div className="list-grid mt-8">
                            {day.meals.map((meal, mealIndex) => {
                              const mealKey = getMealKey(meal, day.dayLabel, mealIndex);
                              return (
                                <MealCard
                                key={mealKey}
                                title={getMealTitle(meal, t)}
                                description={getMealDescription(meal)}
                                meta={[
                                  getMealTypeLabel(meal, t),
                                  Number.isFinite(meal.macros?.calories)
                                    ? `${meal.macros.calories} ${t("units.kcal")}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                                imageUrl={getMealMediaUrl(meal)}
                                onClick={() => openMealDetail(meal, day.dayLabel, mealKey, day.dayLabel)}
                                ariaLabel={`${t("nutrition.mealDetailTitle")}: ${getMealTitle(meal, t)}`}
                              />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="feature-card mb-12">
                      <div className="section-head section-head-actions">
                        <div>
                          <strong>{t("nutrition.quickLogTitle")}</strong>
                          <p className="muted mt-4 mb-0">{t("nutrition.quickLogSubtitle")}</p>
                        </div>
                        <Badge variant="muted">{t("nutrition.localOnlyBadge")}</Badge>
                      </div>
                      {quickLogMessage ? (
                        <p className={`muted mt-8 ${quickLogMessage.type === "error" ? "text-danger" : ""}`}>
                          {quickLogMessage.message}
                        </p>
                      ) : null}
                      {quickFavoritesLoading ? (
                        <p className="muted mt-8">{t("nutrition.quickFavoritesLoading")}</p>
                      ) : quickFavoritesError ? (
                        <p className="muted mt-8">{t("nutrition.quickFavoritesError")}</p>
                      ) : quickFavorites.length === 0 ? (
                        <div className="empty-state mt-8">
                          <p className="muted">{t("nutrition.quickFavoritesEmpty")}</p>
                        </div>
                      ) : (
                        <div className="list-grid mt-8">
                          {quickFavorites.map((favorite) => (
                            <div key={favorite.id} className="feature-card">
                              <strong>{favorite.title}</strong>
                              <p className="muted mt-4 mb-0">{t(`nutrition.mealType${favorite.mealType.charAt(0).toUpperCase()}${favorite.mealType.slice(1)}`)}</p>
                              <div className="inline-actions-sm mt-8">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleUseFavorite(favorite)}
                                >
                                  {t("nutrition.quickUseFavorite")}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {calendarView === "day" ? (
                      <div
                        role="presentation"
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        className="calendar-day"
                      >
                        <div className="calendar-day-header">
                          <div>
                            <strong>{selectedDate.toLocaleDateString(localeCode, { weekday: "long", month: "short", day: "numeric" })}</strong>
                            <p className="muted mt-4 mb-0">
                              {selectedVisiblePlanDay?.day.dayLabel ?? safeT("nutrition.calendarEmptyFocus", t("nutrition.todayTitle"))}
                            </p>
                          </div>
                          <div className="calendar-day-actions">
                            <button type="button" className="btn secondary" onClick={handlePrevDay}>
                              {t("nutrition.dayPrev")}
                            </button>
                            <button type="button" className="btn secondary" onClick={handleNextDay}>
                              {t("nutrition.dayNext")}
                            </button>
                          </div>
                        </div>
                        {selectedVisiblePlanDay ? (
                          <div className="list-grid">
                            {isSelectedDayReplicated ? <Badge variant="muted">{t("plan.replicatedWeekLabel")}</Badge> : null}
                            {selectedVisiblePlanDay.day.meals.map((meal, mealIndex) => {
                              const dayKey = toDateKey(selectedVisiblePlanDay.date);
                              const mealKey = getMealKey(meal, dayKey, mealIndex);
                              return (
                                <MealCard
                                key={mealKey}
                                title={getMealTitle(meal, t)}
                                description={getMealDescription(meal)}
                                meta={[
                                  getMealTypeLabel(meal, t),
                                  Number.isFinite(meal.macros?.calories)
                                    ? `${meal.macros.calories} ${t("units.kcal")}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                                imageUrl={getMealMediaUrl(meal)}
                                onClick={() =>
                                  openMealDetail(meal, dayKey, mealKey, selectedVisiblePlanDay.day.dayLabel)
                                }
                                ariaLabel={`${t("nutrition.mealDetailTitle")}: ${getMealTitle(meal, t)}`}
                              />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <p className="muted">{safeT("nutrition.calendarEmptyDay", t("nutrition.emptySubtitle"))}</p>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {calendarView === "week" ? (
                      <div className="calendar-week">
                        <div className="calendar-range">
                          <button
                            type="button"
                            className="btn secondary"
                            aria-label={t("calendar.previousWeekAria")}
                            onClick={() => setSelectedDate((prev) => addWeeks(prev, -1))}
                          >
                            {t("calendar.previousWeek")}
                          </button>
                          <strong>
                            {t("nutrition.weekLabel")} {clampedWeekOffset + 1}
                          </strong>
                          <span className="muted">{weekStart.toLocaleDateString(localeCode, { month: "short", day: "numeric" })} → {addDays(weekStart, 6).toLocaleDateString(localeCode, { month: "short", day: "numeric" })}</span>
                          <button
                            type="button"
                            className="btn secondary"
                            aria-label={t("calendar.nextWeekAria")}
                            onClick={() => setSelectedDate((prev) => addWeeks(prev, 1))}
                            disabled={weekOffset >= maxProjectedWeeksAhead}
                          >
                            {t("calendar.nextWeek")}
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => {
                              setSelectedDate(new Date());
                              setCalendarView("day");
                            }}
                          >
                            {t("nutrition.viewToday")}
                          </button>
                          {projectedWeek.isReplicated ? <Badge variant="muted">{t("plan.replicatedWeekLabel")}</Badge> : null}
                        </div>
                        {hasWeeklyMeals ? (
                          <div className="calendar-week-grid">
                            {weekDates.map((date) => {
                              const entry = visibleDayMap.get(toDateKey(date));
                              return (
                                <button
                                  key={toDateKey(date)}
                                  type="button"
                                  className={`calendar-day-card ${entry ? "has-plan" : "is-empty"} ${isSameDay(date, today) ? "is-today" : ""}`}
                                  onClick={() => {
                                    setSelectedDate(date);
                                    setCalendarView("day");
                                  }}
                                >
                                  <div className="calendar-day-card-header">
                                    <span>{date.toLocaleDateString(localeCode, { weekday: "short" })}</span>
                                    <strong>{date.getDate()}</strong>
                                  </div>
                                  {entry ? (
                                    <div className="calendar-day-card-body">
                                      <span className="badge">{entry.day.dayLabel}</span>
                                      <p className="muted">{entry.day.meals.length} {t("nutrition.mealCountLabel")}</p>
                                      <span className="calendar-dot" />
                                    </div>
                                  ) : (
                                    <p className="muted">{safeT("nutrition.calendarEmptyShort", t("nutrition.emptySubtitle"))}</p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <h3 className="m-0">{t("nutrition.weeklyEmptyTitle")}</h3>
                            <p className="muted">{t("nutrition.weeklyEmptySubtitle")}</p>
                            <button
                              type="button"
                              className="btn secondary fit-content"
                              onClick={() => {
                                setSelectedDate(new Date());
                                setCalendarView("day");
                              }}
                            >
                              {t("nutrition.viewToday")}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {calendarView === "month" ? (
                      <div className="calendar-month">
                        <div className="calendar-range">
                          <strong>{monthLabel}</strong>
                        </div>
                        <div className="calendar-month-grid">
                          {monthDates.map((date) => {
                            const entry = visibleDayMap.get(toDateKey(date));
                            const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                            return (
                              <button
                                key={toDateKey(date)}
                                type="button"
                                className={`calendar-month-cell ${isCurrentMonth ? "" : "is-muted"} ${entry ? "has-plan" : ""} ${isSameDay(date, today) ? "is-today" : ""}`}
                                onClick={() => {
                                  setSelectedDate(date);
                                  setCalendarView("day");
                                }}
                              >
                                <span>{date.getDate()}</span>
                                {entry ? <span className="calendar-dot" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {calendarView === "agenda" ? (
                      <div className="calendar-agenda">
                        {visiblePlanEntries.map((entry) => (
                          <button
                            key={`${entry.day.dayLabel}-${toDateKey(entry.date)}`}
                            type="button"
                            className="calendar-agenda-item"
                            onClick={() => {
                              setSelectedDate(entry.date);
                              setCalendarView("day");
                            }}
                          >
                            <div>
                              <strong>{entry.date.toLocaleDateString(localeCode, { weekday: "short", day: "numeric", month: "short" })}</strong>
                              <p className="muted">{entry.day.meals.length} {t("nutrition.mealCountLabel")}</p>
                            </div>
                            <span className="badge">{entry.day.dayLabel}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </section>

              <section className="card">
                <h2 className="section-title section-title-sm">{t("nutrition.dailyTargetTitle")}</h2>
                <div className="info-grid mt-16">
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.calories")}</div>
                    <div className="info-value">{visiblePlan?.dailyCalories ?? 0} kcal</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.protein")}</div>
                    <div className="info-value">{visiblePlan?.proteinG ?? 0} g</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.fat")}</div>
                    <div className="info-value">{visiblePlan?.fatG ?? 0} g</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("nutrition.carbs")}</div>
                    <div className="info-value">{visiblePlan?.carbsG ?? 0} g</div>
                  </div>
                </div>
              </section>

              <section className="card">
                <h2 className="section-title section-title-sm">{t("nutrition.shoppingTitle")}</h2>
                <button
                  type="button"
                  className="btn mt-8"
                  onClick={() => visiblePlan && buildShoppingList(visiblePlan)}
                >
                  {t("nutrition.shoppingGenerate")}
                </button>
                <div className="mt-12">
                  {shoppingList.length === 0 ? (
                    <p className="muted">{t("nutrition.shoppingEmpty")}</p>
                  ) : (
                    <ul className="list-reset">
                      {shoppingList.map((item) => (
                        <li key={item.name}>
                          {item.name}: {item.grams} g
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </>
      ) : null}

      {isManualView ? (
        <section className="card">
          <div className="section-head">
            <div>
              <h2 className="section-title section-title-sm">{t("nutrition.manualPlanTitle")}</h2>
              <p className="section-subtitle">{t("nutrition.manualPlanSubtitle")}</p>
            </div>
            <div className="inline-actions-sm">
              <button type="button" className="btn secondary" onClick={() => visiblePlan && setManualPlan(visiblePlan)}>
                {t("nutrition.manualPlanReset")}
              </button>
              <button type="button" className="btn" disabled={!manualPlan || saving} onClick={handleSaveManualPlan}>
                {saving ? t("nutrition.savePlanSaving") : t("nutrition.manualPlanSave")}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="form-stack">
              <Skeleton variant="line" className="w-45" />
              <Skeleton variant="line" className="w-70" />
            </div>
          ) : error ? (
            <div className="status-card status-card--warning">
              <div className="inline-actions-sm">
                <Icon name="warning" />
                <strong>{t("nutrition.errorTitle")}</strong>
              </div>
              <p className="muted">{error}</p>
              <div className="inline-actions-sm">
                <button type="button" className="btn secondary fit-content" onClick={handleRetry}>
                  {t("ui.retry")}
                </button>
                <button type="button" className="btn secondary fit-content" onClick={() => router.back()}>
                  {t("ui.back")}
                </button>
              </div>
            </div>
          ) : saveMessage ? (
            <p className="muted">{saveMessage}</p>
          ) : null}

          {manualPlan ? (
            <div className="form-stack">
              {manualPlan.days.map((day, dayIndex) => (
                <div key={`${day.dayLabel}-${dayIndex}`} className="feature-card stack-md">
                  <label className="form-stack">
                    {t("nutrition.manualDayLabel")}
                    <input
                      value={day.dayLabel}
                      onChange={(e) => updateManualDayLabel(dayIndex, e.target.value)}
                    />
                  </label>
                  <div className="form-stack">
                    {day.meals.map((meal, mealIndex) => (
                      <div key={`${meal.title}-${mealIndex}`} className="info-item stack-sm">
                        <div className="inline-actions-space">
                          <strong>{t("nutrition.manualMeal")}</strong>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => removeManualMeal(dayIndex, mealIndex)}
                          >
                            {t("nutrition.manualMealRemove")}
                          </button>
                        </div>
                        <div className="inline-grid-3">
                          <label className="form-stack">
                            {t("nutrition.manualMealType")}
                            <select
                              value={meal.type}
                              onChange={(e) =>
                                updateManualMeal(dayIndex, mealIndex, "type", e.target.value as Meal["type"])
                              }
                            >
                              <option value="breakfast">{t("nutrition.mealTypeBreakfast")}</option>
                              <option value="lunch">{t("nutrition.mealTypeLunch")}</option>
                              <option value="dinner">{t("nutrition.mealTypeDinner")}</option>
                              <option value="snack">{t("nutrition.mealTypeSnack")}</option>
                            </select>
                          </label>
                          <label className="form-stack">
                            {t("nutrition.manualMealTitleLabel")}
                            <input
                              value={meal.title}
                              onChange={(e) => updateManualMeal(dayIndex, mealIndex, "title", e.target.value)}
                            />
                          </label>
                        </div>
                        <label className="form-stack">
                          {t("nutrition.manualMealDescription")}
                          <textarea
                            rows={2}
                            value={meal.description}
                            onChange={(e) => updateManualMeal(dayIndex, mealIndex, "description", e.target.value)}
                          />
                        </label>
                        <div className="inline-grid-compact">
                          <label className="form-stack">
                            {t("nutrition.manualMealCalories")}
                            <input
                              type="number"
                              min={0}
                              value={meal.macros.calories}
                              onChange={(e) => updateManualMealMacro(dayIndex, mealIndex, "calories", Number(e.target.value))}
                            />
                          </label>
                          <label className="form-stack">
                            {t("nutrition.manualMealProtein")}
                            <input
                              type="number"
                              min={0}
                              value={meal.macros.protein}
                              onChange={(e) => updateManualMealMacro(dayIndex, mealIndex, "protein", Number(e.target.value))}
                            />
                          </label>
                          <label className="form-stack">
                            {t("nutrition.manualMealCarbs")}
                            <input
                              type="number"
                              min={0}
                              value={meal.macros.carbs}
                              onChange={(e) => updateManualMealMacro(dayIndex, mealIndex, "carbs", Number(e.target.value))}
                            />
                          </label>
                          <label className="form-stack">
                            {t("nutrition.manualMealFats")}
                            <input
                              type="number"
                              min={0}
                              value={meal.macros.fats}
                              onChange={(e) => updateManualMealMacro(dayIndex, mealIndex, "fats", Number(e.target.value))}
                            />
                          </label>
                        </div>
                        <div className="form-stack">
                          <div className="text-semibold">{t("nutrition.manualIngredients")}</div>
                          {(meal.ingredients ?? []).length === 0 ? (
                            <p className="muted">{t("nutrition.manualIngredientsEmpty")}</p>
                          ) : (
                            (meal.ingredients ?? []).map((ingredient, ingredientIndex) => (
                              <div
                                key={`${ingredient.name}-${ingredientIndex}`}
                                className="nutrition-ingredient-row"
                              >
                                <input
                                  value={ingredient.name}
                                  onChange={(e) =>
                                    updateIngredient(dayIndex, mealIndex, ingredientIndex, "name", e.target.value)
                                  }
                                  placeholder={t("nutrition.manualIngredientName")}
                                />
                                <input
                                  type="number"
                                  min={0}
                                  value={ingredient.grams}
                                  onChange={(e) =>
                                    updateIngredient(dayIndex, mealIndex, ingredientIndex, "grams", Number(e.target.value))
                                  }
                                />
                                <button
                                  type="button"
                                  className="btn secondary"
                                  onClick={() => removeIngredient(dayIndex, mealIndex, ingredientIndex)}
                                >
                                  {t("nutrition.manualIngredientRemove")}
                                </button>
                              </div>
                            ))
                          )}
                          <button type="button" className="btn secondary" onClick={() => addIngredient(dayIndex, mealIndex)}>
                            {t("nutrition.manualIngredientAdd")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn secondary" onClick={() => addManualMeal(dayIndex)}>
                    {t("nutrition.manualMealAdd")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{t("nutrition.manualPlanEmpty")}</p>
          )}
        </section>
      ) : null}

      <Modal
        open={Boolean(selectedMeal)}
        title={t("nutrition.mealDetailTitle")}
        description={selectedMeal?.dayLabel ?? undefined}
        onClose={closeMealDetail}
        footer={
          <div className="inline-actions-sm">
            <Button variant="secondary" onClick={closeMealDetail}>{t("ui.close")}</Button>
            {selectedMeal ? (
              <Button
                onClick={() => handleQuickLogMeal(selectedMeal.mealKey, selectedMeal.dayKey)}
                disabled={adherenceError}
              >
                {isConsumed(selectedMeal.mealKey, selectedMeal.dayKey)
                  ? t("nutrition.quickLogButtonConsumed")
                  : t("nutrition.quickLogButton")}
              </Button>
            ) : null}
          </div>
        }
      >
        {selectedMealDetails ? (
          <div className="stack-md">
            <div>
              <h3 className="m-0">{selectedMealTitle}</h3>
              <p className="muted mt-4">
                {getMealTypeLabel(selectedMealDetails, t)}
              </p>
              <div className="inline-actions-sm mt-8">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleFavoriteAction(selectedMealDetails)}
                >
                  {isSelectedMealFavorite ? t("nutrition.quickRemoveFavorite") : t("nutrition.quickAddFavorite")}
                </Button>
                <Badge variant="muted">{t("nutrition.localOnlyBadge")}</Badge>
              </div>
            </div>
            {getMealMediaUrl(selectedMealDetails) ? (
              <img
                src={getMealMediaUrl(selectedMealDetails) ?? ""}
                alt={selectedMealTitle}
                className="meal-card-thumb"
                loading="lazy"
              />
            ) : null}
            {selectedMealDescription ? (
              <p className="muted mt-4">{selectedMealDescription}</p>
            ) : null}
            {selectedMealMacros.length > 0 ? (
              <div>
                <div className="text-semibold">{t("nutrition.dailyTargetTitle")}</div>
                <ul className="list-muted-sm">
                  {selectedMealMacros.map((macro) => (
                    <li key={macro}>{macro}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {selectedMealInstructions ? (
              <div>
                <div className="text-semibold">{t("nutrition.instructionsTitle")}</div>
                <p className="muted mt-4">{selectedMealInstructions}</p>
              </div>
            ) : null}
            {selectedMealIngredients.length > 0 ? (
              <div>
                <div className="text-semibold">{t("nutrition.ingredients")}</div>
                <ul className="list-muted-sm">
                  {selectedMealIngredients.map((ingredient, index) => (
                    <li key={`${ingredient.name}-${index}`}>
                      {ingredient.name}
                      {Number.isFinite(ingredient.grams)
                        ? `: ${ingredient.grams} ${t("nutrition.grams")}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="muted">{t("nutrition.ingredientsNotAvailable")}</p>
            )}
            {!selectedMealDescription && !selectedMealInstructions && selectedMealIngredients.length === 0 && selectedMealMacros.length === 0 ? (
              <p className="muted">{t("nutrition.mealDetailsEmpty")}</p>
            ) : null}
          </div>
        ) : (
          <div className="empty-state">
            <p className="muted">{t("nutrition.mealDetailsNotFound")}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
