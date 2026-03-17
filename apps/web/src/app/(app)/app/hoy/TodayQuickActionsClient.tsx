"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PremiumNutritionIcon,
  PremiumProgressIcon,
  PremiumWorkoutIcon,
} from "@/components/icons/PremiumIcons";
import { MacroRing } from "@/components/ui/MacroRing";
import { Button, ButtonLink } from "@/components/ui/Button";
import { readAuthEntitlementSnapshot } from "@/context/auth/entitlements";
import { useLanguage } from "@/context/LanguageProvider";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { trackEvent } from "@/lib/analytics";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { canAccessFeature } from "@/lib/entitlements";
import type { AuthMeResponse, NutritionPlanDetail, NutritionPlanListItem, TrainingPlanDetail } from "@/lib/types";
import { buildNutritionAdherenceStoreFromMealLog } from "@/lib/nutritionAdherence";
import { getNutritionMealKey } from "@/lib/nutritionMealKey";
import { TodayEmptyState } from "./TodayEmptyState";
import { TodayErrorState } from "./TodayErrorState";
import { TodaySkeleton } from "./TodaySkeleton";

const trainingRoute = "/app/entrenamiento";
const billingRoute = "/app/settings/billing";
const manualPlanRoute = "/app/entrenamiento/editar";
const aiPlanRoute = "/app/entrenamiento?ai=1";
const checkinRoute = "/app/seguimiento/check-in";

type ViewStatus = "loading" | "success" | "error";
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
  nutritionMealsLogged: number;
  nutritionMealsTotal: number;
  currentWeightKg: number | null;
  streakDays: number;
  hasTrainingAccess: boolean;
};

