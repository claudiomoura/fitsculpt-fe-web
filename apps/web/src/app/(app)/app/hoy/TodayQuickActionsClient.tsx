"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyBlock, ErrorBlock, LoadingBlock, Stack } from "@/design-system/components";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import type { NutritionPlanDetail, NutritionPlanListItem, TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
import { createTrackingEntry } from "@/services/tracking";

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

  const supportingActions = useMemo(
    () => [
      {
        id: "register-training",
        label: t("quickActions.registerTrainingCta"),
        href: availability.trainingReady ? `/app/entrenamiento?from=hoy&returnTo=${returnToHoy}` : undefined,
      },
      {
        id: "register-food",
        label: t("quickActions.registerFoodCta"),
        href: availability.foodReady ? `/app/macros?from=hoy&returnTo=${returnToHoy}` : undefined,
      },
      {
        id: "view-plan-today",
        label: t("quickActions.viewTodayPlanCta"),
        href: availability.planReady ? `/app/entrenamiento?from=hoy&returnTo=${returnToHoy}` : undefined,
      },
    ],
    [availability.foodReady, availability.planReady, availability.trainingReady, returnToHoy, t],
  );

  if (status === "loading") {
    return <LoadingBlock title={t("quickActions.loadingAria")} centered={false} className="rounded-2xl border border-subtle" />;
  }

  if (status === "error") {
    return (
      <ErrorBlock
        title={t("quickActions.errorTitle")}
        description={t("quickActions.errorDescription")}
        centered={false}
        className="rounded-2xl border border-subtle"
        retryAction={
          <Button variant="secondary" onClick={() => void loadQuickActions()}>
            {t("ui.retry")}
          </Button>
        }
      />
    );
  }

  if (status === "empty") {
    return (
      <EmptyBlock
        title={t("quickActions.emptyTitle")}
        description={t("quickActions.emptyDescription")}
        centered={false}
        className="rounded-2xl border border-subtle"
        action={
          <Button variant="secondary" onClick={() => void loadQuickActions()}>
            {t("ui.retry")}
          </Button>
        }
      />
    );
  }

  const ctaLabel = checkinActionStatus === "success" ? t("quickActions.completeTodayActionDoneCta") : t("quickActions.completeTodayActionCta");
  const ctaOutcome =
    checkinActionStatus === "success"
      ? t("quickActions.completeTodayActionSuccess")
      : checkinActionStatus === "error"
        ? t("quickActions.completeTodayActionError")
        : t("quickActions.completeTodayActionOutcome");

  return (
    <section className="card" aria-live="polite">
      <Stack gap="4">
        <div className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
          {t("today.focusTitle")}
        </div>
        <div>
          <h2 className="section-title section-title-sm">{t("quickActions.completeTodayActionTitle")}</h2>
          <p className="section-subtitle">{t("quickActions.completeTodayActionDescription")}</p>
          <p className="text-sm text-text-muted">{ctaOutcome}</p>
        </div>

        <Button size="lg" onClick={() => void handleLogTodayCheckin()} loading={checkinActionStatus === "loading"}>
          {ctaLabel}
        </Button>

        <Stack gap="2" data-testid="today-actions-grid">
          {supportingActions.map((action) =>
            action.href ? (
              <ButtonLink key={action.id} as={Link} href={action.href} variant="secondary" size="lg" className="w-full">
                {action.label}
              </ButtonLink>
            ) : (
              <Button key={action.id} variant="secondary" size="lg" className="w-full" disabled>
                {action.label}
              </Button>
            ),
          )}
        </Stack>
      </Stack>
    </section>
  );
}
