"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import type { Locale } from "@/lib/i18n";
import {
  type Activity,
  type Goal,
  type MealDistribution,
  type NutritionDietType,
  type NutritionCookingTime,
  type ProfileData,
  type NutritionPlanData,
} from "@/lib/profile";
import { getUserProfile, updateUserProfile } from "@/lib/profileService";
import { isProfileComplete } from "@/lib/profileCompletion";

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
  description: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  ingredients: { name: string; grams: number }[];
};

type DayPlan = {
  dayLabel: string;
  meals: Meal[];
};

type NutritionPlan = NutritionPlanData;

type NutritionPlanClientProps = {
  mode?: "suggested" | "manual";
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
  name: string;
  protein: number;
  carbs: number;
  fat: number;
};

type MealTemplate = {
  title: string;
  description: string;
  protein: IngredientProfile;
  carbs?: IngredientProfile;
  fat?: IngredientProfile;
  veg?: IngredientProfile;
};

const INGREDIENT_PROFILES: Record<Locale, Record<string, IngredientProfile>> = {
  es: {
    salmon: { name: "Salmón", protein: 20, carbs: 0, fat: 13 },
    chicken: { name: "Pollo", protein: 31, carbs: 0, fat: 3.6 },
    turkey: { name: "Pavo", protein: 29, carbs: 0, fat: 2 },
    eggs: { name: "Huevos", protein: 13, carbs: 1.1, fat: 10 },
    yogurt: { name: "Yogur griego", protein: 10, carbs: 4, fat: 4 },
    oats: { name: "Avena", protein: 17, carbs: 66, fat: 7 },
    rice: { name: "Arroz integral", protein: 2.7, carbs: 28, fat: 0.3 },
    quinoa: { name: "Quinoa", protein: 4.4, carbs: 21, fat: 1.9 },
    chickpeas: { name: "Garbanzos", protein: 9, carbs: 27, fat: 2.6 },
    potatoes: { name: "Patata", protein: 2, carbs: 17, fat: 0.1 },
    zucchini: { name: "Calabacín", protein: 1.2, carbs: 3.1, fat: 0.3 },
    avocado: { name: "Aguacate", protein: 2, carbs: 9, fat: 15 },
    oliveOil: { name: "Aceite de oliva", protein: 0, carbs: 0, fat: 100 },
    berries: { name: "Frutos rojos", protein: 1, carbs: 12, fat: 0.3 },
    milk: { name: "Leche", protein: 3.3, carbs: 5, fat: 3.2 },
    bread: { name: "Pan integral", protein: 13, carbs: 43, fat: 4 },
  },
  en: {
    salmon: { name: "Salmon", protein: 20, carbs: 0, fat: 13 },
    chicken: { name: "Chicken", protein: 31, carbs: 0, fat: 3.6 },
    turkey: { name: "Turkey", protein: 29, carbs: 0, fat: 2 },
    eggs: { name: "Eggs", protein: 13, carbs: 1.1, fat: 10 },
    yogurt: { name: "Greek yogurt", protein: 10, carbs: 4, fat: 4 },
    oats: { name: "Oats", protein: 17, carbs: 66, fat: 7 },
    rice: { name: "Brown rice", protein: 2.7, carbs: 28, fat: 0.3 },
    quinoa: { name: "Quinoa", protein: 4.4, carbs: 21, fat: 1.9 },
    chickpeas: { name: "Chickpeas", protein: 9, carbs: 27, fat: 2.6 },
    potatoes: { name: "Potato", protein: 2, carbs: 17, fat: 0.1 },
    zucchini: { name: "Zucchini", protein: 1.2, carbs: 3.1, fat: 0.3 },
    avocado: { name: "Avocado", protein: 2, carbs: 9, fat: 15 },
    oliveOil: { name: "Olive oil", protein: 0, carbs: 0, fat: 100 },
    berries: { name: "Berries", protein: 1, carbs: 12, fat: 0.3 },
    milk: { name: "Milk", protein: 3.3, carbs: 5, fat: 3.2 },
    bread: { name: "Whole-grain bread", protein: 13, carbs: 43, fat: 4 },
  },
};

