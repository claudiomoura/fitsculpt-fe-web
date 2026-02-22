"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createTrackingEntry } from "@/services/tracking";
import QuickActionsGrid, { type TodayQuickAction } from "@/components/today/QuickActionsGrid";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import type { NutritionPlanDetail, NutritionPlanListItem, TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";

type ViewStatus = "loading" | "success" | "empty" | "error";
type CheckinActionStatus = "idle" | "loading" | "success" | "error";

type ActionAvailability = {
  trainingReady: boolean;
  foodReady: boolean;
  planReady: boolean;
  checkinReady: boolean;
};

type TrainingPlansPayload = {
  items?: TrainingPlanListItem[];
};

type NutritionPlansPayload = {
  items?: NutritionPlanListItem[];
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

export default function TodayQuickActionsClient() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [availability, setAvailability] = useState<ActionAvailability>({
    trainingReady: false,
    foodReady: false,
    planReady: false,
    checkinReady: true,
  });
  const [checkinActionStatus, setCheckinActionStatus] = useState<CheckinActionStatus>("idle");

  const loadQuickActions = useCallback(async () => {
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
      let foodReady = trackingResponse.ok;

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
            foodReady = foodReady || hasTodayNutrition(nutritionDetail);
          }
        }
      }

      const planReady = trainingReady || foodReady;
      const nextAvailability = { trainingReady, foodReady, planReady, checkinReady: true };
      setAvailability(nextAvailability);

      const hasEnabledAction = Object.values(nextAvailability).some(Boolean);
      setStatus(hasEnabledAction ? "success" : "empty");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuickActions();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadQuickActions]);



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
      setCheckinActionStatus("success");
    } catch {
      setCheckinActionStatus("error");
    }
  }, [checkinActionStatus, t]);

  const returnToHoy = encodeURIComponent("/app/hoy");
  const actions = useMemo<TodayQuickAction[]>(() => {
    return [
      {
        id: "complete-today-action",
        title: t("quickActions.completeTodayActionTitle"),
        description: t("quickActions.completeTodayActionDescription"),
        outcome:
          checkinActionStatus === "success"
            ? t("quickActions.completeTodayActionSuccess")
            : checkinActionStatus === "error"
              ? t("quickActions.completeTodayActionError")
              : t("quickActions.completeTodayActionOutcome"),
        ctaLabel:
          checkinActionStatus === "success"
            ? t("quickActions.completeTodayActionDoneCta")
            : t("quickActions.completeTodayActionCta"),
        onClick: availability.checkinReady ? () => void handleLogTodayCheckin() : undefined,
        loading: checkinActionStatus === "loading",
        disabledHint: t("quickActions.completeTodayActionUnavailable"),
      },
      {
        id: "register-training",
        title: t("quickActions.registerTrainingTitle"),
        description: t("quickActions.registerTrainingDescription"),
        outcome: t("quickActions.registerTrainingOutcome"),
        ctaLabel: t("quickActions.registerTrainingCta"),
        href: availability.trainingReady ? `/app/entrenamiento?from=hoy&returnTo=${returnToHoy}` : undefined,
        disabledHint: t("quickActions.registerTrainingUnavailable"),
      },
      {
        id: "register-food",
        title: t("quickActions.registerFoodTitle"),
        description: t("quickActions.registerFoodDescription"),
        outcome: t("quickActions.registerFoodOutcome"),
        ctaLabel: t("quickActions.registerFoodCta"),
        href: availability.foodReady ? `/app/macros?from=hoy&returnTo=${returnToHoy}` : undefined,
        disabledHint: t("quickActions.registerFoodUnavailable"),
      },
      {
        id: "view-plan-today",
        title: t("quickActions.viewTodayPlanTitle"),
        description: t("quickActions.viewTodayPlanDescription"),
        outcome: t("quickActions.viewTodayPlanOutcome"),
        ctaLabel: t("quickActions.viewTodayPlanCta"),
        href: availability.planReady ? `/app/entrenamiento?from=hoy&returnTo=${returnToHoy}` : undefined,
        disabledHint: t("quickActions.viewTodayPlanUnavailable"),
      },
    ];
  }, [availability, checkinActionStatus, handleLogTodayCheckin, returnToHoy, t]);

  if (status === "loading") {
    return <LoadingState ariaLabel={t("quickActions.loadingAria")} lines={4} showCard={false} />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title={t("quickActions.errorTitle")}
        description={t("quickActions.errorDescription")}
        actions={[{ label: t("ui.retry"), onClick: () => void loadQuickActions(), variant: "secondary" }]}
      />
    );
  }

  if (status === "empty") {
    return (
      <EmptyState
        title={t("quickActions.emptyTitle")}
        description={t("quickActions.emptyDescription")}
        actions={[{ label: t("ui.retry"), onClick: () => void loadQuickActions(), variant: "secondary" }]}
      />
    );
  }

  return <QuickActionsGrid actions={actions} />;
}
