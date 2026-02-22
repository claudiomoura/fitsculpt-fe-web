"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import FeatureUnavailableState from "@/components/access/FeatureUnavailableState";
import { canAccessFeature } from "@/lib/entitlements";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { useWeeklyReview } from "@/lib/useWeeklyReview";
import { useLanguage } from "@/context/LanguageProvider";
import type { WeeklyReviewRecommendation } from "@/types/weeklyReview";
import { trackWeeklyReviewEvent } from "@/lib/weeklyReviewTelemetry";

type RecommendationStatus = "idle" | "accepted" | "dismissed";

const AI_RECOMMENDATION_IDS = new Set<WeeklyReviewRecommendation["id"]>(["balance-recovery", "keep-momentum"]);

function formatDate(value: string, locale: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", { day: "2-digit", month: "short" }).format(parsed);
}

export default function WeeklyReviewClient() {
  const { t, locale } = useLanguage();
  const { entitlements } = useAuthEntitlements();
  const { data, loading, error, notSupported, reload } = useWeeklyReview();
  const [decisions, setDecisions] = useState<Record<string, RecommendationStatus>>({});

  const visibleRecommendations = useMemo(() => {
    const recommendations = data?.recommendations ?? [];
    return recommendations.slice(0, 3);
  }, [data]);


  useEffect(() => {
    trackWeeklyReviewEvent({ event: "weekly_review_opened", timestamp: new Date().toISOString() });
  }, []);
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

  if (!data || visibleRecommendations.length === 0) {
    return (
      <EmptyState
        title={t("weeklyReview.emptyTitle")}
        description={t("weeklyReview.emptyDescription")}
        actions={[{ label: t("weeklyReview.emptyCta"), href: "/app/hoy", variant: "primary" }]}
        wrapInCard
      />
    );
  }

  const hasAiAccess = canAccessFeature(entitlements, "ai");

  return (
    <div className="space-y-4">
      <section className="card">
        <h2 className="section-title section-title-sm">{t("weeklyReview.summaryTitle")}</h2>
        <p className="section-subtitle">
          {formatDate(data.summary.rangeStart, locale)} - {formatDate(data.summary.rangeEnd, locale)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <article className="rounded-xl border border-[var(--border)] p-3">
            <p className="text-[var(--muted)]">{t("weeklyReview.summaryCheckins")}</p>
            <p className="text-lg font-semibold">{data.summary.checkinsCount}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)] p-3">
            <p className="text-[var(--muted)]">{t("weeklyReview.summaryWorkouts")}</p>
            <p className="text-lg font-semibold">{data.summary.workoutsCount}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)] p-3">
            <p className="text-[var(--muted)]">{t("weeklyReview.summaryNutrition")}</p>
            <p className="text-lg font-semibold">{data.summary.nutritionLogsCount}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)] p-3">
            <p className="text-[var(--muted)]">{t("weeklyReview.summaryEnergy")}</p>
            <p className="text-lg font-semibold">{data.summary.averageEnergy ?? "-"}</p>
          </article>
        </div>
      </section>

      <section className="space-y-3">
        {visibleRecommendations.map((recommendation) => {
          const requiresAi = AI_RECOMMENDATION_IDS.has(recommendation.id);
          const locked = requiresAi && !hasAiAccess;
          const status = decisions[recommendation.id] ?? "idle";

          return (
            <article key={recommendation.id} className="card space-y-3">
              <div>
                <h3 className="section-title section-title-sm">{recommendation.title}</h3>
                <p className="section-subtitle">{recommendation.why}</p>
              </div>

              {locked ? (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm">
                  <p className="mb-2 text-[var(--muted)]">{t("weeklyReview.lockedDescription")}</p>
                  <ButtonLink href="/app/settings/billing" variant="secondary" size="sm">
                    {t("weeklyReview.lockedCta")}
                  </ButtonLink>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      trackWeeklyReviewEvent({
                        event: "weekly_review_recommendation_decision",
                        timestamp: new Date().toISOString(),
                        recommendationId: recommendation.id,
                        decision: "accepted",
                      });
                      setDecisions((prev) => ({ ...prev, [recommendation.id]: "accepted" }));
                    }}
                  >
                    {t("weeklyReview.accept")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      trackWeeklyReviewEvent({
                        event: "weekly_review_recommendation_decision",
                        timestamp: new Date().toISOString(),
                        recommendationId: recommendation.id,
                        decision: "dismissed",
                      });
                      setDecisions((prev) => ({ ...prev, [recommendation.id]: "dismissed" }));
                    }}
                  >
                    {t("weeklyReview.nowNo")}
                  </Button>
                  {status !== "idle" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDecisions((prev) => ({ ...prev, [recommendation.id]: "idle" }))}
                    >
                      {t("weeklyReview.undo")}
                    </Button>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
