"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanDetail } from "@/lib/types";

type TrainingPlanDetailClientProps = {
  plan: TrainingPlanDetail | null;
  error: string | null;
};

export default function TrainingPlanDetailClient({ plan, error }: TrainingPlanDetailClientProps) {
  const { t, locale } = useLanguage();

  const goalLabel = (goal: string) =>
    goal === "cut" ? t("training.goalCut") : goal === "bulk" ? t("training.goalBulk") : t("training.goalMaintain");
  const levelLabel = (level: string) =>
    level === "beginner"
      ? t("training.levelBeginner")
      : level === "advanced"
        ? t("training.levelAdvanced")
        : t("training.levelIntermediate");
  const focusLabel = (focus: string) =>
    focus === "ppl"
      ? t("training.focusPushPullLegs")
      : focus === "upperLower"
        ? t("training.focusUpperLower")
        : t("training.focusFullBody");
  const equipmentLabel = (equipment: string) =>
    equipment === "gym" ? t("training.equipmentGym") : t("training.equipmentHome");

  const dayCards = useMemo(() => {
    if (!plan?.days?.length) return [];
    const formatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      month: "short",
      day: "numeric",
    });
    return plan.days.map((day) => ({
      ...day,
      dateLabel: day.date ? formatter.format(new Date(day.date)) : "",
    }));
  }, [plan?.days, locale]);

  if (error || !plan) {
    return (
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <p className="muted">{error ?? t("trainingPlans.loadError")}</p>
        <Link className="btn secondary" href="/app/biblioteca/entrenamientos">
          {t("trainingPlans.backToTrainingPlans")}
        </Link>
      </section>
    );
  }

  return (
    <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="form-stack">
        <Link className="muted" href="/app/biblioteca/entrenamientos">
          {t("trainingPlans.backToTrainingPlans")}
        </Link>
        <h2 className="section-title" style={{ marginTop: 4 }}>{plan.title}</h2>
        <p className="section-subtitle">{t("trainingPlans.detailSubtitle")}</p>
        <div className="badge-list" style={{ marginTop: 8 }}>
          <span className="badge">{goalLabel(plan.goal)}</span>
          <span className="badge">{levelLabel(plan.level)}</span>
          <span className="badge">
            {t("training.daysPerWeek")}: {plan.daysPerWeek}
          </span>
          <span className="badge">{focusLabel(plan.focus)}</span>
          <span className="badge">{equipmentLabel(plan.equipment)}</span>
        </div>
      </div>

      {plan.notes ? <p className="muted" style={{ marginTop: 12 }}>{plan.notes}</p> : null}

      <div style={{ marginTop: 24 }}>
        {dayCards.length === 0 ? (
          <p className="muted">{t("trainingPlans.empty")}</p>
        ) : (
          <div className="form-stack">
            {dayCards.map((day) => (
              <div key={day.id} className="calendar-day-card">
                <div className="calendar-day-card-header">
                  <strong>{day.label}</strong>
                  {day.dateLabel ? <span className="muted">{day.dateLabel}</span> : null}
                </div>
                <div className="calendar-day-card-body">
                  <p className="muted">
                    {day.focus} · {day.duration} {t("training.minutesLabel")}
                  </p>
                  <ul className="list">
                    {day.exercises.map((exercise) => (
                      <li key={exercise.id}>
                        <strong>{exercise.name}</strong>{" "}
                        <span className="muted">
                          {exercise.reps ? `${exercise.sets} x ${exercise.reps}` : exercise.sets}
                        </span>
                        {exercise.notes ? <span className="muted"> · {exercise.notes}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
