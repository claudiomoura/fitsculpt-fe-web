"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import type { Locale } from "@/lib/i18n";
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
import { isProfileComplete } from "@/lib/profileCompletion";

type Exercise = {
  name: string;
  sets: string;
  reps?: string;
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
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  equipment: TrainingEquipment;
  focus: TrainingFocus;
  sessionTime: SessionTime;
};

type TrainingPlanClientProps = {
  mode?: "suggested" | "manual";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const baseExercisePool = {
  full: {
    gym: [] as string[],
    home: [] as string[],
  },
  upper: {
    gym: [] as string[],
    home: [] as string[],
  },
  lower: {
    gym: [] as string[],
    home: [] as string[],
  },
  push: {
    gym: [] as string[],
    home: [] as string[],
  },
  pull: {
    gym: [] as string[],
    home: [] as string[],
  },
  legs: {
    gym: [] as string[],
    home: [] as string[],
  },
};

const EXERCISE_POOL: Record<Locale, typeof baseExercisePool> = {
  es: {
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
  },
  en: {
    full: {
      gym: ["Squat", "Bench press", "Barbell row", "Romanian deadlift", "Overhead press", "Plank"],
      home: ["Squat", "Push-ups", "Band row", "Lunges", "Pike push-ups", "Plank"],
    },
    upper: {
      gym: ["Bench press", "Barbell row", "Overhead press", "Pull-ups", "Biceps curl", "Triceps extension"],
      home: ["Push-ups", "Band row", "Dumbbell overhead press", "Bench dips", "Biceps curl", "Plank"],
    },
    lower: {
      gym: ["Squat", "Romanian deadlift", "Leg press", "Calf raise", "Hip thrust", "Core"],
      home: ["Squat", "Lunges", "Glute bridge", "Calf raise", "Good morning", "Core"],
    },
    push: {
      gym: ["Bench press", "Overhead press", "Incline press", "Dips", "Lateral raises", "Triceps"],
      home: ["Push-ups", "Dumbbell overhead press", "Incline dumbbell press", "Dips", "Lateral raises", "Triceps"],
    },
    pull: {
      gym: ["Barbell row", "Pull-ups", "Face pull", "Biceps curl", "Cable row", "Core"],
      home: ["Band row", "Assisted pull-ups", "Band face pull", "Biceps curl", "Inverted row", "Core"],
    },
    legs: {
      gym: ["Squat", "Romanian deadlift", "Leg press", "Hamstring curl", "Calf raise", "Core"],
      home: ["Squat", "Lunges", "Dumbbell Romanian deadlift", "Swiss ball leg curl", "Calf raise", "Core"],
    },
  },
};

const DAY_LABELS: Record<Locale, string[]> = {
  es: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

function getTodayIndex(totalDays: number) {
  if (totalDays <= 1) return 0;
  const today = new Date();
  const mondayIndex = (today.getDay() + 6) % 7;
  return mondayIndex % totalDays;
}

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

function generatePlan(
  form: TrainingForm,
  locale: Locale,
  t: (key: string) => string
): TrainingPlan {
  const sets = setsForLevel(form.level, form.goal);
  const duration = durationFromSessionTime(form.sessionTime);
  const dayLabels = DAY_LABELS[locale];
  const exercisePool = EXERCISE_POOL[locale];
  const days = Array.from({ length: form.daysPerWeek }).map((_, i) => {
    const label = `${dayLabels[i] ?? t("training.dayLabel")} ${i + 1}`;
    const equipmentKey = form.equipment;
    let focusLabel = t("training.focusFullBody");
    let exercises: Exercise[] = [];

    if (form.focus === "upperLower") {
      const isUpper = i % 2 === 0;
      focusLabel = isUpper ? t("training.focusUpper") : t("training.focusLower");
      exercises = buildExercises(
        isUpper ? exercisePool.upper[equipmentKey] : exercisePool.lower[equipmentKey],
        sets,
        6
      );
    } else if (form.focus === "ppl") {
      const phase = i % 3;
      if (phase === 0) {
        focusLabel = t("training.focusPush");
        exercises = buildExercises(exercisePool.push[equipmentKey], sets, 6);
      } else if (phase === 1) {
        focusLabel = t("training.focusPull");
        exercises = buildExercises(exercisePool.pull[equipmentKey], sets, 6);
      } else {
        focusLabel = t("training.focusLegs");
        exercises = buildExercises(exercisePool.legs[equipmentKey], sets, 6);
      }
    } else {
      focusLabel = t("training.focusFullBody");
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

function createEmptyPlan(daysPerWeek: number, locale: Locale, t: (key: string) => string): TrainingPlan {
  const dayLabels = DAY_LABELS[locale];
  return {
    days: Array.from({ length: daysPerWeek }).map((_, index) => ({
      label: dayLabels[index] ?? `${t("training.dayLabel")} ${index + 1}`,
      focus: t("training.focusFullBody"),
      duration: 45,
      exercises: [],
    })),
  };
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

export default function TrainingPlanClient({ mode = "suggested" }: TrainingPlanClientProps) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<TrainingForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiTokenBalance, setAiTokenBalance] = useState<number | null>(null);
  const [aiTokenRenewalAt, setAiTokenRenewalAt] = useState<string | null>(null);
  const [savedPlan, setSavedPlan] = useState<TrainingPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [manualPlan, setManualPlan] = useState<TrainingPlan | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showWeek, setShowWeek] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const autoGenerated = useRef(false);
  const [techniqueModal, setTechniqueModal] = useState<{
    dayLabel: string;
    exercise: Exercise;
  } | null>(null);
  const isManualView = mode === "manual";

  const loadProfile = async (activeRef: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getUserProfile();
      if (!activeRef.current) return;
      setProfile(profile);
      setForm({
        goal: profile.goal,
        level: profile.trainingPreferences.level,
        daysPerWeek: profile.trainingPreferences.daysPerWeek,
        equipment: profile.trainingPreferences.equipment,
        focus: profile.trainingPreferences.focus,
        sessionTime: profile.trainingPreferences.sessionTime,
      });
      setSavedPlan(profile.trainingPlan ?? null);
    } catch {
      if (activeRef.current) setError(t("training.profileError"));
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
        return;
      }
      const data = (await response.json()) as {
        subscriptionPlan?: "FREE" | "PRO";
        aiTokenBalance?: number;
        aiTokenRenewalAt?: string | null;
      };
      setAiTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      window.dispatchEvent(new Event("auth:refresh"));
    } catch {
    }
  };

  useEffect(() => {
    void refreshSubscription();
  }, []);

  const plan = useMemo(() => (form ? generatePlan(form, locale, t) : null), [form, locale, t]);
  const visiblePlan = isManualView ? savedPlan ?? plan : savedPlan;

  useEffect(() => {
    if (manualPlan) return;
    if (savedPlan) {
      setManualPlan(savedPlan);
      return;
    }
    if (plan) {
      setManualPlan(plan);
      return;
    }
    if (form) {
      setManualPlan(createEmptyPlan(form.daysPerWeek, locale, t));
    }
  }, [manualPlan, savedPlan, plan, form, locale, t]);

  useEffect(() => {
    if (!visiblePlan?.days.length) return;
    setActiveDayIndex(getTodayIndex(visiblePlan.days.length));
  }, [visiblePlan?.days.length]);

  const handleSavePlan = async () => {
    if (!plan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await updateUserProfile({ trainingPlan: plan });
      setSavedPlan(updated.trainingPlan ?? plan);
      setSaveMessage(t("training.savePlanSuccess"));
    } catch {
      setSaveMessage(t("training.savePlanError"));
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
      const updated = await updateUserProfile({ trainingPlan: manualPlan });
      setSavedPlan(updated.trainingPlan ?? manualPlan);
      setSaveMessage(t("training.manualSaveSuccess"));
    } catch {
      setSaveMessage(t("training.savePlanError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  function updateManualDay(dayIndex: number, field: keyof TrainingDay, value: string | number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const day = { ...days[dayIndex], [field]: value };
      days[dayIndex] = day;
      return { ...prev, days };
    });
  }

  function updateManualExercise(
    dayIndex: number,
    exerciseIndex: number,
    field: keyof Exercise,
    value: string
  ) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = [...days[dayIndex].exercises];
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], [field]: value };
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }

  function addManualExercise(dayIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = [...days[dayIndex].exercises, { name: "", sets: "", reps: "" }];
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }

  function removeManualExercise(dayIndex: number, exerciseIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = days[dayIndex].exercises.filter((_, index) => index !== exerciseIndex);
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }


  const handleAiPlan = async () => {
    if (!profile || !form) return;
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=training&next=/app/entrenamiento");
      return;
    }
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
          goals: profile.goals,
          equipment: form.equipment,
          daysPerWeek: form.daysPerWeek,
          sessionTime: form.sessionTime,
          focus: form.focus,
          timeAvailableMinutes: form.sessionTime === "short" ? 35 : form.sessionTime === "medium" ? 50 : 65,
          includeCardio: profile.trainingPreferences.includeCardio,
          includeMobilityWarmups: profile.trainingPreferences.includeMobilityWarmups,
          workoutLength: profile.trainingPreferences.workoutLength,
          timerSound: profile.trainingPreferences.timerSound,
          injuries: profile.injuries || undefined,
          restrictions: profile.notes || undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; retryAfterSec?: number }
          | null;
        if (payload?.error === "INSUFFICIENT_TOKENS") {
          throw new Error(t("ai.insufficientTokens"));
        }
        if (response.status === 429) {
          const message = payload?.message ?? t("training.aiRateLimit");
          throw new Error(message);
        }
        throw new Error(t("training.aiError"));
      }
      const data = (await response.json()) as { plan?: TrainingPlan; aiTokenBalance?: number; aiTokenRenewalAt?: string | null };
      const plan = data.plan ?? (data as unknown as TrainingPlan);
      if (typeof data.aiTokenBalance === "number") {
        setAiTokenBalance(data.aiTokenBalance);
      }
      if (typeof data.aiTokenRenewalAt === "string" || data.aiTokenRenewalAt === null) {
        setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      }
      const updated = await updateUserProfile({ trainingPlan: plan });
      setSavedPlan(updated.trainingPlan ?? plan);
      setSaveMessage(t("training.aiSuccess"));
      void refreshSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("training.aiError"));
    } finally {
      setAiLoading(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  useEffect(() => {
    if (!profile || !form) return;
    if (autoGenerated.current) return;
    if (searchParams.get("ai") !== "1") return;
    autoGenerated.current = true;
    void handleAiPlan();
  }, [profile, form, searchParams]);

  const handleGenerateClick = () => {
    if (!profile) return;
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=training&next=/app/entrenamiento");
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

  const hasPlan = Boolean(visiblePlan?.days.length);

  return (
    <div className="page">
      {!isManualView ? (
        <>
          <section className="card">
<div className="section-head section-head-actions">
  <div style={{ minWidth: 0 }}>
    <h2 className="section-title" style={{ fontSize: 20 }}>{t("training.formTitle")}</h2>
    <p className="section-subtitle">{t("training.tips")}</p>
  </div>

  <div className="section-actions">
    {/* <button type="button" className="btn" disabled={!form} onClick={() => loadProfile({ current: true })}>
      {t("training.generate")}
    </button> */}

    <button
      type="button"
      className="btn"
      disabled={!form || aiLoading}
      onClick={handleGenerateClick}
    >
      {aiLoading ? t("training.aiGenerating") : t("training.aiGenerate")}
    </button>

    {/* <button type="button" className="btn secondary" disabled={!plan || saving} onClick={handleSavePlan}>
      {saving ? t("training.savePlanSaving") : t("training.savePlan")}
    </button> */}

    <Link href="/app/entrenamiento/editar" className="btn secondary">
      {t("training.editPlan")}
    </Link>
  </div>
</div>

            {aiTokenBalance !== null ? (
              <p className="muted" style={{ marginTop: 8 }}>
                {t("ai.tokensRemaining")} {aiTokenBalance}
                {aiTokenRenewalAt ? ` · ${t("ai.tokensReset")} ${formatDate(aiTokenRenewalAt)}` : ""}
              </p>
            ) : null}


            {loading ? (
              <p className="muted">{t("training.profileLoading")}</p>
            ) : error ? (
              <p className="muted">{error}</p>
            ) : saveMessage ? (
              <p className="muted">{saveMessage}</p>
            ) : form ? (
              <div className="badge-list">
                <span className="badge">
                  {t("training.goal")}: {t(form.goal === "cut" ? "training.goalCut" : form.goal === "bulk" ? "training.goalBulk" : "training.goalMaintain")}
                </span>
                <span className="badge">
                  {t("training.level")}: {t(form.level === "beginner" ? "training.levelBeginner" : form.level === "intermediate" ? "training.levelIntermediate" : "training.levelAdvanced")}
                </span>
                <span className="badge">{t("training.daysPerWeek")}: {form.daysPerWeek}</span>
                <span className="badge">
                  {t("training.equipment")}: {form.equipment === "gym" ? t("training.equipmentGym") : t("training.equipmentHome")}
                </span>
                <span className="badge">
                  {t("training.sessionTime")}: {t(form.sessionTime === "short" ? "training.sessionTimeShort" : form.sessionTime === "long" ? "training.sessionTimeLong" : "training.sessionTimeMedium")}
                </span>
                <span className="badge">
                  {t("training.focus")}: {t(form.focus === "ppl" ? "training.focusPushPullLegs" : form.focus === "upperLower" ? "training.focusUpperLower" : "training.focusFullBody")}
                </span>
              </div>
            ) : null}

            <p className="muted" style={{ marginTop: 12 }}>
              {t("training.preferencesHint")}
            </p>
          </section>

          {!loading && !error && !hasPlan ? (
            <section className="card">
              <div className="empty-state">
                <h3 style={{ marginTop: 0 }}>{t("training.emptyTitle")}</h3>
                <p className="muted">{t("training.emptySubtitle")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={aiLoading}
                    onClick={handleGenerateClick}
                  >
                    {aiLoading ? t("training.aiGenerating") : t("training.aiGenerate")}
                  </button>
                  <Link href="/app/entrenamiento/editar" className="btn secondary">
                    {t("training.manualCreate")}
                  </Link>
                </div>
              </div>
            </section>
          ) : hasPlan ? (
            <section className="card">
              <div className="section-head section-head-actions">
                <div>
                  <h2 className="section-title" style={{ fontSize: 20 }}>{t("training.todayTitle")}</h2>
                  <p className="section-subtitle">{t("training.todaySubtitle")}</p>
                </div>
                <div className="section-actions">
                  <button type="button" className="btn secondary" onClick={() => setShowWeek((prev) => !prev)}>
                    {showWeek ? t("training.viewToday") : t("training.viewWeek")}
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
                        key={`${day.label}-${index}`}
                        type="button"
                        className={`badge ${index === activeDayIndex ? "active" : ""}`}
                        onClick={() => setActiveDayIndex(index)}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <div className="section-head" style={{ marginBottom: 0 }}>
                    <div>
                      <strong>{visiblePlan?.days[activeDayIndex]?.label}</strong>
                      <p className="muted" style={{ margin: "4px 0 0" }}>
                        {visiblePlan?.days[activeDayIndex]?.focus} · {visiblePlan?.days[activeDayIndex]?.duration} {t("training.minutesLabel")}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="btn secondary" onClick={handlePrevDay}>
                        {t("training.dayPrev")}
                      </button>
                      <button type="button" className="btn secondary" onClick={handleNextDay}>
                        {t("training.dayNext")}
                      </button>
                    </div>
                  </div>
                  {visiblePlan?.days[activeDayIndex]?.exercises.length ? (
                    <div className="list-grid">
                      {visiblePlan.days[activeDayIndex].exercises.map((exercise, exerciseIdx) => (
                        <div key={`${exercise.name}-${exerciseIdx}`} className="exercise-mini-card">
                          <strong>{exercise.name}</strong>
                          <span className="muted">
                            {exercise.reps ? `${exercise.sets} x ${exercise.reps}` : exercise.sets}
                          </span>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => setTechniqueModal({ dayLabel: visiblePlan.days[activeDayIndex].label, exercise })}
                          >
                            {t("training.viewTechnique")}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="feature-card">
                      <strong>{t("training.restDayTitle")}</strong>
                      <p className="muted" style={{ marginTop: 6 }}>{t("training.restDaySubtitle")}</p>
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                        <li>{t("training.restDayTipOne")}</li>
                        <li>{t("training.restDayTipTwo")}</li>
                        <li>{t("training.restDayTipThree")}</li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    <li>{t("training.weeklyPlanTipOne")}</li>
                    <li>{t("training.weeklyPlanTipTwo")}</li>
                    <li>{t("training.weeklyPlanTipThree")}</li>
                  </ul>
                  <div className="list-grid" style={{ marginTop: 16 }}>
                    {visiblePlan?.days.map((day, dayIdx) => (
                      <details key={`${day.label}-${dayIdx}`} className="accordion-card">
                        <summary>
                          <span>{t("training.dayLabel")} {day.label}</span>
                          <span className="muted">
                            {day.focus} · {day.duration} {t("training.minutesLabel")}
                          </span>
                        </summary>
                        <div className="list-grid" style={{ marginTop: 12 }}>
                          {day.exercises.map((exercise, exerciseIdx) => (
                            <div key={`${exercise.name}-${exerciseIdx}`} className="exercise-mini-card">
                              <strong>{exercise.name}</strong>
                              <span className="muted">
                                {exercise.reps ? `${exercise.sets} x ${exercise.reps}` : exercise.sets}
                              </span>
                              <button
                                type="button"
                                className="btn secondary"
                                onClick={() => setTechniqueModal({ dayLabel: day.label, exercise })}
                              >
                                {t("training.viewTechnique")}
                              </button>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </>
              )}
            </section>
          ) : null}

          {hasPlan && (
            <section className="card">
              <details className="accordion-card">
                <summary>{t("training.periodTitle")}</summary>
                <p className="section-subtitle" style={{ marginTop: 6 }}>{t("training.periodSubtitle")}</p>

                <div className="list-grid" style={{ marginTop: 16 }}>
                  {periodization.map((week, idx) => (
                    <div key={`${week.label}-${idx}`} className="feature-card">
                      <strong>
                        {t("training.weekLabel")} {idx + 1} · {t(`training.${week.label}`)}
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
              </details>
            </section>
          )}
        </>
      ) : null}

      {isManualView ? (
        <section className="card">
          <div className="section-head">
            <div>
              <h2 className="section-title" style={{ fontSize: 20 }}>{t("training.manualPlanTitle")}</h2>
              <p className="section-subtitle">{t("training.manualPlanSubtitle")}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn secondary" onClick={() => visiblePlan && setManualPlan(visiblePlan)}>
                {t("training.manualPlanReset")}
              </button>
              <button type="button" className="btn" disabled={!manualPlan || saving} onClick={handleSaveManualPlan}>
                {saving ? t("training.savePlanSaving") : t("training.manualPlanSave")}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="muted">{t("training.profileLoading")}</p>
          ) : error ? (
            <p className="muted">{error}</p>
          ) : saveMessage ? (
            <p className="muted">{saveMessage}</p>
          ) : null}

          {manualPlan ? (
            <div className="form-stack">
              {manualPlan.days.map((day, dayIndex) => (
                <div key={`${day.label}-${dayIndex}`} className="feature-card" style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <label className="form-stack">
                      {t("training.manualDayLabel")}
                      <input
                        value={day.label}
                        onChange={(e) => updateManualDay(dayIndex, "label", e.target.value)}
                      />
                    </label>
                    <label className="form-stack">
                      {t("training.manualDayFocus")}
                      <input
                        value={day.focus}
                        onChange={(e) => updateManualDay(dayIndex, "focus", e.target.value)}
                      />
                    </label>
                    <label className="form-stack">
                      {t("training.manualDayDuration")}
                      <input
                        type="number"
                        min={20}
                        max={120}
                        value={day.duration}
                        onChange={(e) => updateManualDay(dayIndex, "duration", Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <div className="form-stack">
                    {day.exercises.length === 0 ? (
                      <p className="muted">{t("training.manualExercisesEmpty")}</p>
                    ) : (
                      day.exercises.map((exercise, exerciseIndex) => (
                        <div
                          key={`${exercise.name}-${exerciseIndex}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 1fr 1fr auto",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <input
                            value={exercise.name}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "name", e.target.value)}
                            placeholder={t("training.manualExerciseName")}
                          />
                          <input
                            value={exercise.sets}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "sets", e.target.value)}
                            placeholder={t("training.manualExerciseSets")}
                          />
                          <input
                            value={exercise.reps ?? ""}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "reps", e.target.value)}
                            placeholder={t("training.manualExerciseReps")}
                          />
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => removeManualExercise(dayIndex, exerciseIndex)}
                          >
                            {t("training.manualExerciseRemove")}
                          </button>
                        </div>
                      ))
                    )}
                    <button type="button" className="btn secondary" onClick={() => addManualExercise(dayIndex)}>
                      {t("training.manualExerciseAdd")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{t("training.manualPlanEmpty")}</p>
          )}
        </section>
      ) : null}

      {techniqueModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setTechniqueModal(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-technique-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <h3 id="exercise-technique-title" style={{ margin: 0 }}>{techniqueModal.exercise.name}</h3>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {t("training.techniqueSubtitle")} {techniqueModal.dayLabel}
                </p>
              </div>
              <button type="button" className="btn secondary" onClick={() => setTechniqueModal(null)}>
                {t("ui.closeLabel")}
              </button>
            </div>
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <img
                src="/placeholders/exercise-demo.svg"
                alt={t("training.techniquePlaceholderAlt")}
                style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border)" }}
              />
              <div className="feature-card">
                <strong>{t("ui.technique")}</strong>
                <p className="muted" style={{ marginTop: 6 }}>
                  {t("training.techniquePlaceholder")}
                </p>
                <p style={{ marginTop: 6 }}>
                  {t("training.techniqueSets")}: {techniqueModal.exercise.sets}
                </p>
                {techniqueModal.exercise.reps && (
                  <p className="muted" style={{ marginTop: 4 }}>
                    {t("training.techniqueReps")}: {techniqueModal.exercise.reps}
                  </p>
                )}
              </div>
              <div className="feature-card">
                <strong>{t("ui.tips")}</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  <li>{t("training.techniqueTipOne")}</li>
                  <li>{t("training.techniqueTipTwo")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
