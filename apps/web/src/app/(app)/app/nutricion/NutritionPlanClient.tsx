"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";

type Activity = "sedentary" | "light" | "moderate" | "high" | "very";
type Goal = "maintain" | "cut" | "bulk";

type NutritionForm = {
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  mealsPerDay: 1 | 2 | 3 | 4 | 5 | 6;
  dietaryPrefs: string;
  dislikes: string;
  cookingTime: "quick" | "medium" | "long";
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

type NutritionPlan = {
  dailyCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  days: DayPlan[];
};

type ShoppingItem = {
  name: string;
  grams: number;
};

const STORAGE_KEY = "fs_nutrition_plan_v1";

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

const dayLabels = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

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
    case "high":
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
  const [form, setForm] = useState<NutritionForm>({
    age: 30,
    heightCm: 175,
    weightKg: 75,
    activity: "moderate",
    goal: "maintain",
    mealsPerDay: 4,
    dietaryPrefs: "",
    dislikes: "",
    cookingTime: "medium",
  });
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { form: NutritionForm; plan: NutritionPlan };
      if (parsed?.form) setForm(parsed.form);
      if (parsed?.plan) setPlan(parsed.plan);
    } catch {
      setPlan(null);
    }
  }, []);

  const preview = useMemo(() => calculatePlan(form), [form]);

  function update<K extends keyof NutritionForm>(key: K, value: NutritionForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function savePlan() {
    const nextPlan = calculatePlan(form);
    setPlan(nextPlan);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, plan: nextPlan }));
  }

  function resetPlan() {
    localStorage.removeItem(STORAGE_KEY);
    setPlan(null);
  }

  const activePlan = plan ?? preview;

  function buildShoppingList() {
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.nutrition.formTitle}</h2>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.macros.age}
              <input
                type="number"
                min={10}
                max={100}
                value={form.age}
                onChange={(e) => update("age", Number(e.target.value))}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.macros.height}
              <input
                type="number"
                min={120}
                max={230}
                value={form.heightCm}
                onChange={(e) => update("heightCm", Number(e.target.value))}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.macros.weight}
              <input
                type="number"
                min={35}
                max={250}
                value={form.weightKg}
                onChange={(e) => update("weightKg", Number(e.target.value))}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.macros.activity}
              <select
                value={form.activity}
                onChange={(e) => update("activity", e.target.value as Activity)}
              >
                <option value="sedentary">{c.macros.activitySedentary}</option>
                <option value="light">{c.macros.activityLight}</option>
                <option value="moderate">{c.macros.activityModerate}</option>
                <option value="high">{c.macros.activityVery}</option>
                <option value="very">{c.macros.activityExtra}</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.macros.goal}
              <select value={form.goal} onChange={(e) => update("goal", e.target.value as Goal)}>
                <option value="maintain">{c.macros.goalMaintain}</option>
                <option value="cut">{c.macros.goalCut}</option>
                <option value="bulk">{c.macros.goalBulk}</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.nutrition.mealsPerDay}
              <select
                value={form.mealsPerDay}
                onChange={(e) =>
                  update("mealsPerDay", Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)
                }
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
              </select>
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            {c.nutrition.dietaryPrefs}
            <input
              value={form.dietaryPrefs}
              onChange={(e) => update("dietaryPrefs", e.target.value)}
              placeholder={c.nutrition.dietaryPrefsPlaceholder}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            {c.nutrition.dislikes}
            <input
              value={form.dislikes}
              onChange={(e) => update("dislikes", e.target.value)}
              placeholder={c.nutrition.dislikesPlaceholder}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            {c.nutrition.cookingTime}
            <select
              value={form.cookingTime}
              onChange={(e) => update("cookingTime", e.target.value as NutritionForm["cookingTime"])}
            >
              <option value="quick">{c.nutrition.cookingTimeOptionQuick}</option>
              <option value="medium">{c.nutrition.cookingTimeOptionMedium}</option>
              <option value="long">{c.nutrition.cookingTimeOptionLong}</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={savePlan}>
              {c.nutrition.generate}
            </button>
            <button type="button" onClick={resetPlan}>
              {c.nutrition.resetPlan}
            </button>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.nutrition.dailyTargetTitle}</h2>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.7 }}>{c.nutrition.calories}</div>
              <strong>{activePlan.dailyCalories} kcal</strong>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>{c.nutrition.protein}</div>
              <strong>{activePlan.proteinG} g</strong>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>{c.nutrition.fat}</div>
              <strong>{activePlan.fatG} g</strong>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>{c.nutrition.carbs}</div>
              <strong>{activePlan.carbsG} g</strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.nutrition.weeklyPlanTitle}</h2>

        <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
          {activePlan.days.map((day) => (
            <div key={day.dayLabel} style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <strong>{day.dayLabel}</strong>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {day.meals.map((meal) => (
                  <div key={meal.title}>
                    <div style={{ fontWeight: 600 }}>{meal.title}</div>
                    <div style={{ opacity: 0.75 }}>{meal.description}</div>
                    <div style={{ marginTop: 6, opacity: 0.75 }}>
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
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.nutrition.tipsTitle}</h2>
        <p style={{ margin: 0, opacity: 0.75 }}>{c.nutrition.tips}</p>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.nutrition.shoppingTitle}</h2>
        <button type="button" onClick={buildShoppingList} style={{ marginTop: 8 }}>
          {c.nutrition.shoppingGenerate}
        </button>
        <div style={{ marginTop: 12 }}>
          {shoppingList.length === 0 ? (
            <p style={{ opacity: 0.7 }}>{c.nutrition.shoppingEmpty}</p>
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
      </div>
    </div>
  );
}
