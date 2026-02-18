"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { type MacroFormula, type ProfileData, type Sex } from "@/lib/profile";
import { getUserProfile } from "@/lib/profileService";

type Activity = "sedentary" | "light" | "moderate" | "very" | "extra";

type MacroState = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: "maintain" | "cut" | "bulk";
  mealsPerDay: 1 | 2 | 3 | 4 | 5 | 6;
  formula: MacroFormula;
  bodyFatPercent: number;
  cutPercent: number;
  bulkPercent: number;
  proteinGPerKg: number;
  fatGPerKg: number;
};

const activityMultiplier: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

function round(n: number) {
  return Math.round(n);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeSex(value: unknown): Sex {
  return value === "female" ? "female" : "male";
}



function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number) {
  const s = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

function bmrKatchMcArdle(weightKg: number, bodyFatPercent: number) {
  const bf = clamp(Number(bodyFatPercent) || 0, 5, 60);
  const lbm = weightKg * (1 - bf / 100);
  return 370 + 21.6 * lbm;
}

type Goal = "maintain" | "cut" | "bulk";

function normalizeActivity(value: unknown): Activity {
  return value === "light" || value === "moderate" || value === "very" || value === "extra"
    ? value
    : "sedentary";
}

function normalizeGoal(value: unknown): Goal {
  return value === "cut" || value === "bulk" ? value : "maintain";
}

function normalizeMealsPerDay(value: unknown): MacroState["mealsPerDay"] {
  const n = Math.round(Number(value));
  return (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6 ? n : 3) as MacroState["mealsPerDay"];
}

function normalizeFormula(value: unknown): MacroFormula {
  return value === "katch" ? "katch" : "mifflin";
}

function buildState(profile: ProfileData): MacroState {
  return {
    sex: normalizeSex(profile.sex),

    // OptionalNumber -> number (fallback)
    age: profile.age ?? 0,
    heightCm: profile.heightCm ?? 0,
    weightKg: profile.weightKg ?? 0,

    // unions normalizados
    activity: normalizeActivity(profile.activity),
    goal: normalizeGoal(profile.goal),

    // anidados, pueden venir null/undefined
    mealsPerDay: normalizeMealsPerDay(profile.nutritionPreferences?.mealsPerDay),
    formula: normalizeFormula(profile.macroPreferences?.formula),
    bodyFatPercent: profile.measurements?.bodyFatPercent ?? 0,

    cutPercent: profile.macroPreferences?.cutPercent ?? 0,
    bulkPercent: profile.macroPreferences?.bulkPercent ?? 0,
    proteinGPerKg: profile.macroPreferences?.proteinGPerKg ?? 0,
    fatGPerKg: profile.macroPreferences?.fatGPerKg ?? 0,
  };
}


export default function MacrosClient() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserProfile();
        if (active) setProfile(data);
      } catch (_err) {
        if (active) setError(t("macros.profileError"));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const state = useMemo(() => (profile ? buildState(profile) : null), [profile]);

  const result = useMemo(() => {
    if (!state) return null;
    const age = clamp(Number(state.age) || 0, 10, 100);
    const height = clamp(Number(state.heightCm) || 0, 120, 230);
    const weight = clamp(Number(state.weightKg) || 0, 35, 250);

    const bmr =
      state.formula === "katch"
        ? bmrKatchMcArdle(weight, state.bodyFatPercent)
        : bmrMifflin(state.sex, weight, height, age);
    const tdee = bmr * activityMultiplier[state.activity];

    let targetCalories = tdee;
    if (state.goal === "cut") {
      const p = clamp(Number(state.cutPercent) || 0, 0, 40);
      targetCalories = tdee * (1 - p / 100);
    }
    if (state.goal === "bulk") {
      const p = clamp(Number(state.bulkPercent) || 0, 0, 40);
      targetCalories = tdee * (1 + p / 100);
    }

    const proteinG = Math.max(0, (Number(state.proteinGPerKg) || 0) * weight);
    const fatG = Math.max(0, (Number(state.fatGPerKg) || 0) * weight);

    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;

    const remaining = targetCalories - (proteinKcal + fatKcal);
    const carbsG = remaining > 0 ? remaining / 4 : 0;

    const carbsKcal = carbsG * 4;

    return {
      bmr,
      tdee,
      targetCalories,
      macros: {
        proteinG,
        fatG,
        carbsG,
        proteinKcal,
        fatKcal,
        carbsKcal,
      },
    };
  }, [state]);

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("macros.dataTitle")}</h2>
            <p className="section-subtitle">{t("profile.preferencesTitle")}</p>
          </div>
        </div>

        {loading ? (
          <p className="muted">{t("macros.profileLoading")}</p>
        ) : error ? (
          <p className="muted">{error}</p>
        ) : state ? (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">{t("macros.sex")}</div>
              <div className="info-value">{state.sex === "male" ? t("macros.male") : t("macros.female")}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.age")}</div>
              <div className="info-value">{state.age}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.height")}</div>
              <div className="info-value">{state.heightCm} cm</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.weight")}</div>
              <div className="info-value">{state.weightKg} kg</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.activity")}</div>
              <div className="info-value">
                {t(state.activity === "sedentary"
                  ? "macros.activitySedentary"
                  : state.activity === "light"
                    ? "macros.activityLight"
                    : state.activity === "moderate"
                      ? "macros.activityModerate"
                      : state.activity === "very"
                        ? "macros.activityVery"
                        : "macros.activityExtra")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.goal")}</div>
              <div className="info-value">
                {t(state.goal === "cut" ? "macros.goalCut" : state.goal === "bulk" ? "macros.goalBulk" : "macros.goalMaintain")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.mealsPerDay")}</div>
              <div className="info-value">{state.mealsPerDay}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.formula")}</div>
              <div className="info-value">
                {state.formula === "katch" ? t("macros.katch") : t("macros.mifflin")}
              </div>
            </div>
          </div>
        ) : null}

        <p className="muted" style={{ marginTop: 12 }}>
          {t("macros.profileHint")} <strong>{t("nav.profile")}</strong>.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("macros.macrosTitle")}</h2>
        {result ? (
          <div className="info-grid" style={{ marginTop: 16 }}>
            <div className="info-item">
              <div className="info-label">{t("macros.bmr")}</div>
              <div className="info-value">{round(result.bmr)} kcal</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.tdee")}</div>
              <div className="info-value">{round(result.tdee)} kcal</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.target")}</div>
              <div className="info-value">{round(result.targetCalories)} kcal</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.proteinLabel")}</div>
              <div className="info-value">{round(result.macros.proteinG)} g</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.fatLabel")}</div>
              <div className="info-value">{round(result.macros.fatG)} g</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("macros.carbsLabel")}</div>
              <div className="info-value">{round(result.macros.carbsG)} g</div>
            </div>
          </div>
        ) : null}

        {result?.macros.carbsG === 0 && (
          <p style={{ marginTop: 10, marginBottom: 0 }} className="muted">
            {t("macros.noteZeroCarbs")}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("macros.resultTitle")}</h2>
        {result && state ? (
          <div className="info-grid" style={{ marginTop: 16 }}>
            {Array.from({ length: state.mealsPerDay }).map((_, i) => {
              const factor = 1 / state.mealsPerDay;
              const kcal = result.targetCalories * factor;
              const prot = result.macros.proteinG * factor;
              const fat = result.macros.fatG * factor;
              const carbs = result.macros.carbsG * factor;

              return (
                <div key={i} className="info-item">
                  <div className="info-label">{t("macros.mealLabel")} {i + 1}</div>
                  <div className="info-value">{round(kcal)} kcal</div>
                  <div className="muted">
                    {round(prot)}g P · {round(fat)}g G · {round(carbs)}g C
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <p className="muted" style={{ margin: 0 }}>
        {t("macros.disclaimer")}
      </p>
    </div>
  );
}
