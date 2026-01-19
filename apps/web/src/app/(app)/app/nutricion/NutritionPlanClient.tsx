"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Locale } from "@/lib/i18n";
import {
  type Activity,
  type Goal,
  type NutritionCookingTime,
  type ProfileData,
  type NutritionPlanData,
} from "@/lib/profile";
import { getUserProfile, updateUserProfile } from "@/lib/profileService";

type NutritionForm = {
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  mealsPerDay: 1 | 2 | 3 | 4 | 5 | 6;
  dietaryPrefs: string;
  dislikes: string;
  cookingTime: NutritionCookingTime;
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

const DAY_LABELS: Record<Locale, string[]> = {
  es: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
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

  const perMealProtein = proteinG / form.mealsPerDay;
  const perMealCarbs = carbsG / form.mealsPerDay;
  const perMealFat = fatG / form.mealsPerDay;

  const days = dayLabels.map((label, dayIndex) => {
    const meals = mealsOrder.map((slot, slotIndex) => {
      const options = mealTemplates[slot];
      const option = options[(dayIndex + slotIndex) % options.length];
      const mealProtein = perMealProtein;
      const mealCarbs = perMealCarbs;
      const mealFat = perMealFat;
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
        ingredients: buildMealIngredients(option, perMealProtein, perMealCarbs, perMealFat),
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

export default function NutritionPlanClient() {
  const { t, locale } = useLanguage();
  const mealTemplates = MEAL_TEMPLATES[locale];
  const dayLabels = DAY_LABELS[locale];
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [savedPlan, setSavedPlan] = useState<NutritionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  const plan = useMemo(() => {
    if (!profile) return null;
    return calculatePlan(
      {
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activity: profile.activity,
        goal: profile.nutritionPreferences.goal,
        mealsPerDay: profile.nutritionPreferences.mealsPerDay,
        dietaryPrefs: profile.nutritionPreferences.dietaryPrefs,
        dislikes: profile.nutritionPreferences.dislikes,
        cookingTime: profile.nutritionPreferences.cookingTime,
      },
      mealTemplates,
      dayLabels
    );
  }, [profile, mealTemplates, dayLabels]);
  const visiblePlan = savedPlan ?? plan;

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

  const handleAiPlan = async () => {
    if (!profile || aiLoading) return;
    setAiLoading(true);
    setError(null);
    try {
      const mealsPerDay = Math.min(4, Math.max(3, profile.nutritionPreferences.mealsPerDay));
      const calories = plan?.dailyCalories ?? 2000;
      const response = await fetch("/api/ai/nutrition-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: profile.name || undefined,
          age: profile.age,
          sex: profile.sex,
          goal: profile.nutritionPreferences.goal,
          mealsPerDay,
          calories,
          dietaryRestrictions: profile.nutritionPreferences.dietaryPrefs || profile.nutritionPreferences.dislikes || undefined,
        }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string; message?: string; retryAfterSec?: number }
            | null;
          const message =
            payload?.message ??
            t("nutrition.aiRateLimit");
          throw new Error(message);
        }
        throw new Error(t("nutrition.aiError"));
      }
      const data = (await response.json()) as NutritionPlan;
      const updated = await updateUserProfile({ nutritionPlan: data });
      setSavedPlan(updated.nutritionPlan ?? data);
      setSaveMessage(t("nutrition.aiSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("nutrition.aiError"));
    } finally {
      setAiLoading(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("nutrition.formTitle")}</h2>
            <p className="section-subtitle">{t("nutrition.tips")}</p>
          </div>
          <button type="button" className="btn" disabled={!plan} onClick={() => loadProfile({ current: true })}>
            {t("nutrition.generate")}
          </button>
          <button type="button" className="btn" disabled={!plan || aiLoading} onClick={handleAiPlan}>
            {aiLoading ? t("nutrition.aiGenerating") : t("nutrition.aiGenerate")}
          </button>
          <button type="button" className="btn secondary" disabled={!plan || saving} onClick={handleSavePlan}>
            {saving ? t("nutrition.savePlanSaving") : t("nutrition.savePlan")}
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
                {t("macros.goal")}: {t(profile.nutritionPreferences.goal === "cut" ? "macros.goalCut" : profile.nutritionPreferences.goal === "bulk" ? "macros.goalBulk" : "macros.goalMaintain")}
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
                <div className="info-label">{t("nutrition.dietaryPrefs")}</div>
                <div className="info-value">{profile.nutritionPreferences.dietaryPrefs || "-"}</div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("nutrition.dislikes")}</div>
                <div className="info-value">{profile.nutritionPreferences.dislikes || "-"}</div>
              </div>
            </div>
          </>
        ) : null}

        <p className="muted" style={{ marginTop: 12 }}>
          Cambia estas preferencias desde <strong>Perfil</strong>.
        </p>
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
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("nutrition.weeklyPlanTitle")}</h2>
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
    </div>
  );
}