const MEAL_TEMPLATES: Record<Locale, Record<string, MealTemplate[]>> = {
  es: {
    breakfast: [
      {
        title: "Avena con fruta",
        description: "Avena, yogur natural, frutos rojos y semillas.",
        protein: INGREDIENT_PROFILES.es.yogurt,
        carbs: INGREDIENT_PROFILES.es.oats,
        fat: INGREDIENT_PROFILES.es.oliveOil,
        veg: INGREDIENT_PROFILES.es.berries,
      },
      {
        title: "Tostadas con huevo",
        description: "Pan integral, huevos revueltos y aguacate.",
        protein: INGREDIENT_PROFILES.es.eggs,
        carbs: INGREDIENT_PROFILES.es.bread,
        fat: INGREDIENT_PROFILES.es.avocado,
      },
    ],
    lunch: [
      {
        title: "Pollo con arroz",
        description: "Pechuga a la plancha, arroz integral y ensalada.",
        protein: INGREDIENT_PROFILES.es.chicken,
        carbs: INGREDIENT_PROFILES.es.rice,
        veg: INGREDIENT_PROFILES.es.zucchini,
      },
      {
        title: "Bowl mediterráneo",
        description: "Quinoa, garbanzos, verduras y aceite de oliva.",
        protein: INGREDIENT_PROFILES.es.chickpeas,
        carbs: INGREDIENT_PROFILES.es.quinoa,
        fat: INGREDIENT_PROFILES.es.oliveOil,
        veg: INGREDIENT_PROFILES.es.zucchini,
      },
    ],
    dinner: [
      {
        title: "Salmón con verduras",
        description: "Salmón al horno, calabacín y patata.",
        protein: INGREDIENT_PROFILES.es.salmon,
        carbs: INGREDIENT_PROFILES.es.potatoes,
        veg: INGREDIENT_PROFILES.es.zucchini,
      },
      {
        title: "Salteado rápido",
        description: "Pavo, verduras mixtas y noodles integrales.",
        protein: INGREDIENT_PROFILES.es.turkey,
        carbs: INGREDIENT_PROFILES.es.rice,
        veg: INGREDIENT_PROFILES.es.zucchini,
      },
    ],
    snack: [
      {
        title: "Snack proteico",
        description: "Yogur griego con frutos secos.",
        protein: INGREDIENT_PROFILES.es.yogurt,
        fat: INGREDIENT_PROFILES.es.avocado,
        carbs: INGREDIENT_PROFILES.es.berries,
      },
      {
        title: "Batido",
        description: "Leche, fruta y proteína en polvo.",
        protein: INGREDIENT_PROFILES.es.milk,
        carbs: INGREDIENT_PROFILES.es.berries,
        fat: INGREDIENT_PROFILES.es.oliveOil,
      },
    ],
  },
  en: {
    breakfast: [
      {
        title: "Oats with fruit",
        description: "Oats, plain yogurt, berries, and seeds.",
        protein: INGREDIENT_PROFILES.en.yogurt,
        carbs: INGREDIENT_PROFILES.en.oats,
        fat: INGREDIENT_PROFILES.en.oliveOil,
        veg: INGREDIENT_PROFILES.en.berries,
      },
      {
        title: "Egg toast",
        description: "Whole-grain toast, scrambled eggs, and avocado.",
        protein: INGREDIENT_PROFILES.en.eggs,
        carbs: INGREDIENT_PROFILES.en.bread,
        fat: INGREDIENT_PROFILES.en.avocado,
      },
    ],
    lunch: [
      {
        title: "Chicken with rice",
        description: "Grilled chicken breast, brown rice, and salad.",
        protein: INGREDIENT_PROFILES.en.chicken,
        carbs: INGREDIENT_PROFILES.en.rice,
        veg: INGREDIENT_PROFILES.en.zucchini,
      },
      {
        title: "Mediterranean bowl",
        description: "Quinoa, chickpeas, veggies, and olive oil.",
        protein: INGREDIENT_PROFILES.en.chickpeas,
        carbs: INGREDIENT_PROFILES.en.quinoa,
        fat: INGREDIENT_PROFILES.en.oliveOil,
        veg: INGREDIENT_PROFILES.en.zucchini,
      },
    ],
    dinner: [
      {
        title: "Salmon with veggies",
        description: "Baked salmon, zucchini, and potato.",
        protein: INGREDIENT_PROFILES.en.salmon,
        carbs: INGREDIENT_PROFILES.en.potatoes,
        veg: INGREDIENT_PROFILES.en.zucchini,
      },
      {
        title: "Quick stir-fry",
        description: "Turkey, mixed veggies, and whole-grain noodles.",
        protein: INGREDIENT_PROFILES.en.turkey,
        carbs: INGREDIENT_PROFILES.en.rice,
        veg: INGREDIENT_PROFILES.en.zucchini,
      },
    ],
    snack: [
      {
        title: "Protein snack",
        description: "Greek yogurt with nuts.",
        protein: INGREDIENT_PROFILES.en.yogurt,
        fat: INGREDIENT_PROFILES.en.avocado,
        carbs: INGREDIENT_PROFILES.en.berries,
      },
      {
        title: "Shake",
        description: "Milk, fruit, and protein powder.",
        protein: INGREDIENT_PROFILES.en.milk,
        carbs: INGREDIENT_PROFILES.en.berries,
        fat: INGREDIENT_PROFILES.en.oliveOil,
      },
    ],
  },
};

