"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";

type Goal = "cut" | "maintain" | "bulk";
type Level = "beginner" | "intermediate" | "advanced";
type Equipment = "gym" | "home";
type Focus = "full" | "upperLower" | "ppl";
type SessionTime = "short" | "medium" | "long";

type TrainingForm = {
  goal: Goal;
  level: Level;
  daysPerWeek: 2 | 3 | 4 | 5;
  equipment: Equipment;
  focus: Focus;
  sessionTime: SessionTime;
};

type Exercise = {
  name: string;
  sets: string;
};

type TrainingDay = {
  label: string;
  focus: string;
  duration: number;
  exercises: Exercise[];
};

type TrainingPlan = {
  days: TrainingDay[];
};

const STORAGE_KEY = "fs_training_plan_v1";

const exercisePool = {
  full: {
    gym: ["Sentadilla", "Press banca", "Remo con barra", "Peso muerto rumano", "Press militar", "Plancha"],
    home: ["Sentadilla", "Flexiones", "Remo con banda", "Zancadas", "Pike push-ups", "Plancha"],
  },
  upper: {
    gym: ["Press banca", "Remo con barra", "Press militar", "Dominadas", "Curl bíceps", "Extensión tríceps"],
    home: ["Flexiones", "Remo con banda", "Press militar con mancuernas", "Fondos en banco", "Curl bíceps", "Plancha"],
  },
  lower: {
    gym: ["Sentadilla", "Peso muerto rumano", "Prensa", "Elevación gemelos", "Hip thrust", "Core"],
    home: ["Sentadilla", "Zancadas", "Puente de glúteo", "Elevación gemelos", "Buenos días", "Core"],
  },
  push: {
    gym: ["Press banca", "Press militar", "Press inclinado", "Fondos", "Elevaciones laterales", "Tríceps"],
    home: ["Flexiones", "Press militar con mancuernas", "Press inclinado con mancuernas", "Fondos", "Elevaciones laterales", "Tríceps"],
  },
  pull: {
    gym: ["Remo con barra", "Dominadas", "Face pull", "Curl bíceps", "Remo en polea", "Core"],
    home: ["Remo con banda", "Dominadas asistidas", "Face pull con banda", "Curl bíceps", "Remo invertido", "Core"],
  },
  legs: {
    gym: ["Sentadilla", "Peso muerto rumano", "Prensa", "Curl femoral", "Elevación gemelos", "Core"],
    home: ["Sentadilla", "Zancadas", "Peso muerto rumano con mancuerna", "Curl femoral con fitball", "Elevación gemelos", "Core"],
  },
};

const dayLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

function durationFromSessionTime(sessionTime: SessionTime) {
  switch (sessionTime) {
    case "short":
      return 35;
    case "medium":
      return 50;
    default:
      return 65;
  }
}

function setsForLevel(level: Level, goal: Goal) {
  if (level === "beginner") return goal === "cut" ? "2-3 x 10-12" : "3 x 8-12";
  if (level === "intermediate") return goal === "cut" ? "3 x 10-12" : "3-4 x 8-10";
  return goal === "cut" ? "3-4 x 8-12" : "4 x 6-10";
}

function buildExercises(
  list: string[],
  sets: string,
  maxItems: number
): Exercise[] {
  return list.slice(0, maxItems).map((name) => ({ name, sets }));
}

function generatePlan(form: TrainingForm): TrainingPlan {
  const sets = setsForLevel(form.level, form.goal);
  const duration = durationFromSessionTime(form.sessionTime);
  const days = Array.from({ length: form.daysPerWeek }).map((_, i) => {
    const label = `${dayLabels[i] ?? "Día"} ${i + 1}`;
    const equipmentKey = form.equipment;
    let focusLabel = "Full-body";
    let exercises: Exercise[] = [];

    if (form.focus === "upperLower") {
      const isUpper = i % 2 === 0;
      focusLabel = isUpper ? "Upper" : "Lower";
      exercises = buildExercises(
        isUpper ? exercisePool.upper[equipmentKey] : exercisePool.lower[equipmentKey],
        sets,
        6
      );
    } else if (form.focus === "ppl") {
      const phase = i % 3;
      if (phase === 0) {
        focusLabel = "Push";
        exercises = buildExercises(exercisePool.push[equipmentKey], sets, 6);
      } else if (phase === 1) {
        focusLabel = "Pull";
        exercises = buildExercises(exercisePool.pull[equipmentKey], sets, 6);
      } else {
        focusLabel = "Legs";
        exercises = buildExercises(exercisePool.legs[equipmentKey], sets, 6);
      }
    } else {
      focusLabel = "Full-body";
      exercises = buildExercises(exercisePool.full[equipmentKey], sets, 6);
    }

    return {
      label,
      focus: focusLabel,
      duration,
      exercises,
    };
  });

  return { days };
}

