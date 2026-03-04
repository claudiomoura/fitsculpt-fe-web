"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Stack } from "@/design-system/components";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { createTrackingEntry } from "@/services/tracking";
import type { NutritionPlanDetail, NutritionPlanListItem, TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
import { TodayCard } from "./TodayCard";
import { TodayEmptyState } from "./TodayEmptyState";
import { TodayErrorState } from "./TodayErrorState";
import { TodaySkeleton } from "./TodaySkeleton";

type ViewStatus = "loading" | "success" | "error";
type CheckinActionStatus = "idle" | "loading";

type TodaySignals = {
  trainingReady: boolean;
  nutritionReady: boolean;
  checkinDone: boolean;
};

type TrainingPlansPayload = {
  items?: TrainingPlanListItem[];
};

type NutritionPlansPayload = {
  items?: NutritionPlanListItem[];
};

type TrackingPayload = {
  checkins?: Array<{ date?: string | null }>;
};

const findTodayPlanDay = <T extends { date?: string }>(days: T[], startDate?: string | null) => {
  const todayKey = toDateKey(new Date());
  const dayFromDate = days.find((day) => {
    const parsed = parseDate(day.date);
    return parsed ? toDateKey(parsed) === todayKey : false;
  });
  if (dayFromDate) return dayFromDate;
  const start = parseDate(startDate);
  if (!start) return null;
  const index = differenceInDays(new Date(), start);
  if (index < 0 || index >= days.length) return null;
  return days[index];
};

const hasTodayTraining = (plan?: TrainingPlanDetail | null) => {
  if (!plan?.days?.length) return false;
  return Boolean(findTodayPlanDay(plan.days, plan.startDate));
};

const hasTodayNutrition = (plan?: NutritionPlanDetail | null) => {
  if (!plan?.days?.length) return false;
  const day = findTodayPlanDay(plan.days, plan.startDate);
  return Boolean(day && day.meals.length > 0);
};

const hasCheckinToday = (payload?: TrackingPayload | null) => {
  const todayKey = toDateKey(new Date());
  return Boolean(payload?.checkins?.some((entry) => entry.date === todayKey));
};

export default function TodayQuickActionsClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [signals, setSignals] = useState<TodaySignals>({
    trainingReady: false,
    nutritionReady: false,
    checkinDone: false,
  });
  const [checkinActionStatus, setCheckinActionStatus] = useState<CheckinActionStatus>("idle");

  const loadTodaySignals = useCallback(async () => {
    setStatus("loading");

    try {
      const [trackingResponse, trainingListResponse, nutritionListResponse] = await Promise.all([
        fetch("/api/tracking", { cache: "no-store", credentials: "include" }),
        fetch("/api/training-plans?limit=1", { cache: "no-store", credentials: "include" }),
        fetch("/api/nutrition-plans?limit=1", { cache: "no-store", credentials: "include" }),
      ]);

      if (!trackingResponse.ok && !trainingListResponse.ok && !nutritionListResponse.ok) {
        setStatus("error");
        return;
      }

      let trainingReady = false;
      let nutritionReady = false;
      let checkinDone = false;

      if (trackingResponse.ok) {
        const tracking = (await trackingResponse.json()) as TrackingPayload;
        checkinDone = hasCheckinToday(tracking);
      }

      if (trainingListResponse.ok) {
        const trainingList = (await trainingListResponse.json()) as TrainingPlansPayload;
        const trainingPlanId = trainingList.items?.[0]?.id;
        if (trainingPlanId) {
          const trainingDetailResponse = await fetch(`/api/training-plans/${trainingPlanId}`, {
            cache: "no-store",
            credentials: "include",
          });
          if (trainingDetailResponse.ok) {
            const trainingDetail = (await trainingDetailResponse.json()) as TrainingPlanDetail;
            trainingReady = hasTodayTraining(trainingDetail);
          }
        }
      }

      if (nutritionListResponse.ok) {
        const nutritionList = (await nutritionListResponse.json()) as NutritionPlansPayload;
        const nutritionPlanId = nutritionList.items?.[0]?.id;
        if (nutritionPlanId) {
          const nutritionDetailResponse = await fetch(`/api/nutrition-plans/${nutritionPlanId}`, {
            cache: "no-store",
            credentials: "include",
          });
          if (nutritionDetailResponse.ok) {
            const nutritionDetail = (await nutritionDetailResponse.json()) as NutritionPlanDetail;
            nutritionReady = hasTodayNutrition(nutritionDetail);
          }
        }
      }

      setSignals({ trainingReady, nutritionReady, checkinDone });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTodaySignals();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadTodaySignals]);


  const handleLogTodayCheckin = useCallback(async () => {
    if (checkinActionStatus === "loading") return;

    setCheckinActionStatus("loading");

    const now = new Date();
    const todayDate = toDateKey(now);
    const timestamp = now.getTime();

    try {
      await createTrackingEntry("checkins", {
        id: `today-checkin-${timestamp}`,
        date: todayDate,
        weightKg: 0,
        chestCm: 0,
        waistCm: 0,
        hipsCm: 0,
        bicepsCm: 0,
        thighCm: 0,
        calfCm: 0,
        neckCm: 0,
        bodyFatPercent: 0,
        energy: 0,
        hunger: 0,
        notes: t("quickActions.todayActionDefaultNotes"),
        recommendation: t("quickActions.todayActionDefaultRecommendation"),
        frontPhotoUrl: null,
        sidePhotoUrl: null,
      });
      setSignals((previous) => ({ ...previous, checkinDone: true }));
      notify({ title: t("today.hubSuccessToast"), variant: "success" });
    } finally {
      setCheckinActionStatus("idle");
    }
  }, [checkinActionStatus, notify, t]);

  const completedCount = useMemo(
    () => [signals.trainingReady, signals.nutritionReady, signals.checkinDone].filter(Boolean).length,
    [signals.checkinDone, signals.nutritionReady, signals.trainingReady],
  );

  const progressLabel = t("today.hubProgress", { completed: completedCount, total: 3 });
  const showEmptyBanner = status === "success" && completedCount === 0;

  return (
    <section className="card" aria-live="polite" data-testid="today-wow-hub">
      <Stack gap="4">
        <header>
          <h1 className="section-title">{t("today.hubTitle")}</h1>
          <p className="section-subtitle">{t("today.hubSubtitle")}</p>
          <p className="mt-2 text-sm font-semibold text-text" data-testid="today-progress">
            {progressLabel}
          </p>
          <p className="mt-1 text-xs text-text-muted">{t("today.progressHeuristicDisclaimer")}</p>
        </header>

        {status === "loading" ? (
          <>
            <p className="m-0 text-sm text-text-muted">{t("today.hubLoadingMessage")}</p>
            <TodaySkeleton />
          </>
        ) : null}

        {status === "error" ? (
          <TodayErrorState message={t("today.hubErrorMessage")} retryLabel={t("ui.retry")} onRetry={() => void loadTodaySignals()} />
        ) : null}

        {status === "success" ? (
          <>
            {showEmptyBanner ? (
              <TodayEmptyState
                description={t("today.hubEmptyDescription")}
                ctaLabel={t("today.hubEmptyCta")}
                href="/app/entrenamientos"
              />
            ) : null}

            <section className="grid gap-3 md:grid-cols-3" data-testid="today-actions-grid">
              <TodayCard
                title={t("today.cardCheckinTitle")}
                subtitle={t("today.cardCheckinSubtitle")}
                body={signals.checkinDone ? t("today.cardCheckinReady") : t("today.cardCheckinEmpty")}
                ctaLabel={t("quickActions.completeTodayActionCta")}
                onClick={() => void handleLogTodayCheckin()}
                loading={checkinActionStatus === "loading"}
                progressLabel={signals.checkinDone ? t("today.cardCompleted") : t("today.cardPending")}
              />
              <TodayCard
                title={t("today.cardTrainingTitle")}
                subtitle={t("today.cardTrainingSubtitle")}
                body={signals.trainingReady ? t("today.cardTrainingReady") : t("today.cardTrainingEmpty")}
                ctaLabel={t("today.cardTrainingCta")}
                href="/app/entrenamiento"
                progressLabel={signals.trainingReady ? t("today.cardCompleted") : t("today.cardPending")}
              />
              <TodayCard
                title={t("today.cardNutritionTitle")}
                subtitle={t("today.cardNutritionSubtitle")}
                body={signals.nutritionReady ? t("today.cardNutritionReady") : t("today.cardNutritionEmpty")}
                ctaLabel={t("today.cardNutritionCta")}
                href="/app/nutricion"
                progressLabel={signals.nutritionReady ? t("today.cardCompleted") : t("today.cardPending")}
              />
            </section>
          </>
        ) : null}
      </Stack>
    </section>
  );
}
