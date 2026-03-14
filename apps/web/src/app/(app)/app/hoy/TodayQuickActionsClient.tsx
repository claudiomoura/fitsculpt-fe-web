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
import { readAuthEntitlementSnapshot } from "@/context/auth/entitlements";
import { useLanguage } from "@/context/LanguageProvider";
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
  subscriptionPlan: string;
  aiTokenBalance: number;
  canGenerateTrainingAi: boolean;
  canGenerateNutritionAi: boolean;
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

function ProgressMetric({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted">{label}</span>
        <span style={{ color }} className="font-semibold">{percent}%</span>
      </div>
      <div
        className="overflow-hidden rounded-full"
        style={{
          height: 12,
          background: "rgba(255,255,255,0.08)",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 18px ${color}55`,
            transition: "width 400ms ease",
          }}
        />
      </div>
      <p className="mt-2 text-sm font-semibold" style={{ color }}>
        Completado {percent}%
      </p>
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
    subscriptionPlan: "FREE",
    aiTokenBalance: 0,
    canGenerateTrainingAi: false,
    canGenerateNutritionAi: false,
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
        subscriptionPlan: "FREE",
        aiTokenBalance: 0,
        canGenerateTrainingAi: false,
        canGenerateNutritionAi: false,
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
        const entitlementSnapshot = readAuthEntitlementSnapshot(authMe);
        nextSignals.userName = authMe.name?.trim() ?? "";
        nextSignals.subscriptionPlan = entitlementSnapshot.subscriptionPlan;
        nextSignals.aiTokenBalance = entitlementSnapshot.tokenBalance;
        nextSignals.canGenerateTrainingAi = entitlementSnapshot.aiEntitlements.strength && entitlementSnapshot.tokenBalance > 0;
        nextSignals.canGenerateNutritionAi = entitlementSnapshot.aiEntitlements.nutrition && entitlementSnapshot.tokenBalance > 0;
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
  const dailyProgressPercent = Math.round((completedGoals / 3) * 100);
  const nutritionProgressPercent = Math.round(Math.min((signals.nutritionConsumedCalories / (signals.nutritionTargetCalories || 1)) * 100, 100));
  const checkinProgressPercent = signals.checkinDoneThisWeek ? 100 : 35;
  const aiLockReason = signals.aiTokenBalance <= 0 ? "Sin tokens" : signals.subscriptionPlan === "FREE" ? "Plan Free" : null;

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
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-2xl font-bold text-primary">Buenos días, {userName}</h1>
          {signals.streakDays > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
              {signals.streakDays} días
            </span>
          )}
        </div>
      </header>

      {status === "loading" ? <TodaySkeleton /> : null}
      {status === "error" ? <TodayErrorState message={t("today.hubErrorMessage")} retryLabel={t("ui.retry")} onRetry={() => void loadTodaySignals()} /> : null}

      {status === "success" ? (
        <>
          {showEmptyBanner ? <TodayEmptyState description={t("today.hubEmptyDescription")} ctaLabel={t("today.hubEmptyCta")} href="/app/entrenamiento" /> : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {/* Card 1: Entrenamiento */}
            <section className="card xl:col-span-2">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
                  <PremiumWorkoutIcon width={28} height={28} className="text-primary" />
                </div>
                <div>
                  <p className="m-0 text-xs uppercase tracking-wider text-muted">Entrenamiento de hoy</p>
                  <h2 className="m-0 mt-0.5 text-xl font-semibold text-primary">{signals.trainingState === "workout" ? signals.trainingName : signals.trainingState === "rest" ? "Descanso" : "Sin plan"}</h2>
                </div>
              </div>
              
              {signals.trainingState === "workout" && (
                <div className="flex items-center gap-4 mb-4 text-sm text-muted">
                  {signals.trainingDuration ? (
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {signals.trainingDuration} min
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 10v4"/><path d="M21 10v4"/></svg>
                    {signals.trainingExerciseCount} ejercicios
                  </span>
                </div>
              )}

              <ProgressMetric label="Progreso" percent={dailyProgressPercent} color="var(--color-primary)" />

              {signals.trainingState === "no-plan" ? (
                <div className="space-y-2">
                  <ButtonLink as={Link} href={manualPlanRoute} className="flex w-full h-12 rounded-xl font-semibold">
                    {t("today.trainingManualCta")}
                  </ButtonLink>
                  <Button variant="secondary" className="flex w-full h-12 rounded-xl font-medium" disabled={!hasAiAccess} onClick={() => hasAiAccess && router.push(aiPlanRoute)}>
                    {t("today.trainingAiCta")}
                  </Button>
                </div>
              ) : (
                <Button className="flex w-full h-12 rounded-xl font-semibold" onClick={() => {
                  if (!signals.hasTrainingAccess) { router.push(billingRoute); return; }
                  router.push(signals.trainingState === "workout" ? todayTrainingHref : trainingRoute);
                }}>
                  {signals.trainingState === "rest" ? "Ver semana" : "Empezar entrenamiento"}
                </Button>
              )}
            </section>

            {/* Card 2: Nutrición */}
            <section className="card">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/20">
                  <PremiumNutritionIcon width={28} height={28} className="text-success" />
                </div>
                <div>
                  <p className="m-0 text-xs uppercase tracking-wider text-muted">Nutrición</p>
                  <h2 className="m-0 mt-0.5 text-xl font-semibold text-primary">Calorías</h2>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <NutritionRing value={signals.nutritionConsumedCalories} total={signals.nutritionTargetCalories} />
                <div className="flex-1">
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted">Consumidas</span>
                      <span className="font-semibold text-primary">{signals.nutritionConsumedCalories} kcal</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted">{Math.max(0, (signals.nutritionTargetCalories || 0) - signals.nutritionConsumedCalories)} kcal restantes</p>
                  <ProgressMetric label="Objetivo diario" percent={nutritionProgressPercent} color="var(--color-success)" />
                </div>
              </div>

              <ButtonLink as={Link} href="/app/nutricion" variant="secondary" className="flex w-full h-12 rounded-xl font-medium">
                Ver plan
              </ButtonLink>
            </section>

            {/* Card 3: Check-in */}
            <section className="card">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-info/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <p className="m-0 text-xs uppercase tracking-wider text-muted">Check-in</p>
                  <h2 className="m-0 mt-0.5 text-xl font-semibold text-primary">Peso actual</h2>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-5">
                <span className="text-5xl font-bold text-primary">{signals.currentWeightKg ? signals.currentWeightKg.toFixed(1) : "--"}</span>
                <span className="text-xl text-muted">kg</span>
              </div>

              <ProgressMetric label="Meta: -5 kg" percent={checkinProgressPercent} color="var(--color-info)" />

              <Button className="flex w-full h-12 rounded-xl font-medium" onClick={() => void handleLogTodayCheckin()} loading={checkinActionStatus === "loading"}>
                {signals.checkinDoneThisWeek ? "Actualizar" : "Registrar"}
              </Button>
            </section>

            {/* Card 4: Progreso - solo desktop */}
            <section className="hidden xl:block card">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/20">
                  <PremiumProgressIcon width={28} height={28} className="text-warning" />
                </div>
                <div>
                  <p className="m-0 text-xs uppercase tracking-wider text-muted">Progreso</p>
                  <h2 className="m-0 mt-0.5 text-xl font-semibold text-primary">Semanal</h2>
                </div>
              </div>

              <ProgressMetric label="Completado" percent={dailyProgressPercent} color="var(--color-warning)" />

              <p className="text-base text-muted mb-5">{completedGoals} de 3 acciones</p>

              <ButtonLink as={Link} href="/app/seguimiento" variant="secondary" className="flex w-full h-12 rounded-xl font-medium">
                Ver más
              </ButtonLink>
            </section>

            <section className="card">
              <div className="flex items-center gap-4 mb-5">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${signals.canGenerateTrainingAi ? "bg-primary/20" : "bg-muted"}`}>
                  <PremiumWorkoutIcon width={28} height={28} className={signals.canGenerateTrainingAi ? "text-primary" : "text-muted"} />
                </div>
                <div>
                  <p className="m-0 text-xs uppercase tracking-wider text-muted">IA entrenamiento</p>
                  <h2 className="m-0 mt-0.5 text-xl font-semibold text-primary">Generar plan</h2>
                </div>
              </div>
              <p className="mb-5 text-sm text-muted">Crea una rutina con IA segun tu perfil.</p>
              <ProgressMetric label="Tokens disponibles" percent={Math.min(signals.aiTokenBalance * 10, 100)} color={signals.canGenerateTrainingAi ? "var(--color-primary)" : "#7c8799"} />
              <Button className="flex w-full h-12 rounded-xl font-medium" variant={signals.canGenerateTrainingAi ? "primary" : "secondary"} disabled={!signals.canGenerateTrainingAi} title={aiLockReason ?? undefined} onClick={() => router.push("/app/entrenamiento?ai=1")}>
                {signals.canGenerateTrainingAi ? "Generar con IA" : aiLockReason ?? "No disponible"}
              </Button>
            </section>

            <section className="card">
              <div className="flex items-center gap-4 mb-5">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${signals.canGenerateNutritionAi ? "bg-success/20" : "bg-muted"}`}>
                  <PremiumNutritionIcon width={28} height={28} className={signals.canGenerateNutritionAi ? "text-success" : "text-muted"} />
                </div>
                <div>
                  <p className="m-0 text-xs uppercase tracking-wider text-muted">IA nutricion</p>
                  <h2 className="m-0 mt-0.5 text-xl font-semibold text-primary">Generar dieta</h2>
                </div>
              </div>
              <p className="mb-5 text-sm text-muted">Genera una dieta con IA adaptada a tu objetivo.</p>
              <ProgressMetric label="Tokens disponibles" percent={Math.min(signals.aiTokenBalance * 10, 100)} color={signals.canGenerateNutritionAi ? "var(--color-success)" : "#7c8799"} />
              <Button className="flex w-full h-12 rounded-xl font-medium" variant={signals.canGenerateNutritionAi ? "primary" : "secondary"} disabled={!signals.canGenerateNutritionAi} title={aiLockReason ?? undefined} onClick={() => router.push("/app/nutricion?ai=1")}>
                {signals.canGenerateNutritionAi ? "Generar con IA" : aiLockReason ?? "No disponible"}
              </Button>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
