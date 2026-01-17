"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";
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
  title: string;
  description: string;
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

const ingredientProfiles = {
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
};

const mealTemplates: Record<string, MealTemplate[]> = {
  breakfast: [
    {
      title: "Avena con fruta",
      description: "Avena, yogur natural, frutos rojos y semillas.",
      protein: ingredientProfiles.yogurt,
      carbs: ingredientProfiles.oats,
      fat: ingredientProfiles.oliveOil,
      veg: ingredientProfiles.berries,
    },
    {
      title: "Tostadas con huevo",
      description: "Pan integral, huevos revueltos y aguacate.",
      protein: ingredientProfiles.eggs,
      carbs: ingredientProfiles.bread,
      fat: ingredientProfiles.avocado,
    },
  ],
  lunch: [
    {
      title: "Pollo con arroz",
      description: "Pechuga a la plancha, arroz integral y ensalada.",
      protein: ingredientProfiles.chicken,
      carbs: ingredientProfiles.rice,
      veg: ingredientProfiles.zucchini,
    },
    {
      title: "Bowl mediterráneo",
      description: "Quinoa, garbanzos, verduras y aceite de oliva.",
      protein: ingredientProfiles.chickpeas,
      carbs: ingredientProfiles.quinoa,
      fat: ingredientProfiles.oliveOil,
      veg: ingredientProfiles.zucchini,
    },
  ],
  dinner: [
    {
      title: "Salmón con verduras",
      description: "Salmón al horno, calabacín y patata.",
      protein: ingredientProfiles.salmon,
      carbs: ingredientProfiles.potatoes,
      veg: ingredientProfiles.zucchini,
    },
    {
      title: "Salteado rápido",
      description: "Pavo, verduras mixtas y noodles integrales.",
      protein: ingredientProfiles.turkey,
      carbs: ingredientProfiles.rice,
      veg: ingredientProfiles.zucchini,
    },
  ],
  snack: [
    {
      title: "Snack proteico",
      description: "Yogur griego con frutos secos.",
      protein: ingredientProfiles.yogurt,
      fat: ingredientProfiles.avocado,
      carbs: ingredientProfiles.berries,
    },
    {
      title: "Batido",
      description: "Leche, fruta y proteína en polvo.",
      protein: ingredientProfiles.milk,
      carbs: ingredientProfiles.berries,
      fat: ingredientProfiles.oliveOil,
    },
  ],
};

const dayLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

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