const periodization = [
  { label: "weekBase", setsDelta: 0 },
  { label: "weekBuild", setsDelta: 1 },
  { label: "weekPeak", setsDelta: 2 },
  { label: "weekDeload", setsDelta: -1 },
];

function adjustSets(sets: string, delta: number) {
  if (delta === 0) return sets;
  const match = sets.match(/^(\d+)(?:-(\d+))?\s*x\s*(.+)$/);
  if (!match) return sets;
  const start = Math.max(1, Number(match[1]) + delta);
  const end = match[2] ? Math.max(start, Number(match[2]) + delta) : null;
  const reps = match[3];
  return end ? `${start}-${end} x ${reps}` : `${start} x ${reps}`;
}

export default function TrainingPlanClient() {
  const c = copy.es;
  const [form, setForm] = useState<TrainingForm>({
    goal: "maintain",
    level: "beginner",
    daysPerWeek: 3,
    equipment: "gym",
    focus: "full",
    sessionTime: "medium",
  });
  const [plan, setPlan] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { form: TrainingForm; plan: TrainingPlan };
      if (parsed?.form) setForm(parsed.form);
      if (parsed?.plan) setPlan(parsed.plan);
    } catch {
      setPlan(null);
    }
  }, []);

  const preview = useMemo(() => generatePlan(form), [form]);

  function update<K extends keyof TrainingForm>(key: K, value: TrainingForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function savePlan() {
    const nextPlan = generatePlan(form);
    setPlan(nextPlan);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, plan: nextPlan }));
  }

  function resetPlan() {
    localStorage.removeItem(STORAGE_KEY);
    setPlan(null);
  }

  const activePlan = plan ?? preview;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.training.formTitle}</h2>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.training.goal}
              <select value={form.goal} onChange={(e) => update("goal", e.target.value as Goal)}>
                <option value="cut">{c.training.goalCut}</option>
                <option value="maintain">{c.training.goalMaintain}</option>
                <option value="bulk">{c.training.goalBulk}</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.training.level}
              <select value={form.level} onChange={(e) => update("level", e.target.value as Level)}>
                <option value="beginner">{c.training.levelBeginner}</option>
                <option value="intermediate">{c.training.levelIntermediate}</option>
                <option value="advanced">{c.training.levelAdvanced}</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.training.daysPerWeek}
              <select
                value={form.daysPerWeek}
                onChange={(e) => update("daysPerWeek", Number(e.target.value) as 2 | 3 | 4 | 5)}
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.training.equipment}
              <select
                value={form.equipment}
                onChange={(e) => update("equipment", e.target.value as Equipment)}
              >
                <option value="gym">{c.training.equipmentGym}</option>
                <option value="home">{c.training.equipmentHome}</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.training.sessionTime}
              <select
                value={form.sessionTime}
                onChange={(e) => update("sessionTime", e.target.value as SessionTime)}
              >
                <option value="short">{c.training.sessionTimeShort}</option>
                <option value="medium">{c.training.sessionTimeMedium}</option>
                <option value="long">{c.training.sessionTimeLong}</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.training.focus}
              <select value={form.focus} onChange={(e) => update("focus", e.target.value as Focus)}>
                <option value="full">{c.training.focusFullBody}</option>
                <option value="upperLower">{c.training.focusUpperLower}</option>
                <option value="ppl">{c.training.focusPushPullLegs}</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={savePlan}>
              {c.training.generate}
            </button>
            <button type="button" onClick={resetPlan}>
              {c.training.resetPlan}
            </button>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.training.weeklyPlanTitle}</h2>
        <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
          {activePlan.days.map((day) => (
            <div key={day.label} style={{ border: "1px solid #ededed", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <strong>
                  {c.training.dayLabel} {day.label}
                </strong>
                <span style={{ opacity: 0.7 }}>
                  {c.training.durationLabel}: {day.duration} {c.training.minutesLabel}
                </span>
              </div>
              <div style={{ marginTop: 6, fontWeight: 600 }}>{day.focus}</div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {day.exercises.map((exercise) => (
                  <li key={exercise.name}>
                    {exercise.name} — {exercise.sets}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.training.periodTitle}</h2>
        <p style={{ marginTop: 6 }}>{c.training.periodSubtitle}</p>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {periodization.map((week, idx) => (
            <div
              key={week.label}
              style={{ border: "1px solid #ededed", borderRadius: 10, padding: 12 }}
            >
              <strong>
                {c.training.weekLabel} {idx + 1} · {c.training[week.label as keyof typeof c.training]}
              </strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {activePlan.days.map((day) => (
                  <li key={`${week.label}-${day.label}`}>
                    {day.focus}:{" "}
                    {day.exercises
                      .slice(0, 2)
                      .map((ex) => adjustSets(ex.sets, week.setsDelta))
                      .join(" / ")}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.training.tipsTitle}</h2>
        <p style={{ margin: 0, opacity: 0.75 }}>{c.training.tips}</p>
      </div>
    </div>
  );
}