export const DAY_LABELS: Record<Locale, string[]> = {
  es: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

function getTodayIndex(totalDays: number) {
  if (totalDays <= 1) return 0;
  const today = new Date();
  const mondayIndex = (today.getDay() + 6) % 7;
  return mondayIndex % totalDays;
}

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
  form: NutritionForm
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
      template.title,
      template.description,
      template.protein.name,
      template.carbs?.name,
      template.fat?.name,
      template.veg?.name,
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
    const aText = `${a.title} ${a.description}`.toLowerCase();
    const bText = `${b.title} ${b.description}`.toLowerCase();
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
  targetFat: number
) {
  const ingredients: { name: string; grams: number }[] = [];
  const proteinGrams = gramsForMacro(targetProtein, template.protein.protein);
  const proteinFat = (proteinGrams * template.protein.fat) / 100;
  const proteinCarbs = (proteinGrams * template.protein.carbs) / 100;
  ingredients.push({ name: template.protein.name, grams: proteinGrams });

  const remainingCarbs = Math.max(0, targetCarbs - proteinCarbs);
  if (template.carbs) {
    const carbsGrams = gramsForMacro(remainingCarbs, template.carbs.carbs);
    ingredients.push({ name: template.carbs.name, grams: carbsGrams });
  }

  const remainingFat = Math.max(0, targetFat - proteinFat);
  if (template.fat) {
    const fatGrams = gramsForMacro(remainingFat, template.fat.fat);
    ingredients.push({ name: template.fat.name, grams: fatGrams });
  }

  if (template.veg) {
    ingredients.push({ name: template.veg.name, grams: 150 });
  }

  return ingredients;
}

