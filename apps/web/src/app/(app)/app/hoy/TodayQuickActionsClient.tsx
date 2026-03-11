"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Stack } from "@/design-system/components";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { trackEvent } from "@/lib/analytics";
import type {
  AuthMeResponse,
  NutritionPlanDetail,
  NutritionPlanListItem,
  TrainingPlanDetail,
  TrainingPlanListItem,
} from "@/lib/types";
import { createTrackingEntry } from "@/services/tracking";
import { TodayEmptyState } from "./TodayEmptyState";
import { TodayErrorState } from "./TodayErrorState";
import { StartWorkoutModal } from "./StartWorkoutModal";
import { TodaySkeleton } from "./TodaySkeleton";
import { UpgradePaywallModal } from "./UpgradePaywallModal";

type ViewStatus = "loading" | "success" | "error";
type CheckinActionStatus = "idle" | "loading";

type TodaySignals = {
  trainingReady: boolean;
  nutritionReady: boolean;
  checkinDoneThisWeek: boolean;
  userName: string;
  avatarUrl: string;
  trainingName: string;
  trainingDuration: number | null;
  trainingExerciseCount: number;
  trainingExercisePreview: string[];
  nutritionTargetCalories: number | null;
  nutritionTargetProtein: number | null;
  nutritionTargetCarbs: number | null;
  nutritionConsumedCalories: number;
  nutritionConsumedProtein: number;
  currentWeightKg: number | null;
  streakDays: number;
  hasTrainingAccess: boolean;
  hasNutritionAccess: boolean;
  planLabel: string;
  progressPercent: number | null;
  goalLabel: string;
};

type TrainingPlansPayload = { items?: TrainingPlanListItem[] };
type NutritionPlansPayload = { items?: NutritionPlanListItem[] };

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

const getStreakDays = (payload?: TrackingPayload | null) => {
  const rawDates = payload?.checkins?.map((entry) => parseDate(entry.date)).filter((date): date is Date => date !== null) ?? [];
  if (rawDates.length === 0) return 0;
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
  const checkins = payload?.checkins ?? [];
  const now = new Date();
  return checkins.some((entry) => {
    const parsed = parseDate(entry.date);
    if (!parsed) return false;
    const daysFromNow = differenceInDays(now, parsed);
    return daysFromNow >= 0 && daysFromNow <= 6;
  });
};

const progressBarWidth = (value: number, total: number) => Math.min(100, Math.max(0, total > 0 ? Math.round((value / total) * 100) : 0));

