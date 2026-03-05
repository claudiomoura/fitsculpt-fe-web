"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stack } from "@/design-system/components";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { trackEvent } from "@/lib/analytics";
import { createTrackingEntry } from "@/services/tracking";
import type { AuthMeResponse, NutritionPlanDetail, NutritionPlanListItem, TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
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
  userName: string;
  trainingFocus: string;
  trainingDuration: number | null;
  nutritionCalories: number | null;
  nutritionProtein: number | null;
  currentWeightKg: number | null;
};

type TrainingPlansPayload = {
  items?: TrainingPlanListItem[];
};

type NutritionPlansPayload = {
  items?: NutritionPlanListItem[];
};

type TrackingPayload = {
  checkins?: Array<{ date?: string | null; weightKg?: number | null }>;
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

const getLatestWeight = (payload?: TrackingPayload | null) => {
  const checkins = payload?.checkins ?? [];
  const validEntries = checkins
    .map((entry) => ({ entry, parsed: parseDate(entry.date) }))
    .filter(
      (item): item is { entry: { weightKg?: number | null }; parsed: Date } =>
        item.parsed !== null && Number.isFinite(item.entry.weightKg)
    );

  if (validEntries.length === 0) return null;
  const latest = validEntries.sort((a, b) => b.parsed.getTime() - a.parsed.getTime())[0];
  return latest ? Number(latest.entry.weightKg) : null;
};

export default function TodayQuickActionsClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [signals, setSignals] = useState<TodaySignals>({
    trainingReady: false,
    nutritionReady: false,
    checkinDone: false,
    userName: "",
    trainingFocus: "",
    trainingDuration: null,
    nutritionCalories: null,
    nutritionProtein: null,
    currentWeightKg: null,
  });
  const [checkinActionStatus, setCheckinActionStatus] = useState<CheckinActionStatus>("idle");
  const hasTrackedViewRef = useRef(false);

  const loadTodaySignals = useCallback(async () => {
    setStatus("loading");

    try {
      const [trackingResponse, trainingListResponse, nutritionListResponse, authMeResponse] = await Promise.all([
        fetch("/api/tracking", { cache: "no-store", credentials: "include" }),
        fetch("/api/training-plans?limit=1", { cache: "no-store", credentials: "include" }),
        fetch("/api/nutrition-plans?limit=1", { cache: "no-store", credentials: "include" }),
        fetch("/api/auth/me", { cache: "no-store", credentials: "include" }),
      ]);

      if (!trackingResponse.ok && !trainingListResponse.ok && !nutritionListResponse.ok) {
        setStatus("error");
        return;
      }

      let trainingReady = false;
      let nutritionReady = false;
      let checkinDone = false;
      let userName = "";
      let trainingFocus = "";
      let trainingDuration: number | null = null;
      let nutritionCalories: number | null = null;
      let nutritionProtein: number | null = null;
      let currentWeightKg: number | null = null;

      if (authMeResponse.ok) {
        const authMe = (await authMeResponse.json()) as AuthMeResponse;
        userName = authMe.name?.trim() ?? "";
      }

      if (trackingResponse.ok) {
        const tracking = (await trackingResponse.json()) as TrackingPayload;
        const todayKey = toDateKey(new Date());
        checkinDone = Boolean(tracking.checkins?.some((entry) => entry.date === todayKey));
        currentWeightKg = getLatestWeight(tracking);
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
            const trainingDay = findTodayPlanDay(trainingDetail.days, trainingDetail.startDate);
            trainingReady = Boolean(trainingDay);
            trainingFocus = trainingDay?.focus ?? "";
            trainingDuration = Number.isFinite(trainingDay?.duration) ? Number(trainingDay?.duration) : null;
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
            const nutritionDay = findTodayPlanDay(nutritionDetail.days, nutritionDetail.startDate);
            nutritionReady = Boolean(nutritionDay && nutritionDay.meals.length > 0);
            nutritionCalories = Number.isFinite(nutritionDetail.dailyCalories) ? nutritionDetail.dailyCalories : null;
            nutritionProtein = Number.isFinite(nutritionDetail.proteinG) ? nutritionDetail.proteinG : null;
          }
        }
      }

      setSignals({
        trainingReady,
        nutritionReady,
        checkinDone,
        userName,
        trainingFocus,
        trainingDuration,
        nutritionCalories,
        nutritionProtein,
        currentWeightKg,
      });
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

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackEvent("today_view");
  }, []);

  const trackTodayCtaClick = useCallback((target: "training" | "nutrition" | "checkin") => {
    trackEvent("today_cta_click", { target });
  }, []);

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
  const userName = signals.userName || t("ui.userFallback");

  return (
    <section
      className="rounded-[28px] border p-5 md:p-6"
      style={{ background: "#0B0E13", borderColor: "rgba(255,255,255,0.06)" }}
      aria-live="polite"
      data-testid="today-wow-hub"
    >
      <Stack gap="4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-100">{t("today.title")}</h1>
          <p className="text-xl font-medium text-slate-100">{t("today.greeting", { name: userName })}</p>
          {/* Requiere implementación: la racha real debe venir de backend cuando exista dato confiable. */}
          <p className="text-sm text-slate-400">{t("today.streakPending")}</p>
          <p className="text-sm font-medium text-slate-300" data-testid="today-progress">
            {progressLabel}
          </p>
        </header>

        {status === "loading" ? <TodaySkeleton /> : null}

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

            <section className="grid gap-4 md:grid-cols-2" data-testid="today-actions-grid">
              <TodayCard
                title={t("today.cardCheckinTitle")}
                subtitle={t("today.checkinCardEyebrow")}
                body={signals.checkinDone ? t("today.cardCheckinReady") : t("today.cardCheckinEmpty")}
                ctaLabel={t("today.checkinPrimaryCta")}
                onClick={() => void handleLogTodayCheckin()}
                onCtaClick={() => trackTodayCtaClick("checkin")}
                loading={checkinActionStatus === "loading"}
                progressLabel={signals.checkinDone ? t("today.cardCompleted") : t("today.cardPending")}
                metric={signals.currentWeightKg ? `${signals.currentWeightKg.toFixed(1)} kg` : undefined}
                helper={signals.currentWeightKg ? t("today.checkinWeightHelper") : t("today.checkinWeightFallback")}
                orderClassName="order-3"
              />

              <TodayCard
                title={t("today.trainingHeroTitle")}
                subtitle={t("today.trainingCardEyebrow")}
                body={signals.trainingReady ? t("today.trainingHeroReady") : t("today.trainingHeroEmpty")}
                ctaLabel={t("today.trainingHeroCta")}
                href="/app/entrenamiento"
                onCtaClick={() => trackTodayCtaClick("training")}
                progressLabel={t("today.trainingProgressPending")}
                tone="hero"
                metric={signals.trainingDuration ? `${signals.trainingDuration} min` : undefined}
                helper={signals.trainingFocus || t("today.trainingFocusFallback")}
                orderClassName="order-1 md:col-span-2"
              />

              <TodayCard
                title={t("today.nutritionCardTitle")}
                subtitle={t("today.nutritionCardEyebrow")}
                body={signals.nutritionReady ? t("today.cardNutritionReady") : t("today.cardNutritionEmpty")}
                ctaLabel={t("today.nutritionPrimaryCta")}
                href="/app/nutricion"
                onCtaClick={() => trackTodayCtaClick("nutrition")}
                progressLabel={signals.nutritionReady ? t("today.cardCompleted") : t("today.cardPending")}
                helper={
                  signals.nutritionCalories || signals.nutritionProtein
                    ? `${signals.nutritionCalories ?? "--"} kcal · ${signals.nutritionProtein ?? "--"} g proteína`
                    : t("today.nutritionMetricsFallback")
                }
                orderClassName="order-2"
              />

              <TodayCard
                title={t("today.progressCardTitle")}
                subtitle={t("today.progressCardEyebrow")}
                body={t("today.progressCardBody")}
                ctaLabel={t("today.progressCardCta")}
                href="/app/seguimiento"
                onCtaClick={() => trackTodayCtaClick("checkin")}
                progressLabel={progressLabel}
                metric={`${Math.round((completedCount / 3) * 100)}%`}
                helper={t("today.progressCardHelper")}
                orderClassName="order-4"
              />
            </section>
          </>
        ) : null}
      </Stack>
    </section>
  );
}
