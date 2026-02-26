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
import { hasNutritionAiEntitlement, type AiEntitlementProfile } from "@/components/access/aiEntitlements";
import { AiModuleUpgradeCTA } from "@/components/UpgradeCTA/AiModuleUpgradeCTA";
import { Modal } from "@/components/ui/Modal";
import { MealCard, MealCardSkeleton } from "@/components/nutrition/MealCard";
import { HeroNutrition } from "@/components/nutrition/HeroNutrition";
import AppLayout from "@/components/layout/AppLayout";
import NutritionStats from "@/components/nutrition/NutritionStats";
import { WeeklyCalendar } from "@/components/nutrition/WeeklyCalendar";
import { Accordion, HeaderCompact, ObjectiveGrid, SegmentedControl } from "@/design-system/components";
import { useNutritionAdherence } from "@/lib/nutritionAdherence";
import { type NutritionQuickFavorite, useNutritionQuickFavorites } from "@/lib/nutritionQuickFavorites";
import { useToast } from "@/components/ui/Toast";
import { generateNutritionPlan, type NutritionGenerateError } from "@/services/nutrition";
import { normalizeAiErrorCode, shouldTreatAsConflictError, shouldTreatAsUpstreamError } from "@/lib/aiErrorMapping";

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

type AiTokenSnapshot = {
  tokens: number | null;
};

type AiUsageSummary = {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  balanceAfter?: number;
};

function normalizeAiUsageSummary(value: unknown): AiUsageSummary | null {
  if (!value || typeof value !== "object") return null;
  const usage = value as {
    totalTokens?: unknown;
    promptTokens?: unknown;
    completionTokens?: unknown;
    total_tokens?: unknown;
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    balanceAfter?: unknown;
  };

  const normalized: AiUsageSummary = {
    totalTokens:
      typeof usage.totalTokens === "number"
        ? usage.totalTokens
        : typeof usage.total_tokens === "number"
          ? usage.total_tokens
          : undefined,
    promptTokens:
      typeof usage.promptTokens === "number"
        ? usage.promptTokens
        : typeof usage.prompt_tokens === "number"
          ? usage.prompt_tokens
          : undefined,
    completionTokens:
      typeof usage.completionTokens === "number"
        ? usage.completionTokens
        : typeof usage.completion_tokens === "number"
          ? usage.completion_tokens
          : undefined,
    balanceAfter: typeof usage.balanceAfter === "number" ? usage.balanceAfter : undefined,
  };

  if (
    normalized.totalTokens === undefined
    && normalized.promptTokens === undefined
    && normalized.completionTokens === undefined
    && normalized.balanceAfter === undefined
  ) {
    return null;
  }

  return normalized;
}

type NutritionAiErrorState = {
  title: string;
  description: string;
  actionableHint: string | null;
  details: string | null;
  canRetry: boolean;
};

function sanitizeErrorMessage(value: string | null | undefined): string | null {
  if (!value) return null;
  const firstLine = value.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";
  if (!firstLine) return null;
  if (/^error:\s*/i.test(firstLine) || /\bat\s+.+\(.+\)/.test(firstLine)) return null;
  return firstLine;
}

const RECIPE_PLACEHOLDER = "/placeholders/recipe-cover.jpg";
const NUTRITION_PLANS_UPDATED_AT_KEY = "fs_nutrition_plans_updated_at";

async function readAiTokenSnapshot(): Promise<AiTokenSnapshot> {
  try {
    const billingResponse = await fetch("/api/billing/status", { cache: "no-store", credentials: "include" });
    if (billingResponse.ok) {
      const billingData = (await billingResponse.json()) as {
        tokens?: unknown;
        aiTokenBalance?: unknown;
      };
      const billingTokens =
        typeof billingData.tokens === "number"
          ? billingData.tokens
          : typeof billingData.aiTokenBalance === "number"
            ? billingData.aiTokenBalance
            : null;
      if (billingTokens !== null) {
        return { tokens: billingTokens };
      }
    }
  } catch (_err) {
  }

  try {
    const quotaResponse = await fetch("/api/ai/quota", { cache: "no-store", credentials: "include" });
    if (!quotaResponse.ok) {
      return { tokens: null };
    }
    const quotaData = (await quotaResponse.json()) as {
      tokens?: unknown;
      aiTokenBalance?: unknown;
      remainingTokens?: unknown;
      balance?: unknown;
    };
    const quotaTokens =
      typeof quotaData.tokens === "number"
        ? quotaData.tokens
        : typeof quotaData.aiTokenBalance === "number"
          ? quotaData.aiTokenBalance
          : typeof quotaData.remainingTokens === "number"
            ? quotaData.remainingTokens
            : typeof quotaData.balance === "number"
              ? quotaData.balance
              : null;
    return { tokens: quotaTokens };
  } catch (_err) {
    return { tokens: null };
  }
}

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
  return typeof match === "string" ? match : RECIPE_PLACEHOLDER;
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
  pt: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"],
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

function extractAiFieldErrorsMessage(details: unknown): string | null {
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

function extractAiDiffDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const typed = details as { diff?: unknown };
  if (!typed.diff || typeof typed.diff !== "object") return null;
  return JSON.stringify(typed.diff, null, 2);
}

