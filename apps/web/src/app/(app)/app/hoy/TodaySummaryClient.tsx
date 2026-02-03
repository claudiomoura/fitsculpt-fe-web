"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/exercise-library/states/EmptyState";
import { ErrorState } from "@/components/exercise-library/states/ErrorState";
import { TodayNutritionSkeleton, TodayTrainingSkeleton, TodayWeightSkeleton } from "@/components/today/TodaySummarySkeletons";
import { TodayNutritionSummary, type TodayNutritionSummaryData } from "@/components/today/TodayNutritionSummary";
import { TodaySectionCard } from "@/components/today/TodaySectionCard";
import { TodayTrainingSummary, type TodayTrainingSummaryData } from "@/components/today/TodayTrainingSummary";
import { TodayWeightSummary, type TodayWeightSummaryData } from "@/components/today/TodayWeightSummary";
import { ButtonLink } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import type { NutritionPlanData, ProfileData, TrainingPlanData } from "@/lib/profile";

type CheckinEntry = {
  date: string;
  weightKg: number;
};

type TrackingPayload = {
  checkins?: CheckinEntry[];
};

type SectionStatus = "loading" | "error" | "empty" | "ready";

type SectionState<T> = {
  status: SectionStatus;
  data?: T;
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

const buildTrainingSummary = (plan?: TrainingPlanData | null): TodayTrainingSummaryData | null => {
  if (!plan?.days?.length) return null;
  const day = findTodayPlanDay(plan.days, plan.startDate);
  if (!day) return null;
  return {
    label: day.label,
    focus: day.focus,
    duration: day.duration,
  };
};

const buildNutritionSummary = (plan?: NutritionPlanData | null): TodayNutritionSummaryData | null => {
  if (!plan?.days?.length) return null;
  const day = findTodayPlanDay(plan.days, plan.startDate);
  if (!day) return null;
  return {
    label: day.dayLabel,
    meals: day.meals.length,
    calories: plan.dailyCalories,
  };
};

const getLatestWeight = (checkins: CheckinEntry[]): TodayWeightSummaryData | null => {
  if (!checkins.length) return null;
  const latest = [...checkins].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (!latest) return null;
  return { weightKg: latest.weightKg, date: latest.date };
};

export default function TodaySummaryClient() {
  const { t } = useLanguage();
  const mountedRef = useRef(true);
  const [trainingState, setTrainingState] = useState<SectionState<TodayTrainingSummaryData>>({ status: "loading" });
  const [nutritionState, setNutritionState] = useState<SectionState<TodayNutritionSummaryData>>({ status: "loading" });
  const [weightState, setWeightState] = useState<SectionState<TodayWeightSummaryData>>({ status: "loading" });

  const loadProfile = useCallback(async () => {
    setTrainingState({ status: "loading" });
    setNutritionState({ status: "loading" });

    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) throw new Error("PROFILE_ERROR");
      const data = (await response.json()) as ProfileData;
      if (!mountedRef.current) return;

      const trainingSummary = buildTrainingSummary(data.trainingPlan);
      const nutritionSummary = buildNutritionSummary(data.nutritionPlan);

      setTrainingState(trainingSummary ? { status: "ready", data: trainingSummary } : { status: "empty" });
      setNutritionState(nutritionSummary ? { status: "ready", data: nutritionSummary } : { status: "empty" });
    } catch {
      if (!mountedRef.current) return;
      setTrainingState({ status: "error" });
      setNutritionState({ status: "error" });
    }
  }, []);

  const loadTracking = useCallback(async () => {
    setWeightState({ status: "loading" });

    try {
      const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("TRACKING_ERROR");
      const data = (await response.json()) as TrackingPayload;
      if (!mountedRef.current) return;
      const latestWeight = getLatestWeight(data.checkins ?? []);
      setWeightState(latestWeight ? { status: "ready", data: latestWeight } : { status: "empty" });
    } catch {
      if (!mountedRef.current) return;
      setWeightState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadProfile();
    void loadTracking();
    return () => {
      mountedRef.current = false;
    };
  }, [loadProfile, loadTracking]);

  const trainingAction = useMemo(
    () => (
      <ButtonLink variant="secondary" href="/app/entrenamiento">
        {t("today.trainingCta")}
      </ButtonLink>
    ),
    [t]
  );

  const nutritionAction = useMemo(
    () => (
      <ButtonLink variant="secondary" href="/app/nutricion">
        {t("today.nutritionCta")}
      </ButtonLink>
    ),
    [t]
  );

  const weightAction = useMemo(
    () => (
      <ButtonLink variant="secondary" href="/app/seguimiento#weight-entry">
        {t("quickActions.recordWeight")}
      </ButtonLink>
    ),
    [t]
  );

  return (
    <>
      <TodaySectionCard title={t("today.trainingSectionTitle")} subtitle={t("today.trainingSectionSubtitle")} action={trainingAction}>
        {trainingState.status === "loading" ? (
          <TodayTrainingSkeleton />
        ) : trainingState.status === "error" ? (
          <ErrorState
            title={t("today.trainingErrorTitle")}
            description={t("today.trainingErrorDescription")}
            actions={[{ label: t("ui.retry"), onClick: loadProfile, variant: "secondary" }]}
          />
        ) : trainingState.status === "empty" ? (
          <EmptyState
            title={t("today.trainingEmptyTitle")}
            description={t("today.trainingEmptyDescription")}
          />
        ) : (
          trainingState.data && <TodayTrainingSummary data={trainingState.data} />
        )}
      </TodaySectionCard>

      <TodaySectionCard title={t("today.nutritionSectionTitle")} subtitle={t("today.nutritionSectionSubtitle")} action={nutritionAction}>
        {nutritionState.status === "loading" ? (
          <TodayNutritionSkeleton />
        ) : nutritionState.status === "error" ? (
          <ErrorState
            title={t("today.nutritionErrorTitle")}
            description={t("today.nutritionErrorDescription")}
            actions={[{ label: t("ui.retry"), onClick: loadProfile, variant: "secondary" }]}
          />
        ) : nutritionState.status === "empty" ? (
          <EmptyState
            title={t("today.nutritionEmptyTitle")}
            description={t("today.nutritionEmptyDescription")}
          />
        ) : (
          nutritionState.data && <TodayNutritionSummary data={nutritionState.data} />
        )}
      </TodaySectionCard>

      <TodaySectionCard title={t("today.weightSectionTitle")} subtitle={t("today.weightSectionSubtitle")} action={weightAction}>
        {weightState.status === "loading" ? (
          <TodayWeightSkeleton />
        ) : weightState.status === "error" ? (
          <ErrorState
            title={t("today.weightErrorTitle")}
            description={t("today.weightErrorDescription")}
            actions={[{ label: t("ui.retry"), onClick: loadTracking, variant: "secondary" }]}
          />
        ) : weightState.status === "empty" ? (
          <EmptyState
            title={t("today.weightEmptyTitle")}
            description={t("today.weightEmptyDescription")}
            actions={[{ label: t("quickActions.recordWeight"), href: "/app/seguimiento#weight-entry", variant: "secondary" }]}
          />
        ) : (
          weightState.data && <TodayWeightSummary data={weightState.data} />
        )}
      </TodaySectionCard>
    </>
  );
}
