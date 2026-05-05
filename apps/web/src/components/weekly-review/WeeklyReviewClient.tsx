"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import FeatureUnavailableState from "@/components/access/FeatureUnavailableState";
import WeeklyCoachCheckInCard from "@/components/weekly-adaptive-coach/WeeklyCoachCheckInCard";
import { useWeeklyReview } from "@/lib/useWeeklyReview";
import { useLanguage } from "@/context/LanguageProvider";
import { sendRctEvent } from "@/services/futureProjection";
import { submitWeeklyReviewDecision } from "@/services/weeklyReview";
import { trackWeeklyReviewEvent } from "@/lib/weeklyReviewTelemetry";
import type { WeeklyReviewRecommendation, WeeklyReviewResponse } from "@/types/weeklyReview";

function formatDate(value: string, locale: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale === "pt" ? "pt-PT" : "en-US", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function formatDelta(value: number | null, suffix = ""): string {
  if (value === null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

function getToneClasses(type: WeeklyReviewRecommendation["type"]): string {
  if (type === "training") return "border-[rgba(255,107,53,0.35)] bg-[linear-gradient(135deg,rgba(255,107,53,0.16),rgba(255,255,255,0.96))]";
  if (type === "nutrition") return "border-[rgba(0,150,136,0.30)] bg-[linear-gradient(135deg,rgba(0,150,136,0.16),rgba(255,255,255,0.96))]";
  return "border-[rgba(33,150,243,0.28)] bg-[linear-gradient(135deg,rgba(33,150,243,0.14),rgba(255,255,255,0.96))]";
}

function getBadgeLabel(recommendation: WeeklyReviewRecommendation, t: (key: string) => string): string {
  if (recommendation.type === "training") return t("weeklyReview.typeTraining");
  if (recommendation.type === "nutrition") return t("weeklyReview.typeNutrition");
  return t("weeklyReview.typeHabit");
}

export default function WeeklyReviewClient() {
  const { t, locale } = useLanguage();
  const { data, loading, error, notSupported, reload } = useWeeklyReview();
  const [review, setReview] = useState<WeeklyReviewResponse | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [pendingRecommendationId, setPendingRecommendationId] = useState<string | null>(null);
  const [showDecisionReadinessDetails, setShowDecisionReadinessDetails] = useState(false);
  const seenKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setReview(data);
  }, [data]);

  const primaryRecommendation = useMemo(() => (review?.recommendations ?? [])[0] ?? null, [review]);
  const visibleRecommendations = useMemo(() => (review?.recommendations ?? []).slice(0, 3), [review]);

  useEffect(() => {
    if (!review) return;
    trackWeeklyReviewEvent({
      event: "weekly_review_opened",
      timestamp: new Date().toISOString(),
      weekKey: review.summary.weekKey,
    });
  }, [review]);

  useEffect(() => {
    if (!review) return;
    visibleRecommendations.forEach((recommendation) => {
      const key = `${review.summary.weekKey}:${recommendation.id}`;
      if (seenKeysRef.current.has(key)) return;
      seenKeysRef.current.add(key);
      trackWeeklyReviewEvent({
        event: "recommendation_seen",
        timestamp: new Date().toISOString(),
        weekKey: review.summary.weekKey,
        recommendationId: recommendation.id,
        recommendationType: recommendation.type,
      });
    });
  }, [review, visibleRecommendations]);

  if (loading) {
    return <LoadingState title={t("weeklyReview.loadingTitle")} ariaLabel={t("ui.loading")} lines={4} />;
  }

  if (notSupported) {
    return <FeatureUnavailableState title={t("weeklyReview.unavailableTitle")} description={t("weeklyReview.unavailableDescription")} backHref="/app" />;
  }

  if (error) {
    return (
      <ErrorState
        title={t("weeklyReview.errorTitle")}
        description={t("weeklyReview.errorDescription")}
        retryLabel={t("common.retry")}
        onRetry={() => void reload()}
        wrapInCard
      />
    );
  }

  if (!review) {
    return (
      <EmptyState
        title={t("weeklyReview.emptyTitle")}
        description={t("weeklyReview.emptyDescription")}
        actions={[{ label: t("weeklyReview.emptyCta"), href: "/app/hoy", variant: "primary" }]}
        wrapInCard
      />
    );
  }

  const hasPendingDecision = (review?.recommendations ?? []).some((r) => r.decision === "pending");
  const hasAcceptedDecision = (review?.recommendations ?? []).some((r) => r.decision === "accepted");

  async function handleDecision(recommendation: WeeklyReviewRecommendation, decision: "accepted" | "rejected") {
    if (!review) return;
    setDecisionError(null);
    setPendingRecommendationId(recommendation.id);
    const result = await submitWeeklyReviewDecision({
      weekKey: review.summary.weekKey,
      recommendationId: recommendation.id,
      decision,
    });
    setPendingRecommendationId(null);

    if (!result.ok) {
      setDecisionError(t("weeklyReview.decisionError"));
      return;
    }

    setReview(result.data);
    trackWeeklyReviewEvent({
      event: decision === "accepted" ? "adjustment_accepted" : "adjustment_rejected",
      timestamp: new Date().toISOString(),
      weekKey: result.data.summary.weekKey,
      recommendationId: recommendation.id,
      recommendationType: recommendation.type,
    });
    void sendRctEvent({
      event: decision === "accepted" ? "recommendation_accepted" : "recommendation_rejected",
      context: {
        source: "weekly_review",
        recommendationId: recommendation.id,
        recommendationType: recommendation.type,
      },
    });
  }

  return (
    <div className="space-y-4">
      <section className="card overflow-hidden border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(255,245,235,1),rgba(255,255,255,0.92)_55%,rgba(232,244,255,0.92))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{t("weeklyReview.kicker")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text)]">{t("weeklyReview.summaryTitle")}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatDate(review.summary.rangeStart, locale)} - {formatDate(review.summary.rangeEnd, locale)}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text)]">{t("weeklyReview.heroDescription")}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("weeklyReview.compareLabel")}</p>
            <p className="mt-1 text-sm font-medium text-[var(--text)]">
              {formatDate(review.summary.previousRangeStart, locale)} - {formatDate(review.summary.previousRangeEnd, locale)}
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <button
          type="button"
          onClick={() => setShowDecisionReadinessDetails(!showDecisionReadinessDetails)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{t("weeklyReview.decisionReadinessTitle")}</p>
            <p className="mt-1 text-sm text-[var(--text)]">
              {hasAcceptedDecision
                ? t("weeklyReview.decisionReadinessCompleted")
                : hasPendingDecision
                  ? t("weeklyReview.decisionReadinessPending")
                  : t("weeklyReview.decisionReadinessAction")}
            </p>
          </div>
          <span className="text-[var(--muted)]">{showDecisionReadinessDetails ? "−" : "+"}</span>
        </button>
        {showDecisionReadinessDetails && (
          <div className="mt-4">
            <WeeklyCoachCheckInCard />
          </div>
        )}
      </section>

      <section className="card overflow-hidden border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(255,245,235,1),rgba(255,255,255,0.92)_55%,rgba(232,244,255,0.92))]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("weeklyReview.summaryAdherence")}</p>
            <p className="mt-2 text-2xl font-semibold">{review.summary.trainingAdherencePct}%</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{review.summary.workoutsCount}/{review.summary.trainingTargetSessions || 0} {t("weeklyReview.summarySessionsSuffix")} · {t("weeklyReview.summaryManualLabel")}: {review.summary.manualTrainingAdherencePct}%</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("weeklyReview.summaryNutritionDays")}</p>
            <p className="mt-2 text-2xl font-semibold">{review.summary.mealLoggingDays}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("weeklyReview.summaryNutritionDaysHint")}</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("weeklyReview.summaryWeightDelta")}</p>
            <p className="mt-2 text-2xl font-semibold">{formatDelta(review.summary.weightChangeKg, " kg")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{formatDelta(review.summary.weightChangePct, "%")}</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("weeklyReview.summaryWaistDelta")}</p>
            <p className="mt-2 text-2xl font-semibold">{formatDelta(review.summary.waistChangeCm, " cm")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("weeklyReview.summaryEnergy")}: {review.summary.averageEnergy ?? "-"}/5</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("weeklyReview.summaryPassiveDays")}</p>
            <p className="mt-2 text-2xl font-semibold">{review.summary.passiveActiveDays}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{review.summary.passiveActiveMinutes} min</p>
          </article>
          <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("weeklyReview.summaryPassiveSupport")}</p>
            <p className="mt-2 text-2xl font-semibold">+{review.summary.passiveAdherenceSupportPct}%</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{review.summary.passiveStepsTotal.toLocaleString()} {t("weeklyReview.summaryStepsSuffix")}</p>
          </article>
        </div>

        <div className="mt-4 rounded-2xl border border-white/70 bg-white/72 px-4 py-3 text-sm text-[var(--text)]">
          <p>{t("weeklyReview.passiveComplementNote")}</p>
        </div>
      </section>

      {decisionError ? <div className="card border border-[rgba(194,65,12,0.18)] bg-[rgba(255,247,237,0.92)] text-sm text-[rgb(154,52,18)]">{decisionError}</div> : null}

      {primaryRecommendation ? (
        <article className={`card border ${getToneClasses(primaryRecommendation.type)} shadow-[0_18px_50px_rgba(15,23,42,0.06)]`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-flex rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {getBadgeLabel(primaryRecommendation, t)}
              </span>
              <h3 className="mt-3 text-xl font-semibold text-[var(--text)]">{primaryRecommendation.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text)]">{primaryRecommendation.recommendation}</p>
            </div>
            {primaryRecommendation.decision !== "pending" ? (
              <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text)]">
                {primaryRecommendation.decision === "accepted" ? t("weeklyReview.statusAccepted") : t("weeklyReview.statusRejected")}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/80 bg-white/78 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("weeklyReview.whyTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text)]">{primaryRecommendation.why}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {primaryRecommendation.metrics.map((item) => (
                    <span key={`${primaryRecommendation.id}-${item.label}`} className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--text)]">
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/78 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("weeklyReview.reasoningTitle")}</p>
                <div className="mt-3 space-y-2">
                  {primaryRecommendation.reasoning.map((item, index) => (
                    <p key={`${primaryRecommendation.id}-reason-${index}`} className="text-sm leading-6 text-[var(--text)]">{item}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/80 bg-white/78 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("weeklyReview.safetyTitle")}</p>
                <div className="mt-3 space-y-2">
                  {primaryRecommendation.safetyNotes.map((item, index) => (
                    <p key={`${primaryRecommendation.id}-safety-${index}`} className="text-sm leading-6 text-[var(--text)]">{item}</p>
                  ))}
                </div>
              </div>

              {primaryRecommendation.decision === "pending" && (
                <div className="rounded-2xl border border-white/80 bg-white/78 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="primary" size="sm" onClick={() => void handleDecision(primaryRecommendation, "accepted")} disabled={pendingRecommendationId !== null}>
                      {pendingRecommendationId !== null ? t("weeklyReview.saving") : t("weeklyReview.accept")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void handleDecision(primaryRecommendation, "rejected")} disabled={pendingRecommendationId !== null}>
                      {t("weeklyReview.keepCurrent")}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{t("weeklyReview.noSilentChanges")}</p>
                </div>
              )}
            </div>
          </div>
        </article>
      ) : null}

      {(!primaryRecommendation || primaryRecommendation.decision !== "pending") && visibleRecommendations.length > 1 ? (
        <section className="card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("weeklyReview.otherRecommendationsTitle")}</p>
          <div className="mt-3 space-y-3">
            {visibleRecommendations.slice(1).map((recommendation) => {
              const isPending = pendingRecommendationId === recommendation.id;
              const isResolved = recommendation.decision !== "pending";

              return (
                <article key={recommendation.id} className={`rounded-2xl border ${getToneClasses(recommendation.type)} p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        {getBadgeLabel(recommendation, t)}
                      </span>
                      <p className="mt-2 text-sm font-medium text-[var(--text)]">{recommendation.title}</p>
                    </div>
                    {isResolved ? (
                      <span className="rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-xs font-medium text-[var(--text)]">
                        {recommendation.decision === "accepted" ? t("weeklyReview.statusAccepted") : t("weeklyReview.statusRejected")}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}