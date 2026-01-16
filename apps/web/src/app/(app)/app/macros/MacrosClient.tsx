"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";
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

function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number) {
  const s = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

function bmrKatchMcArdle(weightKg: number, bodyFatPercent: number) {
  const bf = clamp(Number(bodyFatPercent) || 0, 5, 60);
  const lbm = weightKg * (1 - bf / 100);
  return 370 + 21.6 * lbm;
}

function buildState(profile: ProfileData): MacroState {
  return {
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activity: profile.activity,
    goal: profile.nutritionPreferences.goal,
    mealsPerDay: profile.nutritionPreferences.mealsPerDay,
    formula: profile.macroPreferences.formula,
    bodyFatPercent: profile.measurements.bodyFatPercent,
    cutPercent: profile.macroPreferences.cutPercent,
    bulkPercent: profile.macroPreferences.bulkPercent,
    proteinGPerKg: profile.macroPreferences.proteinGPerKg,
    fatGPerKg: profile.macroPreferences.fatGPerKg,
  };
}

export default function MacrosClient() {
  const c = copy.es.macros;
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
      } catch {
        if (active) setError("No pudimos cargar tu perfil.");
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
            <h2 className="section-title" style={{ fontSize: 20 }}>{c.dataTitle}</h2>
            <p className="section-subtitle">{copy.es.profile.preferencesTitle}</p>
          </div>
        </div>

        {loading ? (
          <p className="muted">Cargando preferencias...</p>
        ) : error ? (
          <p className="muted">{error}</p>
        ) : state ? (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">{c.sex}</div>
              <div className="info-value">{state.sex === "male" ? c.male : c.female}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.age}</div>
              <div className="info-value">{state.age}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.height}</div>
              <div className="info-value">{state.heightCm} cm</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.weight}</div>
              <div className="info-value">{state.weightKg} kg</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.activity}</div>
              <div className="info-value">
                {c[state.activity === "sedentary"
                  ? "activitySedentary"
                  : state.activity === "light"
                    ? "activityLight"
                    : state.activity === "moderate"
                      ? "activityModerate"
                      : state.activity === "very"
                        ? "activityVery"
                        : "activityExtra"]}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.goal}</div>
              <div className="info-value">
                {c[state.goal === "cut" ? "goalCut" : state.goal === "bulk" ? "goalBulk" : "goalMaintain"]}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.mealsPerDay}</div>
              <div className="info-value">{state.mealsPerDay}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.formula}</div>
              <div className="info-value">
                {state.formula === "katch" ? c.katch : c.mifflin}
              </div>
            </div>
          </div>
        ) : null}

        <p className="muted" style={{ marginTop: 12 }}>
          Cambia estas preferencias desde <strong>Perfil</strong>.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.macrosTitle}</h2>
        {result ? (
          <div className="info-grid" style={{ marginTop: 16 }}>
            <div className="info-item">
              <div className="info-label">{c.bmr}</div>
              <div className="info-value">{round(result.bmr)} kcal</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.tdee}</div>
              <div className="info-value">{round(result.tdee)} kcal</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.target}</div>
              <div className="info-value">{round(result.targetCalories)} kcal</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.proteinLabel}</div>
              <div className="info-value">{round(result.macros.proteinG)} g</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.fatLabel}</div>
              <div className="info-value">{round(result.macros.fatG)} g</div>
            </div>
            <div className="info-item">
              <div className="info-label">{c.carbsLabel}</div>
              <div className="info-value">{round(result.macros.carbsG)} g</div>
            </div>
          </div>
        ) : null}

        {result?.macros.carbsG === 0 && (
          <p style={{ marginTop: 10, marginBottom: 0 }} className="muted">
            {c.noteZeroCarbs}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.resultTitle}</h2>
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
                  <div className="info-label">{c.mealLabel} {i + 1}</div>
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
        {c.disclaimer}
      </p>
    </div>
  );
}