function extractAiActionableHint(details: unknown, t: (key: string, vars?: Record<string, string | number>) => string): string | null {
  if (!details || typeof details !== "object") return null;

  const typed = details as {
    reason?: unknown;
    diff?: {
      expected?: unknown;
      actual?: unknown;
      delta?: unknown;
    };
  };

  const expected = Number(typed.diff?.expected);
  const actual = Number(typed.diff?.actual);

  if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
    return null;
  }

  const delta = Number(typed.diff?.delta);
  const fallbackDelta = Math.abs(expected - actual);
  const resolvedDelta = Number.isFinite(delta) ? Math.abs(delta) : fallbackDelta;
  const reason = typeof typed.reason === "string" && typed.reason.trim().length > 0 ? typed.reason : t("nutrition.aiErrorState.genericReason");

  return t("nutrition.aiErrorState.actionableDiff", {
    reason,
    expected: Math.round(expected * 10) / 10,
    actual: Math.round(actual * 10) / 10,
    delta: Math.round(resolvedDelta * 10) / 10,
  });
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

function toMacroSegment(grams: number, total: number) {
  if (!Number.isFinite(grams) || grams <= 0 || total <= 0) return 0;
  return Math.max(0, Math.min(100, (grams / total) * 100));
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
  const [aiEntitled, setAiEntitled] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [savedPlan, setSavedPlan] = useState<NutritionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<NutritionAiErrorState | null>(null);
  const [aiRetryCount, setAiRetryCount] = useState(0);
  const [aiSuccessModalOpen, setAiSuccessModalOpen] = useState(false);
  const [lastGeneratedAiPlan, setLastGeneratedAiPlan] = useState<NutritionPlan | null>(null);
  const [lastGeneratedUsage, setLastGeneratedUsage] = useState<AiUsageSummary | null>(null);
  const [lastGeneratedMode, setLastGeneratedMode] = useState<string | null>(null);
  const [lastGeneratedAiRequestId, setLastGeneratedAiRequestId] = useState<string | null>(null);
  const [lastGeneratedPlanId, setLastGeneratedPlanId] = useState<string | null>(null);
  const [lastGeneratedTokensBalance, setLastGeneratedTokensBalance] = useState<number | null>(null);
  const [pendingTokenToastId, setPendingTokenToastId] = useState(0);
  const [manualPlan, setManualPlan] = useState<NutritionPlan | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<"month" | "week" | "list">("week");
  const [isPlanDetailsOpen, setIsPlanDetailsOpen] = useState(false);
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
  const swipeStartX = useRef<number | null>(null);
  const autoGenerated = useRef(false);
  const aiGenerationInFlight = useRef(false);
  const generatedPlanSectionRef = useRef<HTMLElement | null>(null);
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
      setAiTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      setAiEntitled(hasNutritionAiEntitlement(data));
      window.dispatchEvent(new Event("auth:refresh"));
    } catch (_err) {
    }
  };

  useEffect(() => {
    void refreshSubscription();
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
  const highlightedDay = selectedVisiblePlanDay?.day ?? visiblePlan?.days[0] ?? null;
  const highlightedDayKey = selectedVisiblePlanDay?.date ? toDateKey(selectedVisiblePlanDay.date) : toDateKey(selectedDate);
  const highlightedMeals = highlightedDay?.meals ?? [];
  const highlightedMealsTotals = useMemo(
    () =>
      highlightedMeals.reduce(
        (acc, meal) => {
          acc.calories += Number(meal.macros?.calories ?? 0);
          acc.protein += Number(meal.macros?.protein ?? 0);
          acc.carbs += Number(meal.macros?.carbs ?? 0);
          acc.fats += Number(meal.macros?.fats ?? 0);
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      ),
    [highlightedMeals]
  );
  const highlightedMacroTotal = highlightedMealsTotals.protein + highlightedMealsTotals.carbs + highlightedMealsTotals.fats;
  const macroRingSegments = [
    {
      key: "protein",
      label: t("nutrition.protein"),
      grams: highlightedMealsTotals.protein,
      percent: toMacroSegment(highlightedMealsTotals.protein, highlightedMacroTotal),
      color: "#6d5cff",
    },
    {
      key: "carbs",
      label: t("nutrition.carbs"),
      grams: highlightedMealsTotals.carbs,
      percent: toMacroSegment(highlightedMealsTotals.carbs, highlightedMacroTotal),
      color: "#22c55e",
    },
    {
      key: "fats",
      label: t("nutrition.fat"),
      grams: highlightedMealsTotals.fats,
      percent: toMacroSegment(highlightedMealsTotals.fats, highlightedMacroTotal),
      color: "#f59e0b",
    },
  ];
  const isSelectedDayReplicated = selectedVisiblePlanDay?.isReplicated ?? false;
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const weekEntries = useMemo(() => weekDates.map((date) => visibleDayMap.get(toDateKey(date)) ?? null), [visibleDayMap, weekDates]);
  const hasWeeklyMeals = useMemo(
    () => weekEntries.some((entry) => Boolean(entry && entry.day.meals.length > 0)),
    [weekEntries]
  );
  const monthDates = useMemo(() => buildMonthGrid(selectedDate), [selectedDate]);
  const localeCode = locale === "es" ? "es-ES" : locale === "pt" ? "pt-PT" : "en-US";
  const monthLabel = selectedDate.toLocaleDateString(localeCode, { month: "long", year: "numeric" });
  const today = new Date();
  const calendarOptions = useMemo(
    () => [
      { value: "month", label: t("calendar.viewMonth") },
      { value: "week", label: t("calendar.viewWeek") },
      { value: "list", label: t("calendar.viewList") },
    ],
    [t]
  );
  const objectiveItems = useMemo(
    () => [
      {
        id: "objective-kcal",
        label: t("nutrition.calories"),
        value: `${visiblePlan?.dailyCalories ?? 0} ${t("units.kcal")}`,
      },
      {
        id: "objective-protein",
        label: t("nutrition.protein"),
        value: `${visiblePlan?.proteinG ?? 0} ${t("nutrition.grams")}`,
      },
      {
        id: "objective-carbs",
        label: t("nutrition.carbs"),
        value: `${visiblePlan?.carbsG ?? 0} ${t("nutrition.grams")}`,
      },
      {
        id: "objective-fat",
        label: t("nutrition.fat"),
        value: `${visiblePlan?.fatG ?? 0} ${t("nutrition.grams")}`,
      },
    ],
    [t, visiblePlan?.carbsG, visiblePlan?.dailyCalories, visiblePlan?.fatG, visiblePlan?.proteinG]
  );
  const weekGridDays = useMemo(
    () =>
      weekDates.map((date) => {
        const dayKey = toDateKey(date);
        const entry = visibleDayMap.get(dayKey);
        const mealsForDay = entry?.day?.meals ?? [];
        const dayCalories = mealsForDay.reduce((sum, meal) => sum + Number(meal.macros?.calories ?? 0), 0);
        return {
          id: dayKey,
          label: date.toLocaleDateString(localeCode, { weekday: "short" }),
          date: String(date.getDate()),
          selected: isSameDay(date, selectedDate),
          complete: mealsForDay.length > 0,
          dayCalories,
          mealCount: mealsForDay.length,
        };
      }),
    [localeCode, selectedDate, visibleDayMap, weekDates]
  );

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

  const MAX_AI_RETRIES = 3;

  const handleAiPlan = async (mode: "default" | "simple" = "default") => {
    if (!profile || aiLoading || aiGenerationInFlight.current) return;
    if (!aiEntitled) return;
    if (aiTokenBalance !== null && aiTokenBalance <= 0) {
      setAiError({
        title: t("nutrition.aiErrorState.title"),
        description: t("ai.insufficientTokens"),
        actionableHint: null,
        details: null,
        canRetry: false,
      });
      return;
    }
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=nutrition&next=/app/nutricion");
      return;
    }
    aiGenerationInFlight.current = true;
    setAiLoading(true);
    setAiError(null);
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

const data = await generateNutritionPlan({
  name: profile.name || undefined,
  age: profile.age ?? undefined,
  sex: profile.sex ?? undefined,
  goal: profile.goal ?? undefined,
      mealsPerDay,
      targetKcal,
      macroTargets,
      startDate,
      daysCount: 7,
      dietType: profile.nutritionPreferences.dietType,
      allergies: mode === "simple" ? [] : profile.nutritionPreferences.allergies,
      preferredFoods: mode === "simple" ? "" : profile.nutritionPreferences.preferredFoods,
      dislikedFoods: mode === "simple" ? "" : profile.nutritionPreferences.dislikedFoods,
      mealDistribution:
        mode === "simple"
          ? { preset: "balanced", percentages: [25, 25, 30, 20] }
          : profile.nutritionPreferences.mealDistribution,
  });
      const generatedPlan = data.plan ?? (data as unknown as NutritionPlan);
      if (typeof data.aiTokenBalance === "number") {
        setAiTokenBalance(data.aiTokenBalance);
      }
      if (typeof data.aiTokenRenewalAt === "string" || data.aiTokenRenewalAt === null) {
        setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      }
      function isNutritionPlanData(value: unknown): value is NutritionPlanData {
  if (!value || typeof value !== "object") return false;
  const v = value as NutritionPlanData;

  return (
    typeof (v as { dailyCalories?: unknown }).dailyCalories === "number" &&
    typeof (v as { proteinG?: unknown }).proteinG === "number" &&
    typeof (v as { carbsG?: unknown }).carbsG === "number" &&
    typeof (v as { fatG?: unknown }).fatG === "number" &&
    Array.isArray((v as { days?: unknown }).days)
  );
}
const candidatePlan = (data as { plan?: unknown }).plan;

if (!isNutritionPlanData(candidatePlan)) {
  throw {
    status: 400,
    code: "INVALID_AI_OUTPUT",
    message: "Invalid plan shape returned by /api/ai/nutrition-plan/generate",
  } satisfies Partial<NutritionGenerateError>;
}

const planToSave = ensurePlanStartDate(candidatePlan);
      const generatedPlanIdFromResponse = typeof data.planId === "string" && data.planId.trim().length > 0
        ? data.planId.trim()
        : null;
      const generatedPlanIdFromPlan =
        "id" in planToSave && typeof (planToSave as { id?: unknown }).id === "string" && (planToSave as { id: string }).id.trim().length > 0
          ? (planToSave as { id: string }).id.trim()
          : null;
      setSavedPlan(planToSave);
      setSelectedDate(parseDate(planToSave.startDate) ?? selectedDate);
      const updated = await updateUserProfile({ nutritionPlan: planToSave });
      const updatedPlan = updated.nutritionPlan ?? planToSave;
      setSavedPlan(updatedPlan);

      const tokensAfter = await readAiTokenSnapshot();
      const currentTokenBalance =
        tokensAfter.tokens
        ?? (typeof data.usage?.balanceAfter === "number" ? data.usage.balanceAfter : null)
        ?? (typeof data.balanceAfter === "number" ? data.balanceAfter : null)
        ?? (typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);

      if (currentTokenBalance !== null) {
        setAiTokenBalance(currentTokenBalance);
      }

      setLastGeneratedAiPlan(updatedPlan);
      setLastGeneratedUsage(normalizeAiUsageSummary(data.usage));
      setLastGeneratedMode(typeof data.mode === "string" ? data.mode : null);
      setLastGeneratedAiRequestId(typeof data.aiRequestId === "string" ? data.aiRequestId : null);
      setLastGeneratedPlanId(generatedPlanIdFromResponse ?? generatedPlanIdFromPlan);
      setLastGeneratedTokensBalance(currentTokenBalance);
      setAiRetryCount(0);
      setAiSuccessModalOpen(true);
      setPendingTokenToastId((value) => value + 1);
      setSaveMessage(t("nutrition.aiSuccess"));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NUTRITION_PLANS_UPDATED_AT_KEY, String(Date.now()));
      }
      void refreshSubscription();
    } catch (err) {
      const requestError = err as NutritionGenerateError;
      const retriesReached = aiRetryCount >= MAX_AI_RETRIES;
      const errorCode = normalizeAiErrorCode(requestError?.code);
      const backendMessage = sanitizeErrorMessage(requestError?.message) ?? sanitizeErrorMessage(requestError?.code);
      if (errorCode === "INSUFFICIENT_TOKENS") {
        setAiError({
          title: t("nutrition.aiErrorState.title"),
          description: t("ai.insufficientTokens"),
          actionableHint: null,
          details: null,
          canRetry: false,
        });
        notify({ title: t("nutrition.aiErrorState.toast"), variant: "error" });
      } else if (requestError?.status === 400 && errorCode === "INVALID_AI_OUTPUT") {
        setAiError({
          title: t("nutrition.aiErrorState.invalidOutputTitle"),
          description: t("nutrition.aiErrorState.invalidOutputDescription"),
          actionableHint: extractAiActionableHint(requestError.details, t),
          details: extractAiDiffDetails(requestError.details),
          canRetry: !retriesReached,
        });
        setAiRetryCount((prev) => prev + 1);
        notify({ title: t("nutrition.aiErrorState.toast"), variant: "error" });
      } else if (requestError?.status === 400) {
        setAiError({
          title: t("nutrition.aiErrorState.title"),
          description: backendMessage ?? extractAiFieldErrorsMessage(requestError.details) ?? t("nutrition.aiErrorState.genericDescription"),
          actionableHint: null,
          details: null,
          canRetry: !retriesReached,
        });
        setAiRetryCount((prev) => prev + 1);
        notify({ title: t("nutrition.aiErrorState.toast"), variant: "error" });
      } else if (requestError?.status === 429 || errorCode === "RATE_LIMITED") {
        setAiError({
          title: t("nutrition.aiErrorState.title"),
          description: t("nutrition.aiRateLimit"),
          actionableHint: null,
          details: null,
          canRetry: !retriesReached,
        });
        setAiRetryCount((prev) => prev + 1);
        notify({ title: t("nutrition.aiErrorState.toast"), variant: "error" });
      } else if (shouldTreatAsConflictError(requestError?.status)) {
        setAiError({
          title: t("nutrition.aiErrorState.title"),
          description: t("nutrition.aiErrorState.conflictDescription"),
          actionableHint: null,
          details: null,
          canRetry: !retriesReached,
        });
        setAiRetryCount((prev) => prev + 1);
        notify({ title: t("nutrition.aiErrorState.toast"), variant: "error" });
      } else if (shouldTreatAsUpstreamError(requestError?.status, requestError?.code)) {
        setAiError({
          title: t("nutrition.aiErrorState.title"),
          description: t("nutrition.aiErrorState.upstreamDescription"),
          actionableHint: null,
          details: null,
          canRetry: !retriesReached,
        });
        setAiRetryCount((prev) => prev + 1);
        notify({ title: t("nutrition.aiErrorState.toast"), variant: "error" });
      } else {
        setAiError({
          title: t("nutrition.aiErrorState.title"),
          description: backendMessage ?? t("nutrition.aiErrorState.genericDescription"),
          actionableHint: null,
          details: null,
          canRetry: !retriesReached,
        });
        setAiRetryCount((prev) => prev + 1);
        notify({ title: t("nutrition.aiErrorState.toast"), variant: "error" });
      }
    } finally {
      aiGenerationInFlight.current = false;
      setAiLoading(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

useEffect(() => {
  if (!profile) return;
  if (autoGenerated.current) return;
  if (searchParams.get("ai") !== "1") return;
  autoGenerated.current = true;
  if (!aiEntitled) return;
  void handleAiPlan();
}, [aiEntitled, profile, searchParams]);

  const handleGenerateClick = () => {
    if (aiGenerationInFlight.current || aiLoading || !profile) return;
    if (aiTokenBalance !== null && aiTokenBalance <= 0) {
      setAiError({
        title: t("nutrition.aiErrorState.title"),
        description: t("ai.insufficientTokens"),
        actionableHint: null,
        details: null,
        canRetry: false,
      });
      return;
    }
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=nutrition&next=/app/nutricion");
      return;
    }
    void handleAiPlan();
  };

  const isAiLocked = !aiEntitled;
  const isOutOfTokens = aiTokenBalance !== null && aiTokenBalance <= 0;
  const isAiDisabled = aiLoading || isAiLocked || isOutOfTokens;
  const aiLockDescription = safeT("nutrition.aiModuleRequired", "Requiere NutriAI o PRO");

  const generatedPlanPreviewDay = useMemo(() => {
    if (!lastGeneratedAiPlan?.days?.length) return null;
    const currentDayKey = toDateKey(selectedDate);
    const indexedDays = lastGeneratedAiPlan.days.map((day, index) => {
      const fallbackDate = lastGeneratedAiPlan.startDate
        ? toDateKey(addDays(new Date(lastGeneratedAiPlan.startDate), index))
        : null;
      return { day, date: day.date ?? fallbackDate };
    });
    return indexedDays.find((entry) => entry.date === currentDayKey) ?? indexedDays[0] ?? null;
  }, [lastGeneratedAiPlan, selectedDate]);

  const handleCloseAiSuccessModal = () => setAiSuccessModalOpen(false);

  const handleViewGeneratedPlan = () => {
    setAiSuccessModalOpen(false);
    if (lastGeneratedPlanId) {
      router.push(`/app/dietas/${lastGeneratedPlanId}`);
      return;
    }

    notify({ title: t("nutrition.aiSuccessRequiresPlanId"), variant: "error" });
  };

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
  const handleRetry = () => {
    void handleAiPlan();
  };

const nutritionPlanDetails = profile ? (
  <section className="card">
    <div className="section-head section-head-actions">
      <div>
        <h2 className="section-title section-title-sm">{t("nutrition.planDetails.title")}</h2>
        <p className="section-subtitle">{t("nutrition.planDetails.subtitle")}</p>
      </div>

      <button
        type="button"
        className="btn secondary fit-content"
        aria-expanded={isPlanDetailsOpen}
        aria-controls="nutrition-plan-details"
        onClick={() => setIsPlanDetailsOpen((prev) => !prev)}
      >
        {isPlanDetailsOpen ? t("ui.hide") : t("ui.show")}
        <Icon
          name="chevron-down"
          size={16}
          className="ml-6"
          style={{
            transform: isPlanDetailsOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        />
      </button>
    </div>

    <div
      id="nutrition-plan-details"
      role="region"
      aria-label={t("nutrition.planDetails.title")}
      hidden={!isPlanDetailsOpen}
      className="mt-16"
    >
      <div className="inline-actions-sm mb-12">
        <Link href="/app/nutricion/editar" className="btn secondary">
          {t("nutrition.editPlan")}
        </Link>
      </div>

      {aiTokenBalance !== null ? (
        <p className="muted mt-8 plan-token-line">
          {t("ai.tokensRemaining")} {aiTokenBalance}
          {aiTokenRenewalAt ? ` · ${t("ai.tokensReset")} ${formatDate(aiTokenRenewalAt)}` : ""}
        </p>
      ) : null}

        {aiTokenBalance !== null ? (
          <p className="muted mt-8 plan-token-line">
            {t("ai.tokensRemaining")} {aiTokenBalance}
            {aiTokenRenewalAt ? ` · ${t("ai.tokensReset")} ${formatDate(aiTokenRenewalAt)}` : ""}
          </p>
        ) : null}

        {exportMessage ? (
          <p className="muted mt-8">{exportMessage}</p>
        ) : null}

        <div className="export-actions mt-12">
          <button type="button" className="btn secondary" onClick={handleExportCsv}>
            {t("nutrition.exportCsv")}
          </button>
          <button type="button" className="btn" onClick={handleCopyShoppingList}>
            {t("nutrition.exportCopyList")}
          </button>
          <button type="button" className="btn secondary" disabled title={t("nutrition.comingSoon")}>
            {t("nutrition.exportPdf")}
          </button>
        </div>

        <div className="badge-list plan-summary-chips mt-12">
          <Badge>
            {t("macros.goal")}: {t(profile.goal === "cut" ? "macros.goalCut" : profile.goal === "bulk" ? "macros.goalBulk" : "macros.goalMaintain")}
          </Badge>
          <Badge>{t("nutrition.mealsPerDay")}: {profile.nutritionPreferences.mealsPerDay}</Badge>
          <Badge>
            {t("nutrition.cookingTime")}: {t(profile.nutritionPreferences.cookingTime === "quick" ? "nutrition.cookingTimeOptionQuick" : profile.nutritionPreferences.cookingTime === "long" ? "nutrition.cookingTimeOptionLong" : "nutrition.cookingTimeOptionMedium")}
          </Badge>
        </div>

        <div className="info-grid">
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

        <p className="muted mt-12">
          {t("nutrition.preferencesHint")}
        </p>
      </div>
    </section>
  ) : null;

  const rightPanel = hasPlan ? (
    <div className="desktop-side-stack">
      <NutritionStats
        calories={highlightedMealsTotals.calories}
        protein={highlightedMealsTotals.protein}
        carbs={highlightedMealsTotals.carbs}
        fats={highlightedMealsTotals.fats}
        shoppingItems={shoppingList.length}
      />
    </div>
  ) : null;

  const pageContent = (
    <div className="page">
      {!isManualView ? (
        <>
          

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
                  {isOutOfTokens ? (
                    <ButtonLink variant="ghost" href="/app/settings/billing">
                      {t("billing.manageBilling")}
                    </ButtonLink>
                  ) : null}
                </div>
                {isOutOfTokens ? <p className="muted mt-8">{t("ai.insufficientTokens")}</p> : null}
              </div>
            </section>
          ) : hasPlan ? (
            <>
              <section className="card">
            <div className="section-head section-head-actions">
              <div>
                <h2 className="section-title section-title-sm">{t("nutrition.formTitle")}</h2>
                <p className="section-subtitle">{t("nutrition.tips")}</p>
              </div>

              <div className="section-actions plan-page-actions">
                {/* <button type="button" className="btn" disabled={!plan} onClick={() => loadProfile({ current: true })}>
                  {t("nutrition.generate")}
                </button> 
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

            {isAiLocked ? (
              <AiModuleUpgradeCTA
                title={t("aiLockedTitle")}
                description={aiLockDescription}
                buttonLabel={t("billing.upgradePro")}
              />
            ) : null}

            {!isAiLocked && isOutOfTokens ? (
              <div className="status-card status-card--warning" role="alert" aria-live="polite">
                <p className="muted m-0">{t("ai.insufficientTokens")}</p>
                <div className="inline-actions-sm mt-12">
                  <Link href="/app/settings/billing" className="btn secondary fit-content">
                    {t("billing.manageBilling")}
                  </Link>
                </div>
              </div>
            ) : null}

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
            ) : aiError ? (
              <div className="status-card status-card--warning" role="alert" aria-live="polite">
                <div className="inline-actions-sm">
                  <Icon name="warning" />
                  <strong>{aiError.title}</strong>
                </div>
                <p className="muted">{aiError.description}</p>
                {aiError.actionableHint ? <p className="muted">{aiError.actionableHint}</p> : null}
                {aiError.details ? (
                  <details>
                    <summary>{t("nutrition.aiErrorState.detailsCta")}</summary>
                    <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>{aiError.details}</pre>
                  </details>
                ) : null}
                <div className="inline-actions-sm">
                  <button type="button" className="btn secondary fit-content" onClick={handleRetry} disabled={!aiError.canRetry || aiLoading}>
                    {t("ui.retry")}
                  </button>
                  <button type="button" className="btn secondary fit-content" onClick={() => void handleAiPlan("simple")} disabled={aiLoading}>
                    {t("nutrition.aiErrorState.generateSimple")}
                  </button>
                  <Link href="/app/nutricion/editar" className="btn secondary fit-content">
                    {t("nutrition.aiErrorState.adjustGoals")}
                  </Link>
                </div>
                {!aiError.canRetry ? <p className="muted">{t("nutrition.aiErrorState.retryLimit")}</p> : null}
              </div>
            ) : saveMessage ? (
              <p className="muted">{saveMessage}</p>
            ) : null}
          </section>

              {!loading && !error ? (
                <section className="card nutrition-v2-layout" ref={generatedPlanSectionRef}>
                  <HeaderCompact
                    title={t("nutrition.dailyTargetTitle")}
                    subtitle={highlightedDay?.dayLabel ?? t("nutrition.viewToday")}
                    trailing={(
                      <Button className="nutrition-dominant-cta" loading={aiLoading} onClick={handleGenerateClick} disabled={isAiDisabled}>
                        {aiLoading ? t("nutrition.aiGenerating") : t("nutrition.aiGenerate")}
                      </Button>
                    )}
                  />

                  <HeroNutrition title={t("nutrition.dailyTargetTitle")} calories={highlightedMealsTotals.calories} segments={macroRingSegments} />

                  <ObjectiveGrid items={objectiveItems} className="nutrition-v2-objective-grid" />

                  <div className="nutrition-v2-calendar-head">
                    <h3 className="section-title section-title-sm m-0">{t("nutrition.calendarTitle")}</h3>
                    <SegmentedControl
                      options={calendarOptions.map((option) => ({ id: option.value, label: option.label }))}
                      value={calendarView}
                      onChange={(id) => setCalendarView(id as typeof calendarView)}
                      ariaLabel={t("nutrition.calendarViewToggleAria")}
                    />
                  </div>

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
                              onClick={() => setSelectedDate(date)}
                              aria-label={t("nutrition.selectDayAria", { date: date.toLocaleDateString(localeCode, { weekday: "long", day: "numeric", month: "long" }) })}
                            >
                              <span>{date.getDate()}</span>
                              {entry ? <span className="calendar-dot" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {calendarView === "week" ? (
                    <WeeklyCalendar
                      previousWeekLabel={t("calendar.previousWeek")}
                      nextWeekLabel={t("calendar.nextWeek")}
                      previousWeekAriaLabel={t("calendar.previousWeekAria")}
                      nextWeekAriaLabel={t("calendar.nextWeekAria")}
                      weekLabel={t("nutrition.weekLabel")}
                      weekNumber={clampedWeekOffset + 1}
                      weekRangeLabel={`${weekStart.toLocaleDateString(localeCode, { month: "short", day: "numeric" })} → ${addDays(weekStart, 6).toLocaleDateString(localeCode, { month: "short", day: "numeric" })}`}
                      nextWeekDisabled={weekOffset >= maxProjectedWeeksAhead}
                      hasWeeklyMeals={hasWeeklyMeals}
                      emptyTitle={t("nutrition.weeklyEmptyTitle")}
                      emptySubtitle={t("nutrition.weeklyEmptySubtitle")}
                      days={weekGridDays}
                      kcalLabel={t("units.kcal")}
                      onPreviousWeek={() => setSelectedDate((prev) => addWeeks(prev, -1))}
                      onNextWeek={() => setSelectedDate((prev) => addWeeks(prev, 1))}
                      onSelectDay={(dayId) => {
                        const nextDate = parseDate(dayId);
                        if (nextDate) setSelectedDate(nextDate);
                      }}
                      selectWeekDayAria={(day) =>
                        t("nutrition.selectWeekDayAria", {
                          day: day.label,
                          meals: day.mealCount,
                          calories: Math.round(day.dayCalories),
                        })
                      }
                    />
                  ) : null}

                  <div className="nutrition-v2-meals">
                    <h3 className="section-title section-title-sm m-0">{t("nutrition.mealsTitle")}</h3>
                    <div className="nutrition-meal-list nutrition-meal-list-v2">
                      {highlightedMeals.length > 0 ? (
                        highlightedMeals.map((meal, mealIndex) => {
                          const mealKey = getMealKey(meal, highlightedDay?.dayLabel ?? "meal", mealIndex);
                          return (
                            <MealCard
                              key={mealKey}
                              title={getMealTitle(meal, t)}
                              description={getMealDescription(meal)}
                              meta={`${meal.macros.calories} ${t("units.kcal")}`}
                              imageUrl={getMealMediaUrl(meal)}
                              onClick={() => openMealDetail(meal, highlightedDayKey, mealKey, highlightedDay?.dayLabel)}
                              className="meal-card--horizontal"
                            />
                          );
                        })
                      ) : (
                        <p className="muted">{t("nutrition.emptySubtitle")}</p>
                      )}
                    </div>
                  </div>

                  {calendarView === "list" ? (
                    <div className="nutrition-meal-list mt-12">
                      {visiblePlanEntries.length > 0 ? (
                        visiblePlanEntries.map((entry) => (
                          <div key={`${entry.day.dayLabel}-${toDateKey(entry.date)}`} className="feature-card stack-sm">
                            <div className="inline-actions-space">
                              <strong>{entry.date.toLocaleDateString(localeCode, { weekday: "short", day: "numeric", month: "short" })}</strong>
                              <span className="badge">{entry.day.dayLabel}</span>
                            </div>
                            {entry.day.meals.length > 0 ? (
                              <div className="nutrition-meal-list">
                                {entry.day.meals.map((meal, mealIndex) => {
                                  const dayKey = toDateKey(entry.date);
                                  const mealKey = getMealKey(meal, dayKey, mealIndex);
                                  return (
                                    <MealCard
                                      key={mealKey}
                                      title={getMealTitle(meal, t)}
                                      description={getMealDescription(meal)}
                                      meta={`${meal.macros.calories} ${t("units.kcal")}`}
                                      imageUrl={getMealMediaUrl(meal)}
                                      onClick={() => {
                                        setSelectedDate(entry.date);
                                        openMealDetail(meal, dayKey, mealKey, entry.day.dayLabel);
                                      }}
                                      className="meal-card--horizontal"
                                    />
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="muted">{t("nutrition.emptySubtitle")}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="muted">{t("nutrition.emptySubtitle")}</p>
                      )}
                    </div>
                  ) : null}

                  <div className="nutrition-v2-shopping">
                    <div className="inline-actions-space">
                      <h3 className="section-title section-title-sm m-0">{t("nutrition.shoppingTitle")}</h3>
                      <button
                        type="button"
                        className="btn secondary fit-content"
                        onClick={() => visiblePlan && buildShoppingList(visiblePlan)}
                      >
                        {t("nutrition.shoppingGenerate")}
                      </button>
                    </div>
                    {shoppingList.length > 0 ? (
                      <Accordion
                        items={[
                          {
                            id: "shopping-list",
                            title: t("nutrition.shoppingTitle"),
                            subtitle: `${shoppingList.length} items`,
                            content: (
                              <ul className="list-reset nutrition-shopping-list-v2">
                                {shoppingList.map((item) => (
                                  <li key={item.name}>
                                    <span>{item.name}</span>
                                    <strong>{item.grams} g</strong>
                                  </li>
                                ))}
                              </ul>
                            ),
                          },
                        ]}
                      />
                    ) : null}
                  </div>
                </section>
              ) : null}

              {!loading && !error ? nutritionPlanDetails : null}

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
        open={aiSuccessModalOpen}
        onClose={handleCloseAiSuccessModal}
        title={t("nutrition.aiSuccessModal.title")}
        description={t("nutrition.aiSuccessModal.description")}
        footer={(
          <div className="inline-actions-sm">
            <Button variant="secondary" onClick={handleCloseAiSuccessModal}>{t("nutrition.aiSuccessModal.close")}</Button>
            <Button onClick={handleViewGeneratedPlan}>{t("nutrition.aiSuccessModal.viewPlan")}</Button>
          </div>
        )}
      >
        {lastGeneratedAiPlan ? (
          <div className="stack-md">
            <div className="feature-card">
              <p className="m-0"><strong>{t("nutrition.aiSuccessModal.summaryTitle")}</strong></p>
              <ul className="list-muted-sm mt-8">
                <li>{t("nutrition.aiSuccessModal.planTitle")}: {lastGeneratedAiPlan.title?.trim() || "-"}</li>
                <li>{t("nutrition.aiSuccessModal.startDate")}: {formatDate(lastGeneratedAiPlan.startDate)}</li>
                <li>{t("nutrition.aiSuccessModal.daysCount")}: {lastGeneratedAiPlan.days.length}</li>
                <li>{t("nutrition.aiSuccessModal.targetCalories")}: {lastGeneratedAiPlan.dailyCalories} {t("units.kcal")}</li>
                <li>
                  {t("nutrition.aiSuccessModal.targetMacros")}: {lastGeneratedAiPlan.proteinG}{t("nutrition.grams")}/
                  {lastGeneratedAiPlan.carbsG}{t("nutrition.grams")}/
                  {lastGeneratedAiPlan.fatG}{t("nutrition.grams")}
                </li>
              </ul>
            </div>

            {generatedPlanPreviewDay ? (
              <div className="feature-card">
                <p className="m-0"><strong>{t("nutrition.aiSuccessModal.dayPreviewTitle")}</strong></p>
                <p className="muted mt-4 mb-0">{generatedPlanPreviewDay.day.dayLabel}</p>
                <ul className="list-muted-sm mt-8">
                  {generatedPlanPreviewDay.day.meals.map((meal, index) => (
                    <li key={`${meal.title}-${index}`}>
                      {getMealTitle(meal, t)} · {meal.macros.calories} {t("units.kcal")} · P {meal.macros.protein}{t("nutrition.grams")} · C {meal.macros.carbs}{t("nutrition.grams")} · G {meal.macros.fats}{t("nutrition.grams")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(lastGeneratedMode === "FALLBACK" || typeof lastGeneratedUsage?.totalTokens === "number" || typeof lastGeneratedUsage?.promptTokens === "number" || typeof lastGeneratedUsage?.completionTokens === "number" || typeof lastGeneratedUsage?.balanceAfter === "number") ? (
              <div className="feature-card">
                <p className="m-0"><strong>{t("nutrition.aiSuccessModal.aiBlockTitle")}</strong></p>
                <ul className="list-muted-sm mt-8">
                  <li>
                    {t("nutrition.aiSuccessModal.tokensUsed")}: {lastGeneratedMode === "FALLBACK"
                      ? t("nutrition.aiSuccessModal.fallbackTokens")
                      : (lastGeneratedUsage?.totalTokens ?? t("nutrition.aiSuccessModal.notAvailable"))}
                  </li>
                  {typeof lastGeneratedUsage?.promptTokens === "number" ? (
                    <li>{t("nutrition.aiSuccessModal.promptTokens")}: {lastGeneratedUsage.promptTokens}</li>
                  ) : null}
                  {typeof lastGeneratedUsage?.completionTokens === "number" ? (
                    <li>{t("nutrition.aiSuccessModal.completionTokens")}: {lastGeneratedUsage.completionTokens}</li>
                  ) : null}
                  {lastGeneratedAiRequestId ? (
                    <li>{t("nutrition.aiSuccessModal.aiRequestId")}: {lastGeneratedAiRequestId}</li>
                  ) : null}
                  <li>{t("nutrition.aiSuccessModal.currentBalance")}: {lastGeneratedUsage?.balanceAfter ?? lastGeneratedTokensBalance ?? aiTokenBalance ?? "-"}</li>
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

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

  return <AppLayout main={pageContent} rightPanel={rightPanel} />;
}
