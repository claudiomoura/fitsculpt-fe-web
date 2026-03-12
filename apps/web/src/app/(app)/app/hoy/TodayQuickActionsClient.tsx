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
import { Button, ButtonLink } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { Card, PageHero, Section, Stack } from "@/design-system/components";
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
  avatarUrl: string;
  trainingName: string;
  trainingDuration: number | null;
  trainingExerciseCount: number;
  trainingExercisePreview: string[];
  trainingState: TrainingState;
  nutritionReady: boolean;
  nutritionTargetCalories: number | null;
  nutritionConsumedCalories: number;
  currentWeightKg: number | null;
  streakDays: number;
  hasTrainingAccess: boolean;
  planLabel: string;
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
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-800 ${className}`}>
      <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${width}%` }} />
    </div>
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
    avatarUrl: "",
    trainingName: "",
    trainingDuration: null,
    trainingExerciseCount: 0,
    trainingExercisePreview: [],
    trainingState: "no-plan",
    nutritionReady: false,
    nutritionTargetCalories: null,
    nutritionConsumedCalories: 0,
    currentWeightKg: null,
    streakDays: 0,
    hasTrainingAccess: true,
    planLabel: "",
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
        avatarUrl: "",
        trainingName: "",
        trainingDuration: null,
        trainingExerciseCount: 0,
        trainingExercisePreview: [],
        trainingState: "no-plan",
        nutritionReady: false,
        nutritionTargetCalories: null,
        nutritionConsumedCalories: 0,
        currentWeightKg: null,
        streakDays: 0,
        hasTrainingAccess: true,
        planLabel: "",
      };

      if (authMeResponse.ok) {
        const authMe = (await authMeResponse.json()) as AuthMeResponse;
        nextSignals.userName = authMe.name?.trim() ?? "";
        nextSignals.avatarUrl = authMe.profilePhotoUrl ?? authMe.avatarUrl ?? authMe.imageUrl ?? authMe.avatarDataUrl ?? "";
        nextSignals.hasTrainingAccess = authMe.entitlements?.modules?.strength?.enabled !== false;
        nextSignals.planLabel = authMe.subscriptionPlan ?? authMe.plan ?? authMe.entitlements?.plan?.effective ?? "";
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
            nextSignals.trainingExercisePreview = (trainingDay.exercises ?? [])
              .map((exercise) => exercise.name?.trim())
              .filter((name): name is string => Boolean(name))
              .slice(0, 3);
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
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");

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

  return (
    <Stack gap="4">
      <PageHero
        title={t("today.title")}
        subtitle={t("today.greeting", { name: userName })}
        actions={
          <div className="flex items-center justify-end gap-2">
            {signals.planLabel ? (
              <span
                className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200"
                style={{ borderColor: "rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.12)" }}
              >
                {signals.planLabel}
              </span>
            ) : null}
            {signals.avatarUrl ? (
              <img
                src={signals.avatarUrl}
                alt={t("profile.avatarTitle")}
                className="h-10 w-10 rounded-full border object-cover"
                style={{ borderColor: "rgba(255,255,255,0.16)" }}
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold text-slate-200"
                style={{ borderColor: "rgba(255,255,255,0.16)" }}
              >
                {initials || "FS"}
              </div>
            )}
          </div>
        }
      />

      {status === "loading" ? <TodaySkeleton /> : null}
      {status === "error" ? <TodayErrorState message={t("today.hubErrorMessage")} retryLabel={t("ui.retry")} onRetry={() => void loadTodaySignals()} /> : null}

      {status === "success" ? (
        <>
          {showEmptyBanner ? <TodayEmptyState description={t("today.hubEmptyDescription")} ctaLabel={t("today.hubEmptyCta")} href="/app/entrenamiento" /> : null}

          <Section className="space-y-0" data-testid="today-actions-grid">
            <div className="grid gap-4 md:grid-cols-2 xl:gap-6">
              <Card variant="glass" hoverable className="rounded-2xl p-5 md:p-6" data-testid="today-action-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                    <PremiumWorkoutIcon width={22} height={22} />
                  </div>
                  <div>
                    <p className="m-0 text-xs uppercase tracking-[0.1em] text-slate-400">{t("today.trainingCardEyebrow")}</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-100">{t("today.trainingHeroTitle")}</h2>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{trainingDescription}</p>
                <p className="mt-2 text-xs text-slate-400">{t("today.trainingExerciseCount", { count: signals.trainingExerciseCount })}</p>
                <ProgressBar value={completedGoals} total={3} className="mt-3" />

                {signals.trainingState === "no-plan" ? (
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <ButtonLink as={Link} href={manualPlanRoute} size="lg" className="min-h-11 w-full">
                      {t("today.trainingManualCta")}
                    </ButtonLink>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="min-h-11 w-full"
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
                    className="mt-5 min-h-11 w-full"
                    onClick={() => {
                      if (!signals.hasTrainingAccess) {
                        router.push(billingRoute);
                        return;
                      }
                      router.push(signals.trainingState === "workout" ? trainingRoute : "/app/entrenamientos");
                    }}
                  >
                    {!signals.hasTrainingAccess ? t("today.unlockCta") : t("today.trainingHeroCta")}
                  </Button>
                )}
              </Card>

              <Card variant="glass" hoverable className="rounded-2xl p-5 md:p-6" data-testid="today-action-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    <PremiumNutritionIcon width={22} height={22} />
                  </div>
                  <div>
                    <p className="m-0 text-xs uppercase tracking-[0.1em] text-slate-400">{t("today.nutritionCardEyebrow")}</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-100">{t("today.nutritionCardTitle")}</h2>
                  </div>
                </div>
                <p className="text-sm text-slate-300">
                  {signals.nutritionConsumedCalories} / {signals.nutritionTargetCalories ?? "--"} kcal
                </p>
                <ProgressBar value={signals.nutritionConsumedCalories} total={signals.nutritionTargetCalories ?? 0} className="mt-3" />
                <ButtonLink as={Link} href="/app/nutricion" size="lg" className="mt-5 min-h-11 w-full">
                  {t("today.nutritionPrimaryCta")}
                </ButtonLink>
              </Card>

              <Card variant="glass" hoverable className="rounded-2xl p-5 md:p-6" data-testid="today-action-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                    <PremiumProgressIcon width={22} height={22} />
                  </div>
                  <div>
                    <p className="m-0 text-xs uppercase tracking-[0.1em] text-slate-400">{t("today.progressCardEyebrow")}</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-100">{t("today.progressCardTitle")}</h2>
                  </div>
                </div>
                <p className="text-3xl font-semibold text-emerald-300">
                  {signals.currentWeightKg ? `${signals.currentWeightKg.toFixed(1)} kg` : "--"}
                </p>
                <p className="mt-1 text-sm text-slate-300">{t("today.hubProgress", { completed: completedGoals, total: 3 })}</p>
                <p className="mt-1 text-xs text-slate-400">{t("today.streakChip", { days: signals.streakDays })}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button className="min-h-11 w-full" size="lg" onClick={() => void handleLogTodayCheckin()} loading={checkinActionStatus === "loading"} data-testid="quick-action-tracking">
                    {signals.checkinDoneThisWeek ? t("today.checkinSecondaryCta") : t("today.checkinPrimaryCta")}
                  </Button>
                  <ButtonLink as={Link} href="/app/seguimiento" variant="secondary" size="lg" className="min-h-11 w-full">
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