type TrackingPayload = {
  checkins?: Array<{ date?: string | null; weightKg?: number | null }>;
  mealLog?: Array<{ id?: string; date?: string; mealKey?: string; mealType?: string; title?: string; calories?: number; protein?: number; carbs?: number; fats?: number; completedAt?: string }>;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { entitlements } = useAuthEntitlements();
  const hasAiAccess = canAccessFeature(entitlements, "ai");

  const [status, setStatus] = useState<ViewStatus>("loading");
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
    nutritionMealsLogged: 0,
    nutritionMealsTotal: 0,
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
        nutritionMealsLogged: 0,
        nutritionMealsTotal: 0,
        currentWeightKg: null,
        streakDays: 0,
        hasTrainingAccess: true,
      };

      let trackingPayload: TrackingPayload = {
        checkins: [],
        mealLog: [],
      };

      if (authMeResponse.ok) {
        const authMe = (await authMeResponse.json()) as AuthMeResponse;
        const entitlementSnapshot = readAuthEntitlementSnapshot(authMe);
        nextSignals.userName = authMe.name?.trim() ?? "";
        nextSignals.subscriptionPlan = entitlementSnapshot.subscriptionPlan;
        nextSignals.aiTokenBalance = entitlementSnapshot.tokenBalance;
        nextSignals.canGenerateTrainingAi = entitlementSnapshot.modules.strength && entitlementSnapshot.tokenBalance > 0;
        nextSignals.canGenerateNutritionAi = entitlementSnapshot.modules.nutrition && entitlementSnapshot.tokenBalance > 0;
        nextSignals.hasTrainingAccess = entitlementSnapshot.modules.strength;
      }

      if (trackingResponse.ok) {
        trackingPayload = (await trackingResponse.json()) as TrackingPayload;
        nextSignals.checkinDoneThisWeek = hasWeeklyCheckin(trackingPayload);
        nextSignals.currentWeightKg = getLatestWeight(trackingPayload);
        nextSignals.streakDays = getStreakDays(trackingPayload);
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
            nextSignals.nutritionTargetCalories = Number.isFinite(nutritionDetail.dailyCalories)
              ? nutritionDetail.dailyCalories
              : null;
            if (nutritionDay?.meals?.length) {
              const nutritionDayKey = nutritionDay.date ? toDateKey(parseDate(nutritionDay.date) ?? new Date()) : toDateKey(new Date());
              const adherenceStore = buildNutritionAdherenceStoreFromMealLog(trackingPayload.mealLog ?? []);
              const consumedMealKeys = new Set(adherenceStore[nutritionDayKey] ?? []);
              nextSignals.nutritionMealsTotal = nutritionDay.meals.length;
              nextSignals.nutritionMealsLogged = nutritionDay.meals.reduce((count, meal, index) => count + (consumedMealKeys.has(getNutritionMealKey(meal, nutritionDayKey, index)) ? 1 : 0), 0);
              nextSignals.nutritionConsumedCalories = Math.round(
                nutritionDay.meals.reduce((sum, meal, index) => sum + (consumedMealKeys.has(getNutritionMealKey(meal, nutritionDayKey, index)) ? (Number.isFinite(meal.calories) ? meal.calories : 0) : 0), 0),
              );
              nextSignals.nutritionReady = nextSignals.nutritionMealsLogged > 0;
            } else {
              nextSignals.nutritionReady = false;
            }
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- trigger async load on page mount
    void loadTodaySignals();
  }, [loadTodaySignals]);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackEvent("today_view");
  }, []);

  const userName = signals.userName || t("ui.userFallback");
  const currentRoute = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const showCheckinSuccess = searchParams.get("checkin") === "success";
  const billingHref = `${billingRoute}?returnTo=${encodeURIComponent(currentRoute)}`;

  const completedGoals = useMemo(
    () => [signals.trainingState === "workout", signals.nutritionReady, signals.checkinDoneThisWeek].filter(Boolean).length,
    [signals.checkinDoneThisWeek, signals.nutritionReady, signals.trainingState],
  );
  const dailyProgressPercent = Math.round((completedGoals / 3) * 100);
  const nutritionProgressPercent = signals.nutritionMealsTotal > 0 ? Math.round((signals.nutritionMealsLogged / signals.nutritionMealsTotal) * 100) : 0;
  const checkinProgressPercent = signals.checkinDoneThisWeek ? 100 : 35;
  const aiLockReason = signals.aiTokenBalance <= 0 ? "Sin tokens" : !hasAiAccess ? "Plan bloqueado" : null;

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
    <div className="flex flex-col gap-6 premium-page-shell premium-page-shell--compact">
      <header className="flex items-center justify-between gap-4 premium-page-header">
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
          {showCheckinSuccess ? (
            <section className="card premium-inline-banner premium-success-surface premium-fade-up border border-emerald-400/30 bg-emerald-500/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-sm font-semibold text-emerald-300">Check-in guardado</p>
                  <p className="m-0 mt-1 text-sm text-muted">Tu progreso de hoy ya se ha actualizado con tus métricas reales.</p>
                </div>
                <ButtonLink as={Link} href="/app/seguimiento" variant="secondary" className="fit-content">
                  Ver progreso
                </ButtonLink>
              </div>
            </section>
          ) : null}
          {showEmptyBanner ? <TodayEmptyState description={t("today.hubEmptyDescription")} ctaLabel={t("today.hubEmptyCta")} href="/app/entrenamiento" /> : null}

          <div className="grid gap-6 md:grid-cols-3" data-testid="today-actions-grid">
            <section className="card xl:col-span-2 premium-fade-up" data-testid="today-action-card">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
                  <PremiumWorkoutIcon width={28} height={28} className="text-primary" />
                </div>
                <div>
                  <p className="m-0 text-xs uppercase tracking-wider text-muted">Entrenamiento de hoy</p>
                  <h2 className="m-0 mt-0.5 text-xl font-semibold text-primary">{signals.trainingState === "workout" ? signals.trainingName : signals.trainingState === "rest" ? "Descanso" : "Sin plan"}</h2>
                </div>
              </div>

              {signals.trainingState === "workout" && (
                <div className="mb-4 flex items-center gap-4 text-sm text-muted">
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
                  <ButtonLink as={Link} href={manualPlanRoute} className="flex h-12 w-full rounded-xl font-semibold">
                    {t("today.trainingManualCta")}
                  </ButtonLink>
                  <Button variant="secondary" className="flex h-12 w-full rounded-xl font-medium" disabled={!hasAiAccess} onClick={() => hasAiAccess && router.push(aiPlanRoute)}>
                    {t("today.trainingAiCta")}
                  </Button>
                </div>
              ) : (
                <Button className="flex h-12 w-full rounded-xl font-semibold" onClick={() => {
                  if (!signals.hasTrainingAccess) {
                    router.push(billingHref);
                    return;
                  }
                  router.push(signals.trainingState === "workout" ? todayTrainingHref : trainingRoute);
                }}>
                  {signals.trainingState === "rest" ? "Ver semana" : "Empezar entrenamiento"}
                </Button>
              )}
            </section>

            <section className="card premium-fade-up" data-testid="today-action-card">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/20">
                  <PremiumNutritionIcon width={28} height={28} className="text-success" />
                </div>
                <div>
                  <p className="m-0 text-xs uppercase tracking-wider text-muted">Nutrición</p>
                  <h2 className="m-0 mt-0.5 text-xl font-semibold text-primary">Calorías</h2>
                </div>
              </div>

              <div className="mb-5 flex items-center gap-4">
                <NutritionRing value={signals.nutritionConsumedCalories} total={signals.nutritionTargetCalories} />
                <div className="flex-1">
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted">Registradas</span>
                      <span className="font-semibold text-primary">{signals.nutritionMealsLogged}/{signals.nutritionMealsTotal || 0} comidas</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted">{signals.nutritionConsumedCalories} kcal registradas hoy</p>
                  <ProgressMetric label="Comidas del dia" percent={nutritionProgressPercent} color="var(--color-success)" />
                </div>
              </div>

              <ButtonLink as={Link} href="/app/nutricion" variant="secondary" className="flex h-12 w-full rounded-xl font-medium">
                Registrar comida
              </ButtonLink>
            </section>

            <section className="card premium-fade-up" data-testid="today-action-card">
              <div className="mb-5 flex items-center gap-4">
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

              <div className="mb-5 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">{signals.currentWeightKg ? signals.currentWeightKg.toFixed(1) : "--"}</span>
                <span className="text-xl text-muted">kg</span>
              </div>

              <ProgressMetric label="Meta: -5 kg" percent={checkinProgressPercent} color="var(--color-info)" />

              <ButtonLink as={Link} href={checkinRoute} className="flex h-12 w-full rounded-xl font-medium" data-testid="quick-action-tracking">
                {signals.checkinDoneThisWeek ? "Actualizar check-in" : t("profile.checkinTitle")}
              </ButtonLink>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
