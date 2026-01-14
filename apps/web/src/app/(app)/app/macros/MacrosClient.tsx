"use client";

import { useEffect, useMemo, useState } from "react";

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
mealsPerDay: 3 | 4 | 5;
formula: Formula;
bodyFatPercent: number; // só usado em Katch


  // Ajuste calórico por percentagem do TDEE
  cutPercent: number;  // ex: 15 significa -15%
  bulkPercent: number; // ex: 10 significa +10%

  // Macros base
  proteinGPerKg: number; // ex: 1.8
  fatGPerKg: number;     // ex: 0.8
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

  });

  useEffect(() => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY));
    if (stored) setState(stored);
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


  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Dados</h2>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Sexo
              <select value={state.sex} onChange={(e) => set("sex", e.target.value as Sex)}>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              Idade
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
  Fórmula
  <select
    value={state.formula}
    onChange={(e) => set("formula", e.target.value as Formula)}
  >
    <option value="mifflin">Mifflin-St Jeor (padrão)</option>
    <option value="katch">Katch-McArdle (usa % gordura corporal)</option>
  </select>
</label>

{state.formula === "katch" && (
  <label style={{ display: "grid", gap: 6 }}>
    Gordura corporal (%)
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
              Altura (cm)
              <input
                type="number"
                min={120}
                max={230}
                value={state.heightCm}
                onChange={(e) => set("heightCm", Number(e.target.value))}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              Peso (kg)
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
            Atividade
            <select
              value={state.activity}
              onChange={(e) => set("activity", e.target.value as Activity)}
            >
              <option value="sedentary">Sedentário (pouco ou nenhum treino)</option>
              <option value="light">Leve (1 a 3x/semana)</option>
              <option value="moderate">Moderada (3 a 5x/semana)</option>
              <option value="very">Alta (6 a 7x/semana)</option>
              <option value="extra">Muito alta (2x/dia ou trabalho físico)</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Objetivo
            <select value={state.goal} onChange={(e) => set("goal", e.target.value as Goal)}>
              <option value="maintain">Manter</option>
              <option value="cut">Definição (cut)</option>
              <option value="bulk">Ganho (bulk)</option>
            </select>
          </label>

          {state.goal === "cut" && (
            <label style={{ display: "grid", gap: 6 }}>
              Déficit (% do TDEE)
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
              Superávit (% do TDEE)
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
        <h2 style={{ margin: 0, fontSize: 16 }}>Macros</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
  <button type="button" onClick={() => applyPreset("cut")}>
    Preset Cut
  </button>
  <button type="button" onClick={() => applyPreset("recomp")}>
    Preset Recomp
  </button>
  <button type="button" onClick={() => applyPreset("bulk")}>
    Preset Bulk
  </button>
</div>


        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Proteína (g/kg)
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
              Gordura (g/kg)
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

          <p style={{ margin: 0, opacity: 0.75 }}>
            Carboidratos ficam como “resto” das calorias, depois de proteína e gordura.
          </p>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Resultado</h2>
<label style={{ display: "grid", gap: 6, maxWidth: 220 }}>
  Refeições por dia
  <select
    value={state.mealsPerDay}
    onChange={(e) => set("mealsPerDay", Number(e.target.value) as 3 | 4 | 5)}
  >
    <option value={3}>3</option>
    <option value={4}>4</option>
    <option value={5}>5</option>
  </select>
</label>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7 }}>BMR</div>
              <p style={{ margin: 0, opacity: 0.7 }}>
  Fórmula: {state.formula === "katch" ? "Katch-McArdle" : "Mifflin-St Jeor"}
</p>
              <strong>{round(result.bmr)} kcal</strong>
            </div>



            <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7 }}>TDEE</div>
              <strong>{round(result.tdee)} kcal</strong>
            </div>

            <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7 }}>Alvo</div>
              <strong>{round(result.targetCalories)} kcal</strong>
            </div>
          </div>

          <div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ opacity: 0.7 }}>Proteína</div>
                <strong>{round(result.macros.proteinG)} g</strong>
                <div style={{ opacity: 0.7 }}>{round(result.macros.proteinKcal)} kcal</div>
              </div>

              <div>
                <div style={{ opacity: 0.7 }}>Gordura</div>
                <strong>{round(result.macros.fatG)} g</strong>
                <div style={{ opacity: 0.7 }}>{round(result.macros.fatKcal)} kcal</div>
              </div>

              <div>
                <div style={{ opacity: 0.7 }}>Carbs</div>
                <strong>{round(result.macros.carbsG)} g</strong>
                <div style={{ opacity: 0.7 }}>{round(result.macros.carbsKcal)} kcal</div>
              </div>
            </div>

            

            {result.macros.carbsG === 0 && (
              <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.75 }}>
                Nota: proteína + gordura já consumiram as calorias alvo. Baixa g/kg ou sobe calorias.
              </p>
            )}
          </div>

<div style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
  <div style={{ opacity: 0.7, marginBottom: 8 }}>Por refeição (divisão igual)</div>

  {(() => {
    const m = state.mealsPerDay;
    const kcalMeal = result.targetCalories / m;
    const pMeal = result.macros.proteinG / m;
    const fMeal = result.macros.fatG / m;
    const cMeal = result.macros.carbsG / m;

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ opacity: 0.7 }}>Calorias</div>
          <strong>{round(kcalMeal)} kcal</strong>
        </div>
        <div>
          <div style={{ opacity: 0.7 }}>Proteína</div>
          <strong>{round(pMeal)} g</strong>
        </div>
        <div>
          <div style={{ opacity: 0.7 }}>Gordura</div>
          <strong>{round(fMeal)} g</strong>
        </div>
        <div>
          <div style={{ opacity: 0.7 }}>Carbs</div>
          <strong>{round(cMeal)} g</strong>
        </div>
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

              });
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <p style={{ margin: 0, opacity: 0.7 }}>
        Isto é uma estimativa, pode variar com NEAT, aderência e composição corporal.
      </p>
    </div>
  );
}