export default function TodayQuickActionsClient() {
  const router = useRouter();
  const { t } = useLanguage();
  const { notify } = useToast();
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [signals, setSignals] = useState<TodaySignals>({
    trainingReady: false,
    nutritionReady: false,
    checkinDoneThisWeek: false,
    userName: "",
    avatarUrl: "",
    trainingName: "",
    trainingDuration: null,
    trainingExerciseCount: 0,
    trainingExercisePreview: [],
    nutritionTargetCalories: null,
    nutritionTargetProtein: null,
    nutritionTargetCarbs: null,
    nutritionConsumedCalories: 0,
    nutritionConsumedProtein: 0,
    currentWeightKg: null,
    streakDays: 0,
    hasTrainingAccess: true,
    hasNutritionAccess: true,
    planLabel: "",
    progressPercent: null,
    goalLabel: "",
  });
  const [checkinActionStatus, setCheckinActionStatus] = useState<CheckinActionStatus>("idle");
  const [startWorkoutModalOpen, setStartWorkoutModalOpen] = useState(false);
  const [upgradePaywallModalOpen, setUpgradePaywallModalOpen] = useState(false);
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

      const nextSignals: TodaySignals = {
        trainingReady: false,
        nutritionReady: false,
        checkinDoneThisWeek: false,
        userName: "",
        avatarUrl: "",
        trainingName: "",
        trainingDuration: null,
        trainingExerciseCount: 0,
        trainingExercisePreview: [],
        nutritionTargetCalories: null,
        nutritionTargetProtein: null,
        nutritionTargetCarbs: null,
        nutritionConsumedCalories: 0,
        nutritionConsumedProtein: 0,
        currentWeightKg: null,
        streakDays: 0,
        hasTrainingAccess: true,
        hasNutritionAccess: true,
        planLabel: "",
        progressPercent: null,
        goalLabel: "",
      };

      if (authMeResponse.ok) {
        const authMe = (await authMeResponse.json()) as AuthMeResponse;
        nextSignals.userName = authMe.name?.trim() ?? "";
        nextSignals.avatarUrl = authMe.profilePhotoUrl ?? authMe.avatarUrl ?? authMe.imageUrl ?? authMe.avatarDataUrl ?? "";
        nextSignals.hasTrainingAccess = authMe.entitlements?.modules?.strength?.enabled !== false;
        nextSignals.hasNutritionAccess = authMe.entitlements?.modules?.nutrition?.enabled !== false;
        nextSignals.planLabel = authMe.subscriptionPlan ?? authMe.plan ?? authMe.entitlements?.plan?.effective ?? "";
      }

      if (trackingResponse.ok) {
        const tracking = (await trackingResponse.json()) as TrackingPayload;
        nextSignals.checkinDoneThisWeek = hasWeeklyCheckin(tracking);
        nextSignals.currentWeightKg = getLatestWeight(tracking);
        nextSignals.streakDays = getStreakDays(tracking);
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
            if (trainingDay) {
              nextSignals.trainingReady = true;
              nextSignals.trainingName = trainingDay.label || trainingDay.focus || trainingDetail.title;
              nextSignals.trainingDuration = Number.isFinite(trainingDay.duration) ? Number(trainingDay.duration) : null;
              nextSignals.trainingExerciseCount = trainingDay.exercises?.length ?? 0;
              nextSignals.trainingExercisePreview = (trainingDay.exercises ?? [])
                .map((exercise) => exercise.name?.trim())
                .filter((exerciseName): exerciseName is string => Boolean(exerciseName))
                .slice(0, 3);
            }
            nextSignals.goalLabel = trainingDetail.goal || "";
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
            nextSignals.nutritionTargetProtein = Number.isFinite(nutritionDetail.proteinG) ? nutritionDetail.proteinG : null;
            nextSignals.nutritionTargetCarbs = Number.isFinite(nutritionDetail.carbsG) ? nutritionDetail.carbsG : null;
            nextSignals.nutritionConsumedCalories = Math.round(
              nutritionDay?.meals?.reduce((sum, meal) => sum + (Number.isFinite(meal.calories) ? meal.calories : 0), 0) ?? 0
            );
            nextSignals.nutritionConsumedProtein = Math.round(
              nutritionDay?.meals?.reduce((sum, meal) => sum + (Number.isFinite(meal.protein) ? meal.protein : 0), 0) ?? 0
            );
          }
        }
      }

      nextSignals.progressPercent = nextSignals.goalLabel ? Math.round(([nextSignals.trainingReady, nextSignals.nutritionReady, nextSignals.checkinDoneThisWeek].filter(Boolean).length / 3) * 100) : null;

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
      setSignals((previous) => ({
        ...previous,
        checkinDoneThisWeek: true,
        streakDays: Math.max(1, previous.streakDays),
      }));
      notify({ title: t("today.hubSuccessToast"), variant: "success" });
    } finally {
      setCheckinActionStatus("idle");
    }
  }, [checkinActionStatus, notify, t]);

  const trainingRoute = "/app/entrenamiento";
  const billingRoute = "/app/settings/billing";

  const handleTrainingPrimaryAction = useCallback(() => {
    trackTodayCtaClick("training");
    if (signals.hasTrainingAccess) {
      setStartWorkoutModalOpen(true);
      return;
    }
    setUpgradePaywallModalOpen(true);
  }, [signals.hasTrainingAccess, trackTodayCtaClick]);

  const userName = signals.userName || t("ui.userFallback");
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
  const progressLabel = t("today.hubProgress", {
    completed: [signals.trainingReady, signals.nutritionReady, signals.checkinDoneThisWeek].filter(Boolean).length,
    total: 3,
  });
  const showEmptyBanner =
    status === "success" && !signals.trainingReady && !signals.nutritionReady && !signals.checkinDoneThisWeek;

  const caloriesProgress = progressBarWidth(signals.nutritionConsumedCalories, signals.nutritionTargetCalories ?? 0);

  return (
    <section className="rounded-[28px] border p-4 md:p-6" style={{ background: "#0B0E13", borderColor: "rgba(255,255,255,0.06)" }}>
      <Stack gap="4">
        <header className="sticky top-2 z-10 rounded-2xl border p-3 backdrop-blur" style={{ background: "rgba(15,22,36,0.82)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-2xl font-semibold text-slate-100">{t("today.title")}</h2>
              <p className="m-0 mt-1 text-base font-medium text-slate-100">{t("today.greeting", { name: userName })}</p>
            </div>
            <div className="flex items-center gap-2">
              {signals.planLabel ? (
                <span className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200" style={{ borderColor: "rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.12)" }}>
                  {signals.planLabel}
                </span>
              ) : null}
              {signals.avatarUrl ? (
                <img src={signals.avatarUrl} alt={t("profile.avatarTitle")} className="h-10 w-10 rounded-full border object-cover" style={{ borderColor: "rgba(255,255,255,0.16)" }} />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold text-slate-200" style={{ borderColor: "rgba(255,255,255,0.16)" }}>
                  {initials || "FS"}
                </div>
              )}
            </div>
          </div>
          {signals.streakDays > 0 ? (
            <p className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs text-cyan-200" style={{ borderColor: "rgba(34,211,238,0.4)", background: "rgba(34,211,238,0.12)" }}>
              {t("today.streakChip", { days: signals.streakDays })}
            </p>
          ) : null}
        </header>

        {status === "loading" ? <TodaySkeleton /> : null}
        {status === "error" ? <TodayErrorState message={t("today.hubErrorMessage")} retryLabel={t("ui.retry")} onRetry={() => void loadTodaySignals()} /> : null}

        {status === "success" ? (
          <>
            {showEmptyBanner ? (
              <TodayEmptyState description={t("today.hubEmptyDescription")} ctaLabel={t("today.hubEmptyCta")} href="/app/entrenamientos" />
            ) : null}

            <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]" data-testid="today-actions-grid">
              <div className="order-1 space-y-4" data-testid="today-left-slot">
                <article className="rounded-3xl border p-5 md:p-6" style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }} data-testid="today-action-card">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300">{t("today.trainingCardEyebrow")}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">{t("today.trainingHeroTitle")}</h2>
                  {signals.trainingReady ? (
                    <p className="mt-2 text-sm text-slate-300">{signals.trainingName}{signals.trainingDuration ? ` · ${signals.trainingDuration} min` : ""}</p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300">{signals.hasTrainingAccess ? t("today.trainingHeroEmpty") : t("today.lockedDescription")}</p>
                  )}
                  {signals.trainingExerciseCount > 0 ? <p className="mt-2 text-xs text-slate-400">{t("today.trainingExerciseCount", { count: signals.trainingExerciseCount })}</p> : null}
                  {/* Requiere implementación: progreso x/n de ejercicios completados desde sesión activa. */}
                  <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: signals.trainingReady ? "28%" : "0%", background: "#22D3EE" }} />
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button size="lg" className="min-h-11 flex-1" data-testid="today-action-button" style={{ background: "#22D3EE", color: "#05212a", borderColor: "rgba(34,211,238,0.7)", boxShadow: "0 10px 26px rgba(34,211,238,0.28)" }} onClick={handleTrainingPrimaryAction}>
                      {signals.hasTrainingAccess ? t("today.trainingHeroCta") : t("today.unlockCta")}
                    </Button>
                    <ButtonLink as={Link} href={trainingRoute} variant="secondary" className="min-h-11" onClick={() => trackTodayCtaClick("training")}>
                      {t("today.viewDetailCta")}
                    </ButtonLink>
                  </div>
                </article>

                <article className="rounded-3xl border p-5" style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)" }} data-testid="today-action-card">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300">Nutrición</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-100">{t("today.nutritionCardTitle")}</h2>
                  {signals.hasNutritionAccess ? (
                    <>
                      <p className="mt-2 text-sm text-slate-300">
                        {signals.nutritionConsumedCalories} / {signals.nutritionTargetCalories ?? "--"} kcal
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {signals.nutritionConsumedProtein}g proteína · {signals.nutritionTargetCarbs ?? "--"}g carbos
                      </p>
                      <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800">
                        <div className="h-full rounded-full" style={{ width: `${caloriesProgress}%`, background: "#34D399" }} />
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300">{t("today.lockedDescription")}</p>
                  )}
                  <ButtonLink as={Link} href={signals.hasNutritionAccess ? "/app/nutricion" : "/app/settings/billing"} size="lg" className="mt-5 min-h-11 w-full" data-testid="today-action-button" onClick={() => trackTodayCtaClick("nutrition")}>
                    {signals.hasNutritionAccess ? t("today.nutritionPrimaryCta") : t("today.unlockCta")}
                  </ButtonLink>
                </article>
              </div>

              <div className="order-2 space-y-4" data-testid="today-right-slot">
                <article className="rounded-3xl border p-5" style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)" }} data-testid="today-action-card">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300">{t("today.checkinCardEyebrow")}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-100">{t("today.cardCheckinTitle")}</h2>
                  <p className="mt-2 text-3xl font-semibold text-emerald-300">{signals.currentWeightKg ? `${signals.currentWeightKg.toFixed(1)} kg` : "--"}</p>
                  <p className="mt-2 text-sm text-slate-300">{signals.currentWeightKg ? t("today.checkinWeightHelper") : t("today.checkinWeightFallback")}</p>
                  {/* Requiere implementación: sparkline real según histórico completo de check-ins. */}
                  <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: signals.checkinDoneThisWeek ? "100%" : "32%", background: "#34D399" }} />
                  </div>
                  <Button className="mt-5 min-h-11 w-full" size="lg" onClick={() => { trackTodayCtaClick("checkin"); void handleLogTodayCheckin(); }} loading={checkinActionStatus === "loading"} data-testid="today-quick-action-track">
                    {signals.checkinDoneThisWeek ? t("today.checkinSecondaryCta") : t("today.checkinPrimaryCta")}
                  </Button>
                </article>

                <article className="rounded-3xl border p-5" style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)" }} data-testid="today-action-card">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300">{t("today.progressCardEyebrow")}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-100">{t("today.progressCardTitle")}</h2>
                  <p className="mt-2 text-sm text-slate-300">{signals.goalLabel || t("today.progressCardHelper")}</p>
                  {signals.progressPercent !== null ? (
                    <>
                      <p className="mt-3 text-2xl font-semibold text-emerald-300">{signals.progressPercent}%</p>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
                        <div className="h-full rounded-full" style={{ width: `${signals.progressPercent}%`, background: "#22D3EE" }} />
                      </div>
                    </>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-400">{progressLabel}</p>
                  <ButtonLink as={Link} href="/app/seguimiento" size="lg" className="mt-5 min-h-11 w-full" data-testid="today-action-button" onClick={() => trackTodayCtaClick("checkin")}>
                    {t("today.progressCardCta")}
                  </ButtonLink>
                </article>
              </div>
            </section>

            <StartWorkoutModal
              open={startWorkoutModalOpen}
              onClose={() => setStartWorkoutModalOpen(false)}
              workoutName={signals.trainingName}
              durationMinutes={signals.trainingDuration}
              exercises={signals.trainingExercisePreview}
              onStart={() => {
                setStartWorkoutModalOpen(false);
                router.push(trainingRoute);
              }}
              onViewDetail={() => {
                setStartWorkoutModalOpen(false);
                router.push(trainingRoute);
              }}
            />

            <UpgradePaywallModal
              open={upgradePaywallModalOpen}
              onClose={() => setUpgradePaywallModalOpen(false)}
              context="training"
              onGoBilling={() => {
                setUpgradePaywallModalOpen(false);
                router.push(billingRoute);
              }}
            />
          </>
        ) : null}
      </Stack>
    </section>
  );
}
