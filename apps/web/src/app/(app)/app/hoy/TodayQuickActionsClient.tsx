"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PremiumNutritionIcon,
  PremiumProgressIcon,
  PremiumWorkoutIcon,
} from "@/components/icons/PremiumIcons";
import { useToast } from "@/components/ui/Toast";
import { MacroRing } from "@/components/ui/MacroRing";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { Card, Section, Stack } from "@/design-system/components";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { trackEvent } from "@/lib/analytics";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { canAccessFeature } from "@/lib/entitlements";
import type { AuthMeResponse, NutritionPlanDetail, NutritionPlanListItem, TrainingPlanDetail } from "@/lib/types";
import { createTrackingEntry } from "@/services/tracking";
import { TodayEmptyState } from "./TodayEmptyState";
import { TodayErrorState } from "./TodayErrorState";
import { TodaySkeleton } from "./TodaySkeleton";

const trainingRoute = "/app/entrenamiento";
const billingRoute = "/app/settings/billing";
const manualPlanRoute = "/app/entrenamiento/editar";
const aiPlanRoute = "/app/entrenamiento?ai=1";

type ViewStatus = "loading" | "success" | "error";
type CheckinActionStatus = "idle" | "loading";
type TrainingState = "workout" | "rest" | "no-plan";

type TodaySignals = {
  checkinDoneThisWeek: boolean;
  userName: string;
  trainingName: string;
  trainingDuration: number | null;
  trainingExerciseCount: number;
  trainingDayKey: string | null;
  trainingState: TrainingState;
  nutritionReady: boolean;
  nutritionTargetCalories: number | null;
  nutritionConsumedCalories: number;
  currentWeightKg: number | null;
  streakDays: number;
  hasTrainingAccess: boolean;
};

type TrackingPayload = {
  checkins?: Array<{ date?: string | null; weightKg?: number | null }>;
};

type ActiveTrainingPlanPayload = {
  plan?: TrainingPlanDetail | null;
};

type NutritionPlansPayload = {
  items?: Array<Pick<NutritionPlanListItem, "id">>;
};

function ProgressBar({ value, total, className = "" }: { value: number; total: number; className?: string }) {
  const width = Math.min(100, Math.max(0, total > 0 ? Math.round((value / total) * 100) : 0));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)] ${className}`}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${width}%` }} />
    </div>
  );
}

function NutritionRing({ value, total }: { value: number; total: number | null }) {
  const safeTotal = total && total > 0 ? total : 0;
  const caloriesTarget = safeTotal;
  
  const protein = Math.round(value * 0.3 / 4);
  const carbs = Math.round(value * 0.4 / 4);
  const fats = Math.round(value * 0.3 / 9);
  const proteinTarget = Math.round(caloriesTarget * 0.3 / 4) || 30;
  const carbsTarget = Math.round(caloriesTarget * 0.4 / 4) || 40;
  const fatsTarget = Math.round(caloriesTarget * 0.3 / 9) || 15;
  
  const segments = [
    { key: "protein", label: "Proteína", grams: protein, target: proteinTarget, percent: (protein / proteinTarget) * 100, color: "var(--color-primary)" },
    { key: "carbs", label: "Carbs", grams: carbs, target: carbsTarget, percent: (carbs / carbsTarget) * 100, color: "var(--color-warning)" },
    { key: "fats", label: "Grasas", grams: fats, target: fatsTarget, percent: (fats / fatsTarget) * 100, color: "var(--color-info)" },
  ];
  
  return (
    <MacroRing
      segments={segments}
      centerValue={`${Math.round((value / safeTotal) * 100)}%`}
      centerLabel="kcal"
      size="md"
      showLegend={false}
    />
  );
}

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
  const validEntries =
    payload?.checkins
      ?.map((entry) => ({ entry, parsed: parseDate(entry.date) }))
      .filter(
        (item): item is { entry: { weightKg?: number | null }; parsed: Date } =>
          item.parsed !== null && Number.isFinite(item.entry.weightKg),
      ) ?? [];

  if (!validEntries.length) return null;
  return Number(validEntries.sort((a, b) => b.parsed.getTime() - a.parsed.getTime())[0]?.entry.weightKg);
};

