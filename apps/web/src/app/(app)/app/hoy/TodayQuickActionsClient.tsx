"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QuickActionsGrid, { type TodayQuickAction } from "@/components/today/QuickActionsGrid";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import type { NutritionPlanDetail, NutritionPlanListItem, TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";

type ViewStatus = "loading" | "success" | "empty" | "error";

type ActionAvailability = {
  checkinReady: boolean;
  trainingReady: boolean;
  macrosReady: boolean;
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
    checkinReady: false,
    trainingReady: false,
    macrosReady: false,
  });

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
      let macrosReady = false;

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
            macrosReady = hasTodayNutrition(nutritionDetail);
          }
        }
      }

      const checkinReady = trackingResponse.ok;
      const nextAvailability = { checkinReady, trainingReady, macrosReady };
      setAvailability(nextAvailability);

      const hasEnabledAction = Object.values(nextAvailability).some(Boolean);
      setStatus(hasEnabledAction ? "success" : "empty");
    } catch (_err) {
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

  const returnToHoy = encodeURIComponent("/app/hoy");
  const actions = useMemo<TodayQuickAction[]>(() => {
    return [
      {
        id: "checkin",
        title: t("quickActions.checkinTitle"),
        description: t("quickActions.checkinDescription"),
        outcome: t("quickActions.checkinOutcome"),
        ctaLabel: t("quickActions.checkinCta"),
        href: availability.checkinReady ? `/app/seguimiento?from=hoy&returnTo=${returnToHoy}#checkin-entry` : undefined,
        disabledHint: t("quickActions.checkinUnavailable"),
      },
      {
        id: "training",
        title: t("quickActions.openTraining"),
        description: t("quickActions.openTrainingDescription"),
        outcome: t("quickActions.trainingOutcome"),
        ctaLabel: t("quickActions.openPlanCta"),
        href: availability.trainingReady ? `/app/entrenamiento?from=hoy&returnTo=${returnToHoy}` : undefined,
        disabledHint: t("quickActions.trainingUnavailable"),
      },
      {
        id: "macros",
        title: t("quickActions.openNutrition"),
        description: t("quickActions.openNutritionDescription"),
        outcome: t("quickActions.macrosOutcome"),
        ctaLabel: t("quickActions.openMacrosCta"),
        href: availability.macrosReady ? `/app/macros?from=hoy&returnTo=${returnToHoy}` : undefined,
        disabledHint: t("quickActions.macrosUnavailable"),
      },
    ];
  }, [availability, returnToHoy, t]);

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