function calculatePlan(form: NutritionForm): NutritionPlan {
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
      return {
        title: `${slotIndex + 1}. ${option.title}`,
        description: option.description,
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
  const c = copy.es;
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
      if (activeRef.current) setError("No pudimos cargar tu perfil.");
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
    return calculatePlan({
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activity: profile.activity,
      goal: profile.nutritionPreferences.goal,
      mealsPerDay: profile.nutritionPreferences.mealsPerDay,
      dietaryPrefs: profile.nutritionPreferences.dietaryPrefs,
      dislikes: profile.nutritionPreferences.dislikes,
      cookingTime: profile.nutritionPreferences.cookingTime,
    });
  }, [profile]);
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
      setSaveMessage(c.nutrition.savePlanSuccess);
    } catch {
      setSaveMessage(c.nutrition.savePlanError);
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleAiPlan = async () => {
    if (!profile) return;
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
        throw new Error(c.nutrition.aiError);
      }
      const data = (await response.json()) as NutritionPlan;
      const updated = await updateUserProfile({ nutritionPlan: data });
      setSavedPlan(updated.nutritionPlan ?? data);
      setSaveMessage(c.nutrition.aiSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.nutrition.aiError);
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
            <h2 className="section-title" style={{ fontSize: 20 }}>{c.nutrition.formTitle}</h2>
            <p className="section-subtitle">{c.nutrition.tips}</p>
          </div>
          <button type="button" className="btn" disabled={!plan} onClick={() => loadProfile({ current: true })}>
            {c.nutrition.generate}
          </button>
          <button type="button" className="btn" disabled={!plan || aiLoading} onClick={handleAiPlan}>
            {aiLoading ? c.nutrition.aiGenerating : c.nutrition.aiGenerate}
          </button>
          <button type="button" className="btn secondary" disabled={!plan || saving} onClick={handleSavePlan}>
            {saving ? c.nutrition.savePlanSaving : c.nutrition.savePlan}
          </button>
        </div>

        {loading ? (
          <p className="muted">Cargando preferencias...</p>
        ) : error ? (
          <p className="muted">{error}</p>
        ) : saveMessage ? (
          <p className="muted">{saveMessage}</p>
        ) : profile ? (
          <>
            <div className="badge-list">
              <span className="badge">{c.macros.goal}: {c.macros[profile.nutritionPreferences.goal === "cut" ? "goalCut" : profile.nutritionPreferences.goal === "bulk" ? "goalBulk" : "goalMaintain"]}</span>
              <span className="badge">{c.nutrition.mealsPerDay}: {profile.nutritionPreferences.mealsPerDay}</span>
              <span className="badge">{c.nutrition.cookingTime}: {c.nutrition[profile.nutritionPreferences.cookingTime === "quick" ? "cookingTimeOptionQuick" : profile.nutritionPreferences.cookingTime === "long" ? "cookingTimeOptionLong" : "cookingTimeOptionMedium"]}</span>
            </div>

            <div className="info-grid" style={{ marginTop: 16 }}>
              <div className="info-item">
                <div className="info-label">{c.macros.weight}</div>
                <div className="info-value">{profile.weightKg} kg</div>
              </div>
              <div className="info-item">
                <div className="info-label">{c.macros.height}</div>
                <div className="info-value">{profile.heightCm} cm</div>
              </div>
              <div className="info-item">
                <div className="info-label">{c.macros.activity}</div>
                <div className="info-value">{c.macros[profile.activity === "sedentary" ? "activitySedentary" : profile.activity === "light" ? "activityLight" : profile.activity === "moderate" ? "activityModerate" : profile.activity === "very" ? "activityVery" : "activityExtra"]}</div>
              </div>
              <div className="info-item">
                <div className="info-label">{c.nutrition.dietaryPrefs}</div>
                <div className="info-value">{profile.nutritionPreferences.dietaryPrefs || "-"}</div>
              </div>
              <div className="info-item">
                <div className="info-label">{c.nutrition.dislikes}</div>
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
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.nutrition.dailyTargetTitle}</h2>
        <div className="info-grid" style={{ marginTop: 16 }}>
          <div className="info-item">
            <div className="info-label">{c.nutrition.calories}</div>
            <div className="info-value">{visiblePlan?.dailyCalories ?? 0} kcal</div>
          </div>
          <div className="info-item">
            <div className="info-label">{c.nutrition.protein}</div>
            <div className="info-value">{visiblePlan?.proteinG ?? 0} g</div>
          </div>
          <div className="info-item">
            <div className="info-label">{c.nutrition.fat}</div>
            <div className="info-value">{visiblePlan?.fatG ?? 0} g</div>
          </div>
          <div className="info-item">
            <div className="info-label">{c.nutrition.carbs}</div>
            <div className="info-value">{visiblePlan?.carbsG ?? 0} g</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.nutrition.weeklyPlanTitle}</h2>
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
                      {c.nutrition.ingredients}:
                    </div>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {meal.ingredients.map((ingredient) => (
                        <li key={ingredient.name}>
                          {ingredient.name}: {ingredient.grams} {c.nutrition.grams}
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
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.nutrition.shoppingTitle}</h2>
        <button
          type="button"
          className="btn"
          onClick={() => visiblePlan && buildShoppingList(visiblePlan)}
          style={{ marginTop: 8 }}
        >
          {c.nutrition.shoppingGenerate}
        </button>
        <div style={{ marginTop: 12 }}>
          {shoppingList.length === 0 ? (
            <p className="muted">{c.nutrition.shoppingEmpty}</p>
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
