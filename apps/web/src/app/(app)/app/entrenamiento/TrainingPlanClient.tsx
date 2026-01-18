"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";
import {
  type Goal,
  type TrainingEquipment,
  type TrainingFocus,
  type TrainingLevel,
  type SessionTime,
  type TrainingPlanData,
  type ProfileData,
} from "@/lib/profile";
import { getUserProfile, updateUserProfile } from "@/lib/profileService";

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

type TrainingPlan = TrainingPlanData;

type TrainingForm = {
  goal: Goal;
  level: TrainingLevel;
  daysPerWeek: 2 | 3 | 4 | 5;
  equipment: TrainingEquipment;
  focus: TrainingFocus;
  sessionTime: SessionTime;
};

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

function setsForLevel(level: TrainingLevel, goal: Goal) {
  if (level === "beginner") return goal === "cut" ? "2-3 x 10-12" : "3 x 8-12";
  if (level === "intermediate") return goal === "cut" ? "3 x 10-12" : "3-4 x 8-10";
  return goal === "cut" ? "3-4 x 8-12" : "4 x 6-10";
}

function buildExercises(list: string[], sets: string, maxItems: number): Exercise[] {
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<TrainingForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedPlan, setSavedPlan] = useState<TrainingPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadProfile = async (activeRef: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getUserProfile();
      if (!activeRef.current) return;
      setProfile(profile);
      setForm({
        goal: profile.trainingPreferences.goal,
        level: profile.trainingPreferences.level,
        daysPerWeek: profile.trainingPreferences.daysPerWeek,
        equipment: profile.trainingPreferences.equipment,
        focus: profile.trainingPreferences.focus,
        sessionTime: profile.trainingPreferences.sessionTime,
      });
      setSavedPlan(profile.trainingPlan ?? null);
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

  const plan = useMemo(() => (form ? generatePlan(form) : null), [form]);
  const visiblePlan = savedPlan ?? plan;

  const handleSavePlan = async () => {
    if (!plan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await updateUserProfile({ trainingPlan: plan });
      setSavedPlan(updated.trainingPlan ?? plan);
      setSaveMessage(c.training.savePlanSuccess);
    } catch {
      setSaveMessage(c.training.savePlanError);
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleAiPlan = async () => {
    if (!profile || !form) return;
    setAiLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: profile.name || undefined,
          age: profile.age,
          sex: profile.sex,
          level: form.level,
          goal: form.goal,
          equipment: form.equipment,
          daysPerWeek: form.daysPerWeek,
          sessionTime: form.sessionTime,
          focus: form.focus,
          timeAvailableMinutes: form.sessionTime === "short" ? 35 : form.sessionTime === "medium" ? 50 : 65,
          restrictions: profile.notes || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(c.training.aiError);
      }
      const data = (await response.json()) as TrainingPlan;
      const updated = await updateUserProfile({ trainingPlan: data });
      setSavedPlan(updated.trainingPlan ?? data);
      setSaveMessage(c.training.aiSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.training.aiError);
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
            <h2 className="section-title" style={{ fontSize: 20 }}>{c.training.formTitle}</h2>
            <p className="section-subtitle">
              {c.training.tips}
            </p>
          </div>
          <button type="button" className="btn" disabled={!form} onClick={() => loadProfile({ current: true })}>
            {c.training.generate}
          </button>
          <button type="button" className="btn" disabled={!form || aiLoading} onClick={handleAiPlan}>
            {aiLoading ? c.training.aiGenerating : c.training.aiGenerate}
          </button>
          <button type="button" className="btn secondary" disabled={!plan || saving} onClick={handleSavePlan}>
            {saving ? c.training.savePlanSaving : c.training.savePlan}
          </button>
        </div>

        {loading ? (
          <p className="muted">Cargando preferencias...</p>
        ) : error ? (
          <p className="muted">{error}</p>
        ) : saveMessage ? (
          <p className="muted">{saveMessage}</p>
        ) : form ? (
          <div className="badge-list">
            <span className="badge">{c.training.goal}: {c.training[form.goal === "cut" ? "goalCut" : form.goal === "bulk" ? "goalBulk" : "goalMaintain"]}</span>
            <span className="badge">{c.training.level}: {c.training[form.level === "beginner" ? "levelBeginner" : form.level === "intermediate" ? "levelIntermediate" : "levelAdvanced"]}</span>
            <span className="badge">{c.training.daysPerWeek}: {form.daysPerWeek}</span>
            <span className="badge">{c.training.equipment}: {form.equipment === "gym" ? c.training.equipmentGym : c.training.equipmentHome}</span>
            <span className="badge">{c.training.sessionTime}: {c.training[form.sessionTime === "short" ? "sessionTimeShort" : form.sessionTime === "long" ? "sessionTimeLong" : "sessionTimeMedium"]}</span>
            <span className="badge">{c.training.focus}: {c.training[form.focus === "ppl" ? "focusPushPullLegs" : form.focus === "upperLower" ? "focusUpperLower" : "focusFullBody"]}</span>
          </div>
        ) : null}

        <p className="muted" style={{ marginTop: 12 }}>
          Cambia estas preferencias desde <strong>Perfil</strong>.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.training.weeklyPlanTitle}</h2>
        <div className="list-grid" style={{ marginTop: 16 }}>
          {visiblePlan?.days.map((day, dayIdx) => (
            <div key={`${day.label}-${dayIdx}`} className="feature-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <strong>
                  {c.training.dayLabel} {day.label}
                </strong>
                <span className="muted">
                  {c.training.durationLabel}: {day.duration} {c.training.minutesLabel}
                </span>
              </div>
              <div style={{ fontWeight: 600 }}>{day.focus}</div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {day.exercises.map((exercise, exerciseIdx) => (
                  <li key={`${exercise.name}-${exerciseIdx}`}>
                    {exercise.name} — {exercise.sets}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.training.periodTitle}</h2>
        <p className="section-subtitle" style={{ marginTop: 6 }}>{c.training.periodSubtitle}</p>

        <div className="list-grid" style={{ marginTop: 16 }}>
          {periodization.map((week, idx) => (
            <div key={`${week.label}-${idx}`} className="feature-card">
              <strong>
                {c.training.weekLabel} {idx + 1} · {c.training[week.label as keyof typeof c.training]}
              </strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {plan?.days.map((day) => (
                  <li key={`${week.label}-${day.label}`}>
                    {day.focus}: {day.exercises
                      .slice(0, 2)
                      .map((ex) => adjustSets(ex.sets, week.setsDelta))
                      .join(" / ")}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