const getStreakDays = (payload?: TrackingPayload | null) => {
  const rawDates = payload?.checkins?.map((entry) => parseDate(entry.date)).filter((date): date is Date => date !== null) ?? [];
  if (!rawDates.length) return 0;
  const keys = new Set(rawDates.map((date) => toDateKey(date)));
  const cursor = new Date();
  let streak = 0;
  while (keys.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const hasWeeklyCheckin = (payload?: TrackingPayload | null) => {
  const now = new Date();
  return (payload?.checkins ?? []).some((entry) => {
    const parsed = parseDate(entry.date);
    if (!parsed) return false;
    const daysFromNow = differenceInDays(now, parsed);
    return daysFromNow >= 0 && daysFromNow <= 6;
  });
};

export default function TodayQuickActionsClient() {
  const router = useRouter();
  const { t } = useLanguage();
  const { notify } = useToast();
  const { entitlements } = useAuthEntitlements();
  const hasAiAccess = canAccessFeature(entitlements, "ai");

  const [status, setStatus] = useState<ViewStatus>("loading");
  const [checkinActionStatus, setCheckinActionStatus] = useState<CheckinActionStatus>("idle");
  const [signals, setSignals] = useState<TodaySignals>({
    checkinDoneThisWeek: false,
    userName: "",
    trainingName: "",
    trainingDuration: null,
    trainingExerciseCount: 0,
    trainingDayKey: null,
    trainingState: "no-plan",
    nutritionReady: false,
    nutritionTargetCalories: null,
    nutritionConsumedCalories: 0,
    currentWeightKg: null,
    streakDays: 0,
    hasTrainingAccess: true,
  });
  const hasTrackedViewRef = useRef(false);

  const loadTodaySignals = useCallback(async () => {
    setStatus("loading");

    try {
      const [trackingResponse, activeTrainingResponse, nutritionListResponse, authMeResponse] = await Promise.all([
        fetch("/api/tracking", { cache: "no-store", credentials: "include" }),
        fetch("/api/training-plans/active?includeDays=1", { cache: "no-store", credentials: "include" }),
        fetch("/api/nutrition-plans?limit=1", { cache: "no-store", credentials: "include" }),
        fetch("/api/auth/me", { cache: "no-store", credentials: "include" }),
      ]);

      if (!trackingResponse.ok && !activeTrainingResponse.ok && !nutritionListResponse.ok) {
        setStatus("error");
        return;
      }

      const nextSignals: TodaySignals = {
        checkinDoneThisWeek: false,
        userName: "",
        trainingName: "",
        trainingDuration: null,
        trainingExerciseCount: 0,
        trainingDayKey: null,
        trainingState: "no-plan",
        nutritionReady: false,
        nutritionTargetCalories: null,
        nutritionConsumedCalories: 0,
        currentWeightKg: null,
        streakDays: 0,
        hasTrainingAccess: true,
      };

      if (authMeResponse.ok) {
        const authMe = (await authMeResponse.json()) as AuthMeResponse;
        nextSignals.userName = authMe.name?.trim() ?? "";
        nextSignals.hasTrainingAccess = authMe.entitlements?.modules?.strength?.enabled !== false;
      }

      if (trackingResponse.ok) {
        const tracking = (await trackingResponse.json()) as TrackingPayload;
        nextSignals.checkinDoneThisWeek = hasWeeklyCheckin(tracking);
        nextSignals.currentWeightKg = getLatestWeight(tracking);
        nextSignals.streakDays = getStreakDays(tracking);
      }

      if (activeTrainingResponse.ok) {
        const activeTraining = (await activeTrainingResponse.json()) as ActiveTrainingPlanPayload;
        const trainingPlan = activeTraining.plan;
        if (trainingPlan?.days?.length) {
          const trainingDay = findTodayPlanDay(trainingPlan.days, trainingPlan.startDate);
          if (trainingDay && (trainingDay.exercises?.length ?? 0) > 0) {
            nextSignals.trainingState = "workout";
            nextSignals.trainingName = trainingDay.label || trainingDay.focus || trainingPlan.title;
            nextSignals.trainingDuration = Number.isFinite(trainingDay.duration) ? Number(trainingDay.duration) : null;
            nextSignals.trainingExerciseCount = trainingDay.exercises?.length ?? 0;
            nextSignals.trainingDayKey = trainingDay.date ? toDateKey(parseDate(trainingDay.date) ?? new Date()) : toDateKey(new Date());
          } else {
            nextSignals.trainingState = "rest";
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
            nextSignals.nutritionReady = Boolean(nutritionDay);
            nextSignals.nutritionTargetCalories = Number.isFinite(nutritionDetail.dailyCalories)
              ? nutritionDetail.dailyCalories
              : null;
            nextSignals.nutritionConsumedCalories = Math.round(
              nutritionDay?.meals?.reduce((sum, meal) => sum + (Number.isFinite(meal.calories) ? meal.calories : 0), 0) ?? 0,
            );
          }
        }
      }

      setSignals(nextSignals);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadTodaySignals();
  }, [loadTodaySignals]);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackEvent("today_view");
  }, []);

  const handleLogTodayCheckin = useCallback(async () => {
    if (checkinActionStatus === "loading") return;
    setCheckinActionStatus("loading");

    const now = new Date();
    const todayDate = toDateKey(now);

    try {
      await createTrackingEntry("checkins", {
        id: `today-checkin-${now.getTime()}`,
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
      setSignals((prev) => ({ ...prev, checkinDoneThisWeek: true, streakDays: Math.max(1, prev.streakDays) }));
      notify({ title: t("today.hubSuccessToast"), variant: "success" });
    } finally {
      setCheckinActionStatus("idle");
    }
  }, [checkinActionStatus, notify, t]);

  const userName = signals.userName || t("ui.userFallback");

  const completedGoals = useMemo(
    () => [signals.trainingState === "workout", signals.nutritionReady, signals.checkinDoneThisWeek].filter(Boolean).length,
    [signals.checkinDoneThisWeek, signals.nutritionReady, signals.trainingState],
  );

  const trainingDescription =
    signals.trainingState === "workout"
      ? signals.trainingName
      : signals.trainingState === "rest"
        ? t("today.trainingStateRest")
        : t("today.trainingStateNoPlan");

  const showEmptyBanner = status === "success" && signals.trainingState === "no-plan" && !signals.nutritionReady && !signals.checkinDoneThisWeek;
  const trainingMeta =
    signals.trainingState === "workout"
      ? [signals.trainingDuration ? `${signals.trainingDuration} min` : null, t("today.trainingExerciseCount", { count: signals.trainingExerciseCount })]
          .filter(Boolean)
          .join(" · ")
      : signals.trainingState === "rest"
        ? "Hoy toca recuperación"
        : t("today.trainingStateNoPlan");
  const todayTrainingHref = signals.trainingDayKey ? `${trainingRoute}?day=${signals.trainingDayKey}` : trainingRoute;

  return (
    <Stack gap="6">
      <header className="flex items-start justify-between gap-4 px-1 pt-1">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-semibold text-primary md:text-3xl">Buenos días, {userName}</h1>
          <p className="m-0 mt-2 text-sm text-muted md:text-base">Tu plan de hoy está listo</p>
        </div>
        {signals.streakDays > 0 ? (
          <span
            className="shrink-0 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100"
            aria-label={t("today.streakChip", { days: signals.streakDays })}
          >
            {t("today.streakChip", { days: signals.streakDays })}
          </span>
        ) : null}
      </header>

      {status === "loading" ? <TodaySkeleton /> : null}
      {status === "error" ? <TodayErrorState message={t("today.hubErrorMessage")} retryLabel={t("ui.retry")} onRetry={() => void loadTodaySignals()} /> : null}

      {status === "success" ? (
        <>
          {showEmptyBanner ? <TodayEmptyState description={t("today.hubEmptyDescription")} ctaLabel={t("today.hubEmptyCta")} href="/app/entrenamiento" /> : null}

          <h2 className="m-0 px-1 text-sm font-semibold uppercase tracking-[0.08em] text-muted">Acciones de hoy</h2>

          <Section className="space-y-0" data-testid="today-actions-grid">
            <div className="grid gap-6 md:grid-cols-2 xl:gap-8">
              <Card variant="glass" hoverable className="rounded-2xl p-6 md:p-7" data-testid="today-action-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-accent">
                    <PremiumWorkoutIcon width={22} height={22} />
                  </div>
                  <div>
                    <p className="m-0 text-xs uppercase tracking-[0.1em] text-muted">{t("today.trainingCardEyebrow")}</p>
                    <h2 className="mt-1 text-xl font-semibold text-primary">{t("today.trainingHeroTitle")}</h2>
                  </div>
                </div>
                <p className="text-sm text-muted">{trainingDescription}</p>
                <p className="mt-2 text-xs text-muted">{trainingMeta}</p>
                <ProgressBar value={completedGoals} total={3} className="mt-3" />

                {signals.trainingState === "no-plan" ? (
                  <div className="mt-6 space-y-2">
                    <ButtonLink as={Link} href={manualPlanRoute} size="lg" className="min-h-12 w-full">
                      {t("today.trainingManualCta")}
                    </ButtonLink>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="min-h-12 w-full"
                      disabled={!hasAiAccess}
                      onClick={() => {
                        if (!hasAiAccess) return;
                        router.push(aiPlanRoute);
                      }}
                    >
                      {t("today.trainingAiCta")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="mt-6 min-h-12 w-full"
                    onClick={() => {
                      if (!signals.hasTrainingAccess) {
                        router.push(billingRoute);
                        return;
                      }
                      router.push(signals.trainingState === "workout" ? todayTrainingHref : trainingRoute);
                    }}
                  >
                    {!signals.hasTrainingAccess
                      ? t("today.unlockCta")
                      : signals.trainingState === "rest"
                        ? "Ver semana"
                        : t("today.trainingHeroCta")}
                  </Button>
                )}
              </Card>

              <Card variant="glass" hoverable className="rounded-2xl p-6 md:p-7" data-testid="today-action-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-muted text-success">
                    <PremiumNutritionIcon width={22} height={22} />
                  </div>
                  <div>
                    <p className="m-0 text-xs uppercase tracking-[0.1em] text-muted">{t("today.nutritionCardEyebrow")}</p>
                    <h2 className="mt-1 text-xl font-semibold text-primary">{t("today.nutritionCardTitle")}</h2>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-4">
                  <NutritionRing value={signals.nutritionConsumedCalories} total={signals.nutritionTargetCalories} />
                  <div>
                    <p className="m-0 text-sm text-muted">{signals.nutritionConsumedCalories} kcal consumidas</p>
                    <p className="m-0 mt-1 text-xs text-muted">Objetivo: {signals.nutritionTargetCalories ?? "--"} kcal</p>
                  </div>
                </div>
                <ButtonLink as={Link} href="/app/nutricion" size="lg" className="mt-6 min-h-12 w-full">
                  {t("today.nutritionPrimaryCta")}
                </ButtonLink>
              </Card>

              <Card variant="glass" hoverable className="rounded-2xl p-6 md:p-7" data-testid="today-action-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info-muted text-info">
                    <PremiumProgressIcon width={22} height={22} />
                  </div>
                  <div>
                    <p className="m-0 text-xs uppercase tracking-[0.1em] text-muted">{t("today.progressCardEyebrow")}</p>
                    <h2 className="mt-1 text-xl font-semibold text-primary">{t("today.progressCardTitle")}</h2>
                  </div>
                </div>
                <p className="text-3xl font-semibold text-success">
                  {signals.currentWeightKg ? `${signals.currentWeightKg.toFixed(1)} kg` : "--"}
                </p>
                <p className="mt-1 text-sm text-muted">{t("today.hubProgress", { completed: completedGoals, total: 3 })}</p>
                <p className="mt-1 text-xs text-muted">{t("today.streakChip", { days: signals.streakDays })}</p>
                <div className="mt-6 space-y-2">
                  <Button className="min-h-12 w-full" size="lg" onClick={() => void handleLogTodayCheckin()} loading={checkinActionStatus === "loading"} data-testid="quick-action-tracking">
                    {signals.checkinDoneThisWeek ? t("today.checkinSecondaryCta") : t("today.checkinPrimaryCta")}
                  </Button>
                  <ButtonLink as={Link} href="/app/seguimiento" variant="secondary" size="lg" className="min-h-12 w-full">
                    {t("today.progressCardCta")}
                  </ButtonLink>
                </div>
              </Card>
            </div>
          </Section>
        </>
      ) : null}
    </Stack>
  );
}
