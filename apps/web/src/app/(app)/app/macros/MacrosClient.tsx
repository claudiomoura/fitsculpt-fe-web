"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";

type Sex = "male" | "female";
type Activity = "sedentary" | "light" | "moderate" | "very" | "extra";
type Goal = "maintain" | "cut" | "bulk";
type Formula = "mifflin" | "katch";

type FormState = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  mealsPerDay: 1 | 2 | 3 | 4 | 5 | 6;
  formula: Formula;
  bodyFatPercent: number; // só usado em Katch
  mealsMode: "equal" | "custom";
  mealPercents: number[]; // tamanho = mealsPerDay, soma 100 quando custom

  // Ajuste calórico por percentagem do TDEE
  cutPercent: number; // ex: 15 significa -15%
  bulkPercent: number; // ex: 10 significa +10%

  // Macros base
  proteinGPerKg: number; // ex: 1.8
  fatGPerKg: number; // ex: 0.8
};

const STORAGE_KEY = "fs_macros_v1";

const activityMultiplier: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

function safeParse(json: string | null): FormState | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== "object") return null;
    return data as FormState;
  } catch {
    return null;
  }
}

function round(n: number) {
  return Math.round(n);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// BMR Mifflin-St Jeor
function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number) {
  const s = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

function bmrKatchMcArdle(weightKg: number, bodyFatPercent: number) {
  const bf = clamp(Number(bodyFatPercent) || 0, 5, 60);
  const lbm = weightKg * (1 - bf / 100); // Lean Body Mass
  return 370 + 21.6 * lbm;
}

export default function MacrosClient() {
  const c = copy.es.macros;
  const [state, setState] = useState<FormState>({
    sex: "male",
    age: 30,
    heightCm: 175,
    weightKg: 75,
    activity: "moderate",
    goal: "maintain",
    cutPercent: 15,
    bulkPercent: 10,
    proteinGPerKg: 1.8,
    fatGPerKg: 0.8,
    mealsPerDay: 4,
    formula: "mifflin",
    bodyFatPercent: 18,
    mealsMode: "equal",
    mealPercents: defaultMealPercents(4),
  });

  useEffect(() => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((prev) => {
      const meals = stored.mealsPerDay ?? prev.mealsPerDay;

      const perc =
        Array.isArray(stored.mealPercents) && stored.mealPercents.length === meals
          ? stored.mealPercents
          : defaultMealPercents(meals);

      return {
        ...prev,
        ...stored,
        mealsPerDay: meals,
        mealsMode: stored.mealsMode ?? "equal",
        mealPercents: perc,
        formula: stored.formula ?? "mifflin",
        bodyFatPercent: stored.bodyFatPercent ?? 18,
      };
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const result = useMemo(() => {
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(preset: "cut" | "recomp" | "bulk") {
    setState((prev) => {
      if (preset === "cut") {
        return {
          ...prev,
          goal: "cut",
          cutPercent: 20,
          proteinGPerKg: 2.0,
          fatGPerKg: 0.7,
        };
      }

      if (preset === "recomp") {
        return {
          ...prev,
          goal: "maintain",
          proteinGPerKg: 2.1,
          fatGPerKg: 0.8,
        };
      }

      return {
        ...prev,
        goal: "bulk",
        bulkPercent: 10,
        proteinGPerKg: 1.8,
        fatGPerKg: 0.9,
      };
    });
  }

  function defaultMealPercents(meals: number) {
  const base = Math.floor(100 / meals);
  const rem = 100 - base * meals;
  return Array.from({ length: meals }, (_, i) => base + (i < rem ? 1 : 0));
  }
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.dataTitle}</h2>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.sex}
              <select value={state.sex} onChange={(e) => set("sex", e.target.value as Sex)}>
                <option value="male">{c.male}</option>
                <option value="female">{c.female}</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {c.age}
              <input
                type="number"
                min={10}
                max={100}
                value={state.age}
                onChange={(e) => set("age", Number(e.target.value))}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            {c.formula}
            <select
              value={state.formula}
              onChange={(e) => set("formula", e.target.value as Formula)}
            >
              <option value="mifflin">{c.mifflin}</option>
              <option value="katch">{c.katch}</option>
            </select>
          </label>

          {state.formula === "katch" && (
            <label style={{ display: "grid", gap: 6 }}>
              {c.bodyFat}
              <input
                type="number"
                min={5}
                max={60}
                value={state.bodyFatPercent}
                onChange={(e) => set("bodyFatPercent", Number(e.target.value))}
              />
            </label>
          )}


          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.height}
              <input
                type="number"
                min={120}
                max={230}
                value={state.heightCm}
                onChange={(e) => set("heightCm", Number(e.target.value))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {c.weight}
              <input
                type="number"
                min={35}
                max={250}
                value={state.weightKg}
                onChange={(e) => set("weightKg", Number(e.target.value))}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            {c.activity}
            <select
              value={state.activity}
              onChange={(e) => set("activity", e.target.value as Activity)}
            >
              <option value="sedentary">{c.activitySedentary}</option>
              <option value="light">{c.activityLight}</option>
              <option value="moderate">{c.activityModerate}</option>
              <option value="very">{c.activityVery}</option>
              <option value="extra">{c.activityExtra}</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            {c.goal}
            <select value={state.goal} onChange={(e) => set("goal", e.target.value as Goal)}>
              <option value="maintain">{c.goalMaintain}</option>
              <option value="cut">{c.goalCut}</option>
              <option value="bulk">{c.goalBulk}</option>
            </select>
          </label>

          {state.goal === "cut" && (
            <label style={{ display: "grid", gap: 6 }}>
              {c.deficit}
              <input
                type="number"
                min={0}
                max={40}
                value={state.cutPercent}
                onChange={(e) => set("cutPercent", Number(e.target.value))}
              />
            </label>
          )}

          {state.goal === "bulk" && (
            <label style={{ display: "grid", gap: 6 }}>
              {c.surplus}
              <input
                type="number"
                min={0}
                max={40}
                value={state.bulkPercent}
                onChange={(e) => set("bulkPercent", Number(e.target.value))}
              />
            </label>
          )}
        </div>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.macrosTitle}</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" onClick={() => applyPreset("cut")}>
            {c.presetCut}
          </button>
          <button type="button" onClick={() => applyPreset("recomp")}>
            {c.presetRecomp}
          </button>
          <button type="button" onClick={() => applyPreset("bulk")}>
            {c.presetBulk}
          </button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.protein}
              <input
                type="number"
                step="0.1"
                min={0}
                max={3.5}
                value={state.proteinGPerKg}
                onChange={(e) => set("proteinGPerKg", Number(e.target.value))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {c.fat}
              <input
                type="number"
                step="0.1"
                min={0}
                max={2.0}
                value={state.fatGPerKg}
                onChange={(e) => set("fatGPerKg", Number(e.target.value))}
              />
            </label>
          </div>

          <p style={{ margin: 0, opacity: 0.75 }}>{c.carbsHint}</p>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.resultTitle}</h2>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6, maxWidth: 220 }}>
            {c.mealsPerDay}
            <select
              value={state.mealsPerDay}
              onChange={(e) => {
                const m = Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6;
                setState((prev) => ({
                  ...prev,
                  mealsPerDay: m,
                  mealPercents: defaultMealPercents(m),
                }));
              }}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, maxWidth: 220 }}>
            {c.distributionLabel}
            <select
              value={state.mealsMode}
              onChange={(e) =>
                setState((prev) => {
                  const mode = e.target.value as "equal" | "custom";
                  const perc =
                    prev.mealPercents?.length === prev.mealsPerDay
                      ? prev.mealPercents
                      : defaultMealPercents(prev.mealsPerDay);

                  return {
                    ...prev,
                    mealsMode: mode,
                    mealPercents: perc,
                  };
                })
              }
            >
              <option value="equal">{c.distributionEqual}</option>
              <option value="custom">{c.distributionCustom}</option>
            </select>
          </label>

          {state.mealsMode === "custom" && (
            <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7, marginBottom: 10 }}>{c.percentagesTitle}</div>

              <div style={{ display: "grid", gap: 10 }}>
                {Array.from({ length: state.mealsPerDay }).map((_, i) => (
                  <label key={i} style={{ display: "grid", gap: 6 }}>
                    {c.mealLabel} {i + 1} (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={state.mealPercents?.[i] ?? 0}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setState((prev) => {
                          const next = [
                            ...(prev.mealPercents ?? defaultMealPercents(prev.mealsPerDay)),
                          ];
                          next[i] = Number.isFinite(v) ? v : 0;
                          return { ...prev, mealPercents: next };
                        });
                      }}
                    />
                  </label>
                ))}

                {(() => {
                  const sum = (state.mealPercents ?? []).reduce(
                    (a, b) => a + (Number(b) || 0),
                    0
                  );
                  const ok = sum === 100;

                  return (
                    <div style={{ opacity: ok ? 0.75 : 1 }}>
                      {c.sumLabel}: <strong>{sum}%</strong>
                      {!ok && (
                        <span style={{ marginLeft: 10 }}>
                          {c.sumHintPrefix} <strong>100%</strong> {c.sumHintSuffix}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>


        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7 }}>{c.bmr}</div>
              <p style={{ margin: 0, opacity: 0.7 }}>
                {c.formulaLabel}: {state.formula === "katch" ? "Katch-McArdle" : "Mifflin-St Jeor"}
              </p>
              <strong>{round(result.bmr)} kcal</strong>
            </div>

            <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7 }}>{c.tdee}</div>
              <strong>{round(result.tdee)} kcal</strong>
            </div>

            <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7 }}>{c.target}</div>
              <strong>{round(result.targetCalories)} kcal</strong>
            </div>
          </div>

          <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ opacity: 0.7 }}>{c.proteinLabel}</div>
                <strong>{round(result.macros.proteinG)} g</strong>
                <div style={{ opacity: 0.7 }}>{round(result.macros.proteinKcal)} kcal</div>
              </div>

              <div>
                <div style={{ opacity: 0.7 }}>{c.fatLabel}</div>
                <strong>{round(result.macros.fatG)} g</strong>
                <div style={{ opacity: 0.7 }}>{round(result.macros.fatKcal)} kcal</div>
              </div>

              <div>
                <div style={{ opacity: 0.7 }}>{c.carbsLabel}</div>
                <strong>{round(result.macros.carbsG)} g</strong>
                <div style={{ opacity: 0.7 }}>{round(result.macros.carbsKcal)} kcal</div>
              </div>
            </div>

            

            {result.macros.carbsG === 0 && (
              <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.75 }}>
                {c.noteZeroCarbs}
              </p>
            )}
          </div>

          <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
            <div style={{ opacity: 0.7, marginBottom: 8 }}>
              {c.perMeal} ({state.mealsMode === "custom" ? c.perMealCustom : c.perMealEqual})
            </div>

            {(() => {
              const meals = state.mealsPerDay;

              const percents =
                state.mealsMode === "custom"
                  ? state.mealPercents ?? defaultMealPercents(meals)
                  : defaultMealPercents(meals);

              const sum = percents.reduce((a, b) => a + (Number(b) || 0), 0);
              const valid = state.mealsMode === "custom" ? sum === 100 : true;

              if (!valid) {
                return (
                  <p style={{ margin: 0, opacity: 0.75 }}>{c.perMealInvalid}</p>
                );
              }

              return (
                <div style={{ display: "grid", gap: 10 }}>
                  {percents.map((p, i) => {
                    const factor = (Number(p) || 0) / 100;

                    const kcal = result.targetCalories * factor;
                    const prot = result.macros.proteinG * factor;
                    const fat = result.macros.fatG * factor;
                    const carbs = result.macros.carbsG * factor;

                    return (
                      <div
                        key={i}
                        style={{
                          border: "1px solid #f0f0f0",
                          borderRadius: 12,
                          padding: 10,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ opacity: 0.7 }}>{c.mealLabel}</div>
                          <strong>{i + 1}</strong>
                          <div style={{ opacity: 0.7 }}>{p}%</div>
                        </div>

                        <div>
                          <div style={{ opacity: 0.7 }}>{c.calories}</div>
                          <strong>{round(kcal)} kcal</strong>
                        </div>

                        <div>
                          <div style={{ opacity: 0.7 }}>{c.proteinLabel}</div>
                          <strong>{round(prot)} g</strong>
                        </div>

                        <div>
                          <div style={{ opacity: 0.7 }}>{c.fatLabel}</div>
                          <strong>{round(fat)} g</strong>
                        </div>

                        <div>
                          <div style={{ opacity: 0.7 }}>{c.carbsLabel}</div>
                          <strong>{round(carbs)} g</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>


          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setState({
                sex: "male",
                age: 30,
                heightCm: 175,
                weightKg: 75,
                activity: "moderate",
                goal: "maintain",
                cutPercent: 15,
                bulkPercent: 10,
                proteinGPerKg: 1.8,
                fatGPerKg: 0.8,
                mealsPerDay: 4,
                formula: "mifflin",
                bodyFatPercent: 18,
                mealsMode: "equal",
                mealPercents: defaultMealPercents(4),
              });
            }}
          >
            {c.reset}
          </button>
        </div>
      </div>

      <p style={{ margin: 0, opacity: 0.7 }}>
        {c.disclaimer}
      </p>
    </div>
  );
}
