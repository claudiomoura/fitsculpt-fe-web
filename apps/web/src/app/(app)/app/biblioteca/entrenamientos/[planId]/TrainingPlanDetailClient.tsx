"use client";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanDetail } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type TrainingPlanDetailClientProps = {
  plan: TrainingPlanDetail | null;
  error: string | null;
  backHref?: string;
  backLabel?: string;
};

export default function TrainingPlanDetailClient({
  plan,
  error,
  backHref = "/app/biblioteca/entrenamientos",
  backLabel,
}: TrainingPlanDetailClientProps) {
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

  const dayCards = (() => {
    if (!plan?.days?.length) return [];
    const formatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      month: "short",
      day: "numeric",
    });
    return plan.days.map((day) => ({
      ...day,
      dateLabel: day.date ? formatter.format(new Date(day.date)) : "",
    }));
  })();

  if (error || !plan) {
    return (
      <section className="card centered-card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Icon name="warning" />
          </div>
          <div>
            <h3 className="m-0">{t("trainingPlans.errorTitle")}</h3>
            <p className="muted">{error ?? t("trainingPlans.loadError")}</p>
          </div>
          <ButtonLink variant="secondary" href={backHref}>
            {backLabel ?? t("trainingPlans.backToTrainingPlans")}
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <section className="card centered-card">
      <div className="page-header">
        <div className="page-header-body">
          <h2 className="section-title">{plan.title}</h2>
          <p className="section-subtitle">{t("trainingPlans.detailSubtitle")}</p>
        </div>
        <div className="page-header-actions">
          <ButtonLink variant="secondary" href={backHref}>
            {backLabel ?? t("trainingPlans.backToTrainingPlans")}
          </ButtonLink>
        </div>
      </div>

      <div className="badge-list mt-8">
        <span className="badge">{goalLabel(plan.goal)}</span>
        <span className="badge">{levelLabel(plan.level)}</span>
        <span className="badge">
          {t("training.daysPerWeek")}: {plan.daysPerWeek}
        </span>
        <span className="badge">{focusLabel(plan.focus)}</span>
        <span className="badge">{equipmentLabel(plan.equipment)}</span>
      </div>

      {plan.notes ? <p className="muted mt-12">{plan.notes}</p> : null}

      <div className="mt-24">
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