function calculatePlan(
  form: NutritionForm,
  mealTemplates: Record<string, MealTemplate[]>,
  dayLabels: string[]
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
      const options = filterMealTemplates(mealTemplates[slot], form);
      const option = options[(dayIndex + slotIndex) % options.length];
      const weight = distributionWeights[slotIndex] ?? 1 / mealsOrder.length;
      const mealProtein = proteinG * weight;
      const mealCarbs = carbsG * weight;
      const mealFat = fatG * weight;
      return {
        type: slot as Meal["type"],
        title: `${slotIndex + 1}. ${option.title}`,
        description: option.description,
        macros: {
          calories: round(mealProtein * 4 + mealCarbs * 4 + mealFat * 9),
          protein: round(mealProtein),
          carbs: round(mealCarbs),
          fats: round(mealFat),
        },
        ingredients: buildMealIngredients(option, mealProtein, mealCarbs, mealFat),
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
  if (plan.days.length >= dayLabels.length) return plan;
  const nextDays = [...plan.days];
  let index = 0;
  while (nextDays.length < dayLabels.length) {
    const source = plan.days[index % plan.days.length];
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const mealTemplates = MEAL_TEMPLATES[locale];
  const dayLabels = DAY_LABELS[locale];
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<"FREE" | "PRO" | null>(null);
  const [aiTokenBalance, setAiTokenBalance] = useState<number | null>(null);
  const [aiTokenRenewalAt, setAiTokenRenewalAt] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [savedPlan, setSavedPlan] = useState<NutritionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [manualPlan, setManualPlan] = useState<NutritionPlan | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showWeek, setShowWeek] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const autoGenerated = useRef(false);
  const isManualView = mode === "manual";
  const isPro = subscriptionPlan === "PRO";

  const loadProfile = async (activeRef: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile();
      if (!activeRef.current) return;
      setProfile(data);
      setSavedPlan(data.nutritionPlan ?? null);
    } catch {
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
        setSubscriptionPlan("FREE");
        return;
      }
      const data = (await response.json()) as {
        subscriptionPlan?: "FREE" | "PRO";
        aiTokenBalance?: number;
        aiTokenRenewalAt?: string | null;
      };
      setSubscriptionPlan(data.subscriptionPlan ?? "FREE");
      setAiTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      window.dispatchEvent(new Event("auth:refresh"));
    } catch {
      setSubscriptionPlan("FREE");
    }
  };

  useEffect(() => {
    void refreshSubscription();
  }, []);

  const plan = useMemo(() => {
    if (!profile) return null;
    return calculatePlan(
      {
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activity: profile.activity,
        goal: profile.goal,
        mealsPerDay: profile.nutritionPreferences.mealsPerDay,
        dietType: profile.nutritionPreferences.dietType,
        allergies: profile.nutritionPreferences.allergies,
        preferredFoods: profile.nutritionPreferences.preferredFoods,
        dislikedFoods: profile.nutritionPreferences.dislikedFoods,
        dietaryPrefs: profile.nutritionPreferences.dietaryPrefs,
        cookingTime: profile.nutritionPreferences.cookingTime,
        mealDistribution: profile.nutritionPreferences.mealDistribution,
      },
      mealTemplates,
      dayLabels
    );
  }, [profile, mealTemplates, dayLabels]);
  const visiblePlan = useMemo(
    () => normalizeNutritionPlan(isManualView ? savedPlan ?? plan : savedPlan, dayLabels),
    [isManualView, savedPlan, plan, dayLabels]
  );

  useEffect(() => {
    if (!manualPlan && visiblePlan) {
      setManualPlan(visiblePlan);
    }
  }, [manualPlan, visiblePlan]);

  useEffect(() => {
    if (!visiblePlan?.days.length) return;
    setActiveDayIndex(getTodayIndex(visiblePlan.days.length));
  }, [visiblePlan?.days.length]);

  function buildShoppingList(activePlan: NutritionPlan) {
    const totals: Record<string, number> = {};
    activePlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        meal.ingredients.forEach((ingredient) => {
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
        meal.ingredients.forEach((ingredient) => {
          totals[ingredient.name] = (totals[ingredient.name] || 0) + ingredient.grams;
        });
      });
    });
    return Object.entries(totals).map(([name, grams]) => ({
      name,
      grams: Math.round(grams),
    }));
  }

  const handleSavePlan = async () => {
    if (!plan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const planToSave: NutritionPlan = {
        ...plan,
        shoppingList: shoppingList.length > 0 ? shoppingList : undefined,
      };
      const updated = await updateUserProfile({ nutritionPlan: planToSave });
      setSavedPlan(updated.nutritionPlan ?? planToSave);
      setSaveMessage(t("nutrition.savePlanSuccess"));
    } catch {
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
      const updated = await updateUserProfile({ nutritionPlan: manualPlan });
      setSavedPlan(updated.nutritionPlan ?? manualPlan);
      setSaveMessage(t("nutrition.manualSaveSuccess"));
    } catch {
      setSaveMessage(t("nutrition.savePlanError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
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
      const ingredients = [...meal.ingredients, { name: "", grams: 0 }];
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
      const ingredients = [...meal.ingredients];
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
      const ingredients = meal.ingredients.filter((_, index) => index !== ingredientIndex);
      meals[mealIndex] = { ...meal, ingredients };
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  }

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string };
      if (!response.ok || !data.url) {
        setError(t("pro.checkoutError"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("pro.checkoutError"));
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleAiPlan = async () => {
    if (!profile || aiLoading) return;
    if (!isPro) {
      setError(t("pro.aiLockedHint"));
      return;
    }
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=nutrition&next=/app/nutricion");
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const mealsPerDay = Math.min(6, Math.max(3, profile.nutritionPreferences.mealsPerDay));
      const calories = plan?.dailyCalories ?? 2000;
      const response = await fetch("/api/ai/nutrition-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: profile.name || undefined,
          age: profile.age,
          sex: profile.sex,
          goal: profile.goal,
          mealsPerDay,
          calories,
          dietType: profile.nutritionPreferences.dietType,
          allergies: profile.nutritionPreferences.allergies,
          preferredFoods: profile.nutritionPreferences.preferredFoods,
          dislikedFoods: profile.nutritionPreferences.dislikedFoods,
          mealDistribution: profile.nutritionPreferences.mealDistribution,
          dietaryRestrictions:
            profile.nutritionPreferences.dietaryPrefs ||
            profile.nutritionPreferences.dislikedFoods ||
            undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; retryAfterSec?: number }
          | null;
        if (payload?.error === "INSUFFICIENT_TOKENS") {
          throw new Error(t("ai.insufficientTokens"));
        }
        if (payload?.error === "NOT_PRO") {
          throw new Error(t("ai.notPro"));
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
      const updated = await updateUserProfile({ nutritionPlan: generatedPlan });
      setSavedPlan(updated.nutritionPlan ?? generatedPlan);
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
    if (!isPro) return;
    if (autoGenerated.current) return;
    if (searchParams.get("ai") !== "1") return;
    autoGenerated.current = true;
    void handleAiPlan();
  }, [profile, searchParams, isPro]);

  const handleGenerateClick = () => {
    if (!profile) return;
    if (!isPro) {
      setError(t("pro.aiLockedHint"));
      return;
    }
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=nutrition&next=/app/nutricion");
      return;
    }
    void handleAiPlan();
  };

  const handlePrevDay = () => {
    if (!visiblePlan?.days.length) return;
    setActiveDayIndex((prev) => (prev - 1 + visiblePlan.days.length) % visiblePlan.days.length);
  };

  const handleNextDay = () => {
    if (!visiblePlan?.days.length) return;
    setActiveDayIndex((prev) => (prev + 1) % visiblePlan.days.length);
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
        const ingredients = meal.ingredients
          .map((ingredient) => `${ingredient.name} ${ingredient.grams}g`)
          .join(" | ");
        rows.push([
          day.dayLabel,
          meal.type,
          meal.title,
          meal.description,
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
    } catch {
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

  return (
    <div className="page">
      {!isManualView && subscriptionPlan === "FREE" ? (
        <section className="card ai-card">
          <div className="ai-card-content">
            <div>
              <p className="ai-card-eyebrow">PRO</p>
              <h3 style={{ margin: 0 }}>{t("pro.aiLockedTitle")}</h3>
              <p className="muted" style={{ marginTop: 6 }}>
                {t("pro.aiLockedSubtitle")}
              </p>
            </div>
            <div className="ai-card-actions">
              <button type="button" className="btn" onClick={handleUpgrade} disabled={upgradeLoading}>
                {upgradeLoading ? "..." : t("pro.aiLockedCta")}
              </button>
            </div>
          </div>
        </section>
      ) : null}
      {!isManualView ? (
        <>
          <section className="card">
            <div className="section-head section-head-actions">
              <div>
                <h2 className="section-title" style={{ fontSize: 20 }}>{t("nutrition.formTitle")}</h2>
                <p className="section-subtitle">{t("nutrition.tips")}</p>
              </div>

              <div className="section-actions">
                {/* <button type="button" className="btn" disabled={!plan} onClick={() => loadProfile({ current: true })}>
                  {t("nutrition.generate")}
                </button> */}
                <button
                  type="button"
                  className="btn"
                  disabled={!plan || aiLoading || !isPro}
                  title={!isPro ? t("pro.aiLockedHint") : undefined}
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
              <p className="muted" style={{ marginTop: 8 }}>
                {t("ai.tokensRemaining")} {aiTokenBalance}
                {aiTokenRenewalAt ? ` · ${t("ai.tokensReset")} ${formatDate(aiTokenRenewalAt)}` : ""}
              </p>
            ) : null}

            {exportMessage && (
              <p className="muted" style={{ marginTop: 8 }}>{exportMessage}</p>
            )}

            <div className="export-actions" style={{ marginTop: 12 }}>
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
              <p className="muted">{t("nutrition.profileLoading")}</p>
            ) : error ? (
              <p className="muted">{error}</p>
            ) : saveMessage ? (
              <p className="muted">{saveMessage}</p>
            ) : profile ? (
              <>
                <div className="badge-list">
                  <span className="badge">
                    {t("macros.goal")}: {t(profile.goal === "cut" ? "macros.goalCut" : profile.goal === "bulk" ? "macros.goalBulk" : "macros.goalMaintain")}
                  </span>
                  <span className="badge">{t("nutrition.mealsPerDay")}: {profile.nutritionPreferences.mealsPerDay}</span>
                  <span className="badge">
                    {t("nutrition.cookingTime")}: {t(profile.nutritionPreferences.cookingTime === "quick" ? "nutrition.cookingTimeOptionQuick" : profile.nutritionPreferences.cookingTime === "long" ? "nutrition.cookingTimeOptionLong" : "nutrition.cookingTimeOptionMedium")}
                  </span>
                </div>

                <div className="info-grid" style={{ marginTop: 16 }}>
                  <div className="info-item">
                    <div className="info-label">{t("macros.weight")}</div>
                    <div className="info-value">{profile.weightKg} kg</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">{t("macros.height")}</div>
                    <div className="info-value">{profile.heightCm} cm</div>
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

            <p className="muted" style={{ marginTop: 12 }}>
              {t("nutrition.preferencesHint")}
            </p>
          </section>

          {!loading && !error && !hasPlan ? (
            <section className="card">
              <div className="empty-state">
                <h3 style={{ marginTop: 0 }}>{t("nutrition.emptyTitle")}</h3>
                <p className="muted">{t("nutrition.emptySubtitle")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn"
                      disabled={aiLoading || !isPro}
                      title={!isPro ? t("pro.aiLockedHint") : undefined}
                      onClick={handleGenerateClick}
                    >
                      {aiLoading ? t("nutrition.aiGenerating") : t("nutrition.aiGenerate")}
                    </button>
                  <Link href="/app/nutricion/editar" className="btn secondary">
                    {t("nutrition.manualCreate")}
                  </Link>
                </div>
              </div>
            </section>
          ) : hasPlan ? (
            <>
              <section className="card">
                <div className="section-head section-head-actions">
                  <div>
                    <h2 className="section-title" style={{ fontSize: 20 }}>{t("nutrition.todayTitle")}</h2>
                    <p className="section-subtitle">{t("nutrition.todaySubtitle")}</p>
                  </div>
                  <div className="section-actions">
                    <button type="button" className="btn secondary" onClick={() => setShowWeek((prev) => !prev)}>
                      {showWeek ? t("nutrition.viewToday") : t("nutrition.viewWeek")}
                    </button>
                  </div>
                </div>

                {!showWeek ? (
                  <div
                    role="presentation"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    style={{ display: "grid", gap: 12, marginTop: 12 }}
                  >
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                      {visiblePlan?.days.map((day, index) => (
                        <button
                          key={`${day.dayLabel}-${index}`}
                          type="button"
                          className={`badge ${index === activeDayIndex ? "active" : ""}`}
                          onClick={() => setActiveDayIndex(index)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {day.dayLabel}
                        </button>
                      ))}
                    </div>
                    <div className="section-head" style={{ marginBottom: 0 }}>
                      <div>
                        <strong>{visiblePlan?.days[activeDayIndex]?.dayLabel}</strong>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="btn secondary" onClick={handlePrevDay}>
                          {t("nutrition.dayPrev")}
                        </button>
                        <button type="button" className="btn secondary" onClick={handleNextDay}>
                          {t("nutrition.dayNext")}
                        </button>
                      </div>
                    </div>
                    <div className="list-grid">
                      {visiblePlan?.days[activeDayIndex]?.meals.map((meal) => (
                        <div key={meal.title} className="feature-card">
                          <strong>{meal.title}</strong>
                          <p className="muted" style={{ marginTop: 6 }}>{meal.description}</p>
                          <div style={{ marginTop: 8 }} className="muted">
                            {t("nutrition.ingredients")}:
                          </div>
                          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                            {meal.ingredients.map((ingredient) => (
                              <li key={ingredient.name}>
                                {ingredient.name}: {ingredient.grams} {t("nutrition.grams")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="list-grid" style={{ marginTop: 16 }}>
                    {visiblePlan?.days.map((day) => (
                      <div key={day.dayLabel} className="feature-card">
                        <strong>{day.dayLabel}</strong>
                        <div className="table-grid" style={{ marginTop: 8 }}>
                          {day.meals.map((meal) => (
                            <div key={meal.title}>
                              <div style={{ fontWeight: 600 }}>{meal.title}</div>
                              <div className="muted">{meal.description}</div>
                              <div style={{ marginTop: 6 }} className="muted">
                                {t("nutrition.ingredients")}:
                              </div>
                              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                                {meal.ingredients.map((ingredient) => (
                                  <li key={ingredient.name}>
                                    {ingredient.name}: {ingredient.grams} {t("nutrition.grams")}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card">
                <h2 className="section-title" style={{ fontSize: 20 }}>{t("nutrition.dailyTargetTitle")}</h2>
                <div className="info-grid" style={{ marginTop: 16 }}>
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
                <h2 className="section-title" style={{ fontSize: 20 }}>{t("nutrition.shoppingTitle")}</h2>
                <button
                  type="button"
                  className="btn"
                  onClick={() => visiblePlan && buildShoppingList(visiblePlan)}
                  style={{ marginTop: 8 }}
                >
                  {t("nutrition.shoppingGenerate")}
                </button>
                <div style={{ marginTop: 12 }}>
                  {shoppingList.length === 0 ? (
                    <p className="muted">{t("nutrition.shoppingEmpty")}</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
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
              <h2 className="section-title" style={{ fontSize: 20 }}>{t("nutrition.manualPlanTitle")}</h2>
              <p className="section-subtitle">{t("nutrition.manualPlanSubtitle")}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn secondary" onClick={() => visiblePlan && setManualPlan(visiblePlan)}>
                {t("nutrition.manualPlanReset")}
              </button>
              <button type="button" className="btn" disabled={!manualPlan || saving} onClick={handleSaveManualPlan}>
                {saving ? t("nutrition.savePlanSaving") : t("nutrition.manualPlanSave")}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="muted">{t("nutrition.profileLoading")}</p>
          ) : error ? (
            <p className="muted">{error}</p>
          ) : saveMessage ? (
            <p className="muted">{saveMessage}</p>
          ) : null}

          {manualPlan ? (
            <div className="form-stack">
              {manualPlan.days.map((day, dayIndex) => (
                <div key={`${day.dayLabel}-${dayIndex}`} className="feature-card" style={{ display: "grid", gap: 12 }}>
                  <label className="form-stack">
                    {t("nutrition.manualDayLabel")}
                    <input
                      value={day.dayLabel}
                      onChange={(e) => updateManualDayLabel(dayIndex, e.target.value)}
                    />
                  </label>
                  <div className="form-stack">
                    {day.meals.map((meal, mealIndex) => (
                      <div key={`${meal.title}-${mealIndex}`} className="info-item" style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                          <strong>{t("nutrition.manualMeal")}</strong>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => removeManualMeal(dayIndex, mealIndex)}
                          >
                            {t("nutrition.manualMealRemove")}
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
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
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
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
                          <div style={{ fontWeight: 600 }}>{t("nutrition.manualIngredients")}</div>
                          {meal.ingredients.length === 0 ? (
                            <p className="muted">{t("nutrition.manualIngredientsEmpty")}</p>
                          ) : (
                            meal.ingredients.map((ingredient, ingredientIndex) => (
                              <div
                                key={`${ingredient.name}-${ingredientIndex}`}
                                style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, alignItems: "center" }}
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
    </div>
  );
}
