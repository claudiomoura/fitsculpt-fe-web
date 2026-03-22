"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import {
  PremiumCheckinIcon,
  PremiumNutritionIcon,
  PremiumWorkoutIcon,
} from "@/components/icons/PremiumIcons";
import { Button, ButtonLink } from "@/design-system/components/Button";
import { readAuthEntitlementSnapshot } from "@/context/auth/entitlements";
import { useLanguage } from "@/context/LanguageProvider";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { trackEvent } from "@/lib/analytics";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { canAccessFeature } from "@/lib/entitlements";
import type {
  AuthMeResponse,
  NutritionPlanDetail,
  NutritionPlanListItem,
  TrainingPlanDetail,
} from "@/lib/types";
import { buildNutritionAdherenceStoreFromMealLog } from "@/lib/nutritionAdherence";
import { getNutritionMealKey } from "@/lib/nutritionMealKey";
import { TodayEmptyState } from "./TodayEmptyState";
import { TodayErrorState } from "./TodayErrorState";
import { TodaySkeleton } from "./TodaySkeleton";
import QuickLogHub from "@/components/quick-log/QuickLogHub";

const trainingRoute = "/app/entrenamiento";
const billingRoute = "/app/settings/billing";
const manualPlanRoute = "/app/entrenamiento/editar";
const aiPlanRoute = "/app/entrenamiento?ai=1";
const checkinRoute = "/app/seguimiento/check-in";

type ViewStatus = "loading" | "success" | "error";
type TrainingState = "workout" | "rest" | "no-plan";
type ModuleStatus = "ready" | "empty" | "error";

type TodaySignals = {
  checkinDoneThisWeek: boolean;
  userName: string;
  subscriptionPlan: string;
  aiTokenBalance: number;
  trainingName: string;
  trainingDuration: number | null;
  trainingExerciseCount: number;
  trainingDayKey: string | null;
  trainingState: TrainingState;
  nutritionReady: boolean;
  nutritionTargetCalories: number | null;
  nutritionConsumedCalories: number;
  nutritionProteinG: number;
  nutritionCarbsG: number;
  nutritionFatsG: number;
  nutritionMealsLogged: number;
  nutritionMealsTotal: number;
  currentWeightKg: number | null;
  previousWeightKg: number | null;
  startWeightKg: number | null;
  goalWeightKg: number | null;
  streakDays: number;
  hasTrainingAccess: boolean;
  todayWorkoutId: string | null;
  trainingStatus: ModuleStatus;
  nutritionStatus: ModuleStatus;
  checkinStatus: ModuleStatus;
  checkinTrend: Array<{ label: string; weightKg: number }>;
};

type TrackingPayload = {
  checkins?: Array<{ date?: string | null; weightKg?: number | null }>;
  mealLog?: Array<{
    id?: string;
    date?: string;
    mealKey?: string;
    mealType?: string;
    title?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    completedAt?: string;
  }>;
};

type ActiveTrainingPlanPayload = {
  plan?: TrainingPlanDetail | null;
};

type NutritionPlansPayload = {
  items?: Array<Pick<NutritionPlanListItem, "id">>;
};

type WorkoutLookupItem = {
  id: string;
  scheduledAt?: string | null;
};

type ProgressTone = "low" | "medium" | "high" | "complete";

const integerFormatter = new Intl.NumberFormat("es-ES");

function ProgressBar({
  value,
  total,
  className = "",
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const width = Math.min(
    100,
    Math.max(0, total > 0 ? Math.round((value / total) * 100) : 0),
  );
  const tone: ProgressTone =
    width >= 100
      ? "complete"
      : width >= 70
        ? "high"
        : width >= 30
          ? "medium"
          : "low";
  return (
    <div
      className={`today-progress-bar h-2 w-full overflow-hidden rounded-full ${className}`}
    >
      <div
        className={`today-progress-bar-fill today-progress-bar-fill--${tone} h-full rounded-full transition-all`}
        style={{ width: `${width}%`, minWidth: width > 0 ? 8 : 0 }}
      />
    </div>
  );
}

function NutritionRing({ value, total }: { value: number; total: number }) {
  const safeValue = Math.max(0, Math.round(value));
  const safeTarget = Math.max(1, Math.round(total));
  const progress = Math.max(0, Math.min(1, safeValue / safeTarget));
  const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));

  const RING_SIZE = 112;
  const INNER_SIZE = 76;
  const OUTER_RADIUS = 52;
  const INNER_RADIUS = 42;
  const BAR_SIZE = 8;

  const chartData = [{ name: "calories", value: percent }];

  return (
    <div
      className={`today-nutrition-ring today-nutrition-ring--${progress === 0 ? "zero" : "ready"}`}
      aria-label={`${safeValue} de ${safeTarget} kcal`}
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <RadialBarChart
        width={RING_SIZE}
        height={RING_SIZE}
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        innerRadius={INNER_RADIUS}
        outerRadius={OUTER_RADIUS}
        barSize={BAR_SIZE}
        startAngle={90}
        endAngle={-270}
        data={chartData}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          angleAxisId={0}
          tick={false}
        />
        <RadialBar
          dataKey="value"
          background={{ fill: "var(--today-donut-track)" }}
          cornerRadius={99}
          fill="var(--today-donut-fill)"
          isAnimationActive={false}
        />
      </RadialBarChart>

      <div
        className="today-nutrition-ring-center"
        style={{ width: INNER_SIZE, height: INNER_SIZE }}
      >
        <strong className="today-nutrition-ring-value">{percent}%</strong>
      </div>
    </div>
  );
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

type ProfileActivity = "sedentary" | "light" | "moderate" | "very" | "extra";
type ProfileGoal = "cut" | "maintain" | "bulk";

type ProfileSummaryPayload = {
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  goalWeightKg?: number | null;
  sex?: "male" | "female" | null;
  activity?: ProfileActivity | null;
  goal?: ProfileGoal | null;
  macroPreferences?: {
    cutPercent?: number | null;
    bulkPercent?: number | null;
  } | null;
  nutritionPlan?: {
    dailyCalories?: number | null;
  } | null;
};

function activityMultiplier(activity: ProfileActivity): number {
  switch (activity) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "very":
      return 1.725;
    case "extra":
      return 1.9;
    default:
      return 1.55;
  }
}

function estimateNutritionTargetCalories(profile: ProfileSummaryPayload): number | null {
  if (
    !isPositiveNumber(profile.weightKg) ||
    !isPositiveNumber(profile.heightCm) ||
    !isPositiveNumber(profile.age)
  ) {
    return null;
  }

  const weight = profile.weightKg;
  const height = profile.heightCm;
  const age = profile.age;
  const sexOffset = profile.sex === "female" ? -161 : 5;

  const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
  const tdee = bmr * activityMultiplier(profile.activity ?? "moderate");

  let target = tdee;
  const cutPercent = Number(profile.macroPreferences?.cutPercent);
  const bulkPercent = Number(profile.macroPreferences?.bulkPercent);

  if (profile.goal === "cut") {
    const cutFactor = Number.isFinite(cutPercent) ? cutPercent / 100 : 0.15;
    target = tdee * (1 - cutFactor);
  } else if (profile.goal === "bulk") {
    const bulkFactor = Number.isFinite(bulkPercent) ? bulkPercent / 100 : 0.1;
    target = tdee * (1 + bulkFactor);
  }

  if (!Number.isFinite(target) || target <= 0) return null;
  return Math.max(1000, Math.round(target));
}

const findTodayPlanDay = <T extends { date?: string }>(
  days: T[],
  startDate?: string | null,
) => {
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
  return Number(
    validEntries.sort((a, b) => b.parsed.getTime() - a.parsed.getTime())[0]
      ?.entry.weightKg,
  );
};

const getPreviousWeight = (payload?: TrackingPayload | null) => {
  const validEntries =
    payload?.checkins
      ?.map((entry) => ({ entry, parsed: parseDate(entry.date) }))
      .filter(
        (item): item is { entry: { weightKg?: number | null }; parsed: Date } =>
          item.parsed !== null && Number.isFinite(item.entry.weightKg),
      )
      .sort((a, b) => b.parsed.getTime() - a.parsed.getTime()) ?? [];

  if (validEntries.length < 2) return null;
  return Number(validEntries[1]?.entry.weightKg);
};

const getCheckinTrend = (payload?: TrackingPayload | null) => {
  const points =
    payload?.checkins
      ?.map((entry) => ({
        parsed: parseDate(entry.date),
        weightKg: Number(entry.weightKg),
      }))
      .filter(
        (item): item is { parsed: Date; weightKg: number } =>
          item.parsed !== null && Number.isFinite(item.weightKg),
      )
      .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())
      .slice(-8)
      .map((item) => ({
        label: `${item.parsed.getDate()}/${item.parsed.getMonth() + 1}`,
        weightKg: Number(item.weightKg.toFixed(1)),
      })) ?? [];

  return points;
};

const getStreakDays = (payload?: TrackingPayload | null) => {
  const rawDates =
    payload?.checkins
      ?.map((entry) => parseDate(entry.date))
      .filter((date): date is Date => date !== null) ?? [];
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

const normalizeWorkoutDateKey = (scheduledAt?: string | null) => {
  if (!scheduledAt) return null;
  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
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
    trainingName: "",
    trainingDuration: null,
    trainingExerciseCount: 0,
    trainingDayKey: null,
    trainingState: "no-plan",
    nutritionReady: false,
    nutritionTargetCalories: null,
    nutritionConsumedCalories: 0,
    nutritionProteinG: 0,
    nutritionCarbsG: 0,
    nutritionFatsG: 0,
    nutritionMealsLogged: 0,
    nutritionMealsTotal: 0,
    currentWeightKg: null,
    previousWeightKg: null,
    startWeightKg: null,
    goalWeightKg: null,
    streakDays: 0,
    hasTrainingAccess: true,
    todayWorkoutId: null,
    trainingStatus: "empty",
    nutritionStatus: "empty",
    checkinStatus: "empty",
    checkinTrend: [],
  });
  const hasTrackedViewRef = useRef(false);

  const loadTodaySignals = useCallback(async () => {
    setStatus("loading");

    try {
      const [
        trackingResponse,
        activeTrainingResponse,
        nutritionListResponse,
        authMeResponse,
        profileResponse,
        workoutsResponse,
      ] = await Promise.all([
        fetch("/api/tracking", { cache: "no-store", credentials: "include" }),
        fetch("/api/training-plans/active?includeDays=1", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/nutrition-plans?limit=1", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/auth/me", { cache: "no-store", credentials: "include" }),
        fetch("/api/profile", { cache: "no-store", credentials: "include" }),
        fetch("/api/workouts", { cache: "no-store", credentials: "include" }),
      ]);

      if (
        !trackingResponse.ok &&
        !activeTrainingResponse.ok &&
        !nutritionListResponse.ok
      ) {
        setStatus("error");
        return;
      }

      const nextSignals: TodaySignals = {
        checkinDoneThisWeek: false,
        userName: "",
        subscriptionPlan: "FREE",
        aiTokenBalance: 0,
        trainingName: "",
        trainingDuration: null,
        trainingExerciseCount: 0,
        trainingDayKey: null,
        trainingState: "no-plan",
        nutritionReady: false,
        nutritionTargetCalories: null,
        nutritionConsumedCalories: 0,
        nutritionProteinG: 0,
        nutritionCarbsG: 0,
        nutritionFatsG: 0,
        nutritionMealsLogged: 0,
        nutritionMealsTotal: 0,
        currentWeightKg: null,
        previousWeightKg: null,
        startWeightKg: null,
        goalWeightKg: null,
        streakDays: 0,
        hasTrainingAccess: true,
        todayWorkoutId: null,
        trainingStatus: "empty",
        nutritionStatus: "empty",
        checkinStatus: "empty",
        checkinTrend: [],
      };

      let trackingPayload: TrackingPayload = {
        checkins: [],
        mealLog: [],
      };
      const todayDateKey = toDateKey(new Date());
      let profileEstimatedNutritionTarget: number | null = null;

      if (authMeResponse.ok) {
        const authMe = (await authMeResponse.json()) as AuthMeResponse;
        const entitlementSnapshot = readAuthEntitlementSnapshot(authMe);
        nextSignals.userName = authMe.name?.trim() ?? "";
        nextSignals.subscriptionPlan = entitlementSnapshot.subscriptionPlan;
        nextSignals.aiTokenBalance = entitlementSnapshot.tokenBalance;
        nextSignals.hasTrainingAccess = entitlementSnapshot.modules.strength;
      }

      if (profileResponse.ok) {
        const profile = (await profileResponse.json()) as ProfileSummaryPayload;
        nextSignals.startWeightKg = isPositiveNumber(profile.weightKg)
          ? profile.weightKg
          : null;
        nextSignals.goalWeightKg = isPositiveNumber(profile.goalWeightKg)
          ? profile.goalWeightKg
          : null;

        // Prefer explicit nutrition plan target from profile when available.
        const profilePlanTarget = Number(profile.nutritionPlan?.dailyCalories);
        if (Number.isFinite(profilePlanTarget) && profilePlanTarget > 0) {
          profileEstimatedNutritionTarget = Math.round(profilePlanTarget);
        } else {
          // Fallback to calculated target from profile metrics.
          profileEstimatedNutritionTarget = estimateNutritionTargetCalories(profile);
        }
      }

      if (trackingResponse.ok) {
        trackingPayload = (await trackingResponse.json()) as TrackingPayload;
        nextSignals.checkinStatus =
          (trackingPayload.checkins?.length ?? 0) > 0 ? "ready" : "empty";
        nextSignals.checkinTrend = getCheckinTrend(trackingPayload);
        nextSignals.checkinDoneThisWeek = hasWeeklyCheckin(trackingPayload);
        nextSignals.currentWeightKg = getLatestWeight(trackingPayload);
        nextSignals.previousWeightKg = getPreviousWeight(trackingPayload);
        const earliestCheckin = [...(trackingPayload.checkins ?? [])]
          .filter(
            (entry) =>
              isPositiveNumber(entry.weightKg) &&
              typeof entry.date === "string",
          )
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
        if (isPositiveNumber(earliestCheckin?.weightKg)) {
          nextSignals.startWeightKg = earliestCheckin.weightKg;
        }
        nextSignals.streakDays = getStreakDays(trackingPayload);
        const todaysMealLog = (trackingPayload.mealLog ?? []).filter(
          (entry) => entry.date === todayDateKey,
        );
        nextSignals.nutritionMealsLogged = todaysMealLog.length;
        nextSignals.nutritionConsumedCalories = Math.round(
          todaysMealLog.reduce(
            (sum, entry) =>
              sum +
              (Number.isFinite(entry.calories) ? Number(entry.calories) : 0),
            0,
          ),
        );
        nextSignals.nutritionProteinG = Math.round(
          todaysMealLog.reduce(
            (sum, entry) =>
              sum +
              (Number.isFinite(entry.protein) ? Number(entry.protein) : 0),
            0,
          ),
        );
        nextSignals.nutritionCarbsG = Math.round(
          todaysMealLog.reduce(
            (sum, entry) =>
              sum + (Number.isFinite(entry.carbs) ? Number(entry.carbs) : 0),
            0,
          ),
        );
        nextSignals.nutritionFatsG = Math.round(
          todaysMealLog.reduce(
            (sum, entry) =>
              sum + (Number.isFinite(entry.fats) ? Number(entry.fats) : 0),
            0,
          ),
        );
        nextSignals.nutritionReady = todaysMealLog.length > 0;
      } else {
        nextSignals.checkinStatus = "error";
      }

      if (
        !isPositiveNumber(nextSignals.currentWeightKg) &&
        isPositiveNumber(nextSignals.startWeightKg)
      ) {
        nextSignals.currentWeightKg = nextSignals.startWeightKg;
      }

      if (activeTrainingResponse.ok) {
        const activeTraining =
          (await activeTrainingResponse.json()) as ActiveTrainingPlanPayload;
        const trainingPlan = activeTraining.plan;
        if (trainingPlan?.days?.length) {
          const trainingDay = findTodayPlanDay(
            trainingPlan.days,
            trainingPlan.startDate,
          );
          if (trainingDay && (trainingDay.exercises?.length ?? 0) > 0) {
            nextSignals.trainingState = "workout";
            nextSignals.trainingStatus = "ready";
            nextSignals.trainingName =
              trainingDay.label || trainingDay.focus || trainingPlan.title;
            nextSignals.trainingDuration = Number.isFinite(trainingDay.duration)
              ? Number(trainingDay.duration)
              : null;
            nextSignals.trainingExerciseCount =
              trainingDay.exercises?.length ?? 0;
            nextSignals.trainingDayKey = trainingDay.date
              ? toDateKey(parseDate(trainingDay.date) ?? new Date())
              : toDateKey(new Date());
          } else {
            nextSignals.trainingState = "rest";
            nextSignals.trainingStatus = "ready";
          }
        } else {
          nextSignals.trainingStatus = "empty";
        }
      } else {
        nextSignals.trainingStatus = "error";
      }

      if (nutritionListResponse.ok) {
        const nutritionList =
          (await nutritionListResponse.json()) as NutritionPlansPayload;
        const nutritionPlanId = nutritionList.items?.[0]?.id;
        if (nutritionPlanId) {
          const nutritionDetailResponse = await fetch(
            `/api/nutrition-plans/${nutritionPlanId}`,
            {
              cache: "no-store",
              credentials: "include",
            },
          );
          if (nutritionDetailResponse.ok) {
            const nutritionDetail =
              (await nutritionDetailResponse.json()) as NutritionPlanDetail;
            const nutritionDay = findTodayPlanDay(
              nutritionDetail.days,
              nutritionDetail.startDate,
            );
            nextSignals.nutritionTargetCalories = Number.isFinite(
              nutritionDetail.dailyCalories,
            )
              ? nutritionDetail.dailyCalories
              : null;
            if (nutritionDay?.meals?.length) {
              nextSignals.nutritionStatus = "ready";
              const nutritionDayKey = nutritionDay.date
                ? toDateKey(parseDate(nutritionDay.date) ?? new Date())
                : toDateKey(new Date());
              const adherenceStore = buildNutritionAdherenceStoreFromMealLog(
                trackingPayload.mealLog ?? [],
              );
              const consumedMealKeys = new Set(
                adherenceStore[nutritionDayKey] ?? [],
              );
              nextSignals.nutritionMealsTotal = nutritionDay.meals.length;
              if (nextSignals.nutritionMealsLogged === 0) {
                nextSignals.nutritionMealsLogged = nutritionDay.meals.reduce(
                  (count, meal, index) =>
                    count +
                    (consumedMealKeys.has(
                      getNutritionMealKey(meal, nutritionDayKey, index),
                    )
                      ? 1
                      : 0),
                  0,
                );
                nextSignals.nutritionConsumedCalories = Math.round(
                  nutritionDay.meals.reduce(
                    (sum, meal, index) =>
                      sum +
                      (consumedMealKeys.has(
                        getNutritionMealKey(meal, nutritionDayKey, index),
                      )
                        ? Number.isFinite(meal.calories)
                          ? meal.calories
                          : 0
                        : 0),
                    0,
                  ),
                );
                nextSignals.nutritionProteinG = Math.round(
                  nutritionDay.meals.reduce(
                    (sum, meal, index) =>
                      sum +
                      (consumedMealKeys.has(
                        getNutritionMealKey(meal, nutritionDayKey, index),
                      )
                        ? Number.isFinite(meal.protein)
                          ? meal.protein
                          : 0
                        : 0),
                    0,
                  ),
                );
                nextSignals.nutritionCarbsG = Math.round(
                  nutritionDay.meals.reduce(
                    (sum, meal, index) =>
                      sum +
                      (consumedMealKeys.has(
                        getNutritionMealKey(meal, nutritionDayKey, index),
                      )
                        ? Number.isFinite(meal.carbs)
                          ? meal.carbs
                          : 0
                        : 0),
                    0,
                  ),
                );
                nextSignals.nutritionFatsG = Math.round(
                  nutritionDay.meals.reduce(
                    (sum, meal, index) =>
                      sum +
                      (consumedMealKeys.has(
                        getNutritionMealKey(meal, nutritionDayKey, index),
                      )
                        ? Number.isFinite(meal.fats)
                          ? meal.fats
                          : 0
                        : 0),
                    0,
                  ),
                );
                nextSignals.nutritionReady =
                  nextSignals.nutritionMealsLogged > 0;
              }
            } else {
              nextSignals.nutritionStatus = "empty";
              nextSignals.nutritionReady = nextSignals.nutritionMealsLogged > 0;
            }
          } else {
            nextSignals.nutritionStatus = "error";
          }
        } else {
          nextSignals.nutritionStatus = "empty";
        }
      } else {
        nextSignals.nutritionStatus = "error";
      }

      // Fallback goal calories when user has profile but no active nutrition plan.
      if (
        (nextSignals.nutritionTargetCalories === null ||
          !Number.isFinite(nextSignals.nutritionTargetCalories)) &&
        profileEstimatedNutritionTarget !== null
      ) {
        nextSignals.nutritionTargetCalories = profileEstimatedNutritionTarget;
      }

      if (workoutsResponse.ok) {
        const workoutsPayload =
          (await workoutsResponse.json()) as WorkoutLookupItem[];
        const targetDayKey = nextSignals.trainingDayKey ?? todayDateKey;
        const matchedWorkout = Array.isArray(workoutsPayload)
          ? workoutsPayload.find(
              (workout) =>
                normalizeWorkoutDateKey(workout.scheduledAt) === targetDayKey,
            )
          : undefined;
        nextSignals.todayWorkoutId = matchedWorkout?.id ?? null;
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
    () =>
      [
        signals.trainingState === "workout",
        signals.nutritionReady,
        signals.checkinDoneThisWeek,
      ].filter(Boolean).length,
    [
      signals.checkinDoneThisWeek,
      signals.nutritionReady,
      signals.trainingState,
    ],
  );
  const dailyProgressPercent = Math.round((completedGoals / 3) * 100);
  const checkinDeltaKg =
    typeof signals.currentWeightKg === "number" &&
    Number.isFinite(signals.currentWeightKg) &&
    typeof signals.previousWeightKg === "number" &&
    Number.isFinite(signals.previousWeightKg)
      ? Number((signals.currentWeightKg - signals.previousWeightKg).toFixed(1))
      : null;
  const aiLockReason =
    signals.aiTokenBalance <= 0
      ? t("ai.insufficientTokens")
      : !hasAiAccess
        ? t("today.lockedDescription")
        : null;
  const nutritionGoalKcal =
    typeof signals.nutritionTargetCalories === "number" &&
    Number.isFinite(signals.nutritionTargetCalories)
      ? Math.max(0, Math.round(signals.nutritionTargetCalories))
      : null;
  const checkinStatusLabel =
    signals.checkinStatus === "error"
      ? "Error de carga"
      : signals.checkinStatus === "empty"
        ? "Sin datos"
        : signals.checkinDoneThisWeek
          ? "Check-in al día"
          : "0 registrado esta semana";

  const nutritionPrimaryKcal =
    signals.nutritionStatus === "error"
      ? "--"
      : `${Math.max(0, signals.nutritionConsumedCalories)}`;
  const nutritionRemainingCalories =
    typeof signals.nutritionTargetCalories === "number" &&
    Number.isFinite(signals.nutritionTargetCalories)
      ? Math.max(
          0,
          Math.round(
            signals.nutritionTargetCalories - signals.nutritionConsumedCalories,
          ),
        )
      : null;
  const nutritionMetaText =
    signals.nutritionStatus === "error"
      ? "No se pudo cargar este bloque"
      : nutritionRemainingCalories !== null
        ? `${integerFormatter.format(nutritionRemainingCalories)} kcal restantes`
        : "Sin objetivo calórico";
  const canRenderNutritionRing =
    typeof nutritionGoalKcal === "number" && nutritionGoalKcal > 0;
  const nutritionConsumedKcal = Math.max(
    0,
    Math.round(signals.nutritionConsumedCalories),
  );
  const nutritionSummaryValue = integerFormatter.format(nutritionConsumedKcal);
  const nutritionSummaryTarget =
    nutritionGoalKcal !== null
      ? integerFormatter.format(nutritionGoalKcal)
      : null;
  const nutritionProgressLabel =
    signals.nutritionMealsTotal > 0
      ? `${signals.nutritionMealsLogged}/${signals.nutritionMealsTotal} comidas`
      : "Sin comidas planificadas";
  const nutritionCardTone =
    signals.nutritionStatus === "error"
      ? "error"
      : canRenderNutritionRing
        ? "ready"
        : "disabled";
  const checkinMainWeight =
    typeof signals.currentWeightKg === "number" &&
    Number.isFinite(signals.currentWeightKg)
      ? signals.currentWeightKg.toFixed(1)
      : "--";
  const checkinContext =
    checkinDeltaKg === null
      ? checkinStatusLabel
      : `${checkinDeltaKg > 0 ? "+" : ""}${checkinDeltaKg.toFixed(1)} kg vs último check-in`;
  const checkinGoalGapKg =
    typeof signals.currentWeightKg === "number" &&
    Number.isFinite(signals.currentWeightKg) &&
    typeof signals.goalWeightKg === "number" &&
    Number.isFinite(signals.goalWeightKg)
      ? Number((signals.currentWeightKg - signals.goalWeightKg).toFixed(1))
      : null;
  const checkinGoalContext =
    checkinGoalGapKg === null
      ? null
      : checkinGoalGapKg === 0
        ? "Objetivo alcanzado. Excelente constancia."
        : checkinGoalGapKg > 0
          ? `Te faltan ${Math.abs(checkinGoalGapKg).toFixed(1)} kg para tu objetivo. Vas por buen camino.`
          : `Ya superaste tu objetivo por ${Math.abs(checkinGoalGapKg).toFixed(1)} kg. Mantenerlo tambien es progreso.`;
  const nutritionProgressPercent =
    nutritionGoalKcal && nutritionGoalKcal > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((nutritionConsumedKcal / nutritionGoalKcal) * 100),
          ),
        )
      : 0;

  const showEmptyBanner =
    status === "success" &&
    signals.trainingState === "no-plan" &&
    !signals.nutritionReady &&
    !signals.checkinDoneThisWeek;
  const canStartTodayWorkout =
    signals.trainingState === "workout" && Boolean(signals.todayWorkoutId);
  const isDailyProgressComplete = dailyProgressPercent >= 100;
  const trainingMeta =
    signals.trainingState === "workout"
      ? [
          signals.trainingDuration ? `${signals.trainingDuration} min` : null,
          `${signals.trainingExerciseCount} ejercicios hoy`,
        ]
          .filter(Boolean)
          .join(" · ")
      : signals.trainingState === "rest"
        ? "Hoy toca recuperación"
        : t("today.trainingStateNoPlan");
  const todayTrainingHref = signals.todayWorkoutId
    ? `/app/entrenamiento/${encodeURIComponent(signals.todayWorkoutId)}/start`
    : trainingRoute;
  const primaryActionLabel =
    signals.trainingState === "rest"
      ? "Ver semana"
      : signals.trainingState === "workout"
        ? "Empezar entrenamiento"
        : t("today.trainingManualCta");

  const handlePrimaryTrainingAction = () => {
    if (signals.trainingState === "no-plan") {
      router.push(manualPlanRoute);
      return;
    }
    if (signals.trainingState === "workout" && !signals.todayWorkoutId) {
      return;
    }
    if (!signals.hasTrainingAccess) {
      trackEvent("today_cta_click", {
        target: "billing",
        origin: "today_training",
        returnTo: currentRoute,
      });
      router.push(billingHref);
      return;
    }
    trackEvent("training_start_clicked", {
      target: "training",
      origin: "today",
    });
    trackEvent("workout_started", { target: "training", origin: "today" });
    router.push(
      signals.trainingState === "workout" ? todayTrainingHref : trainingRoute,
    );
  };

  return (
    <div className="today-page-stack flex flex-col gap-4 pb-0">
      <header className="flex items-start justify-between gap-3 premium-page-header">
        <div className="min-w-0">
          <h1 className="m-0 text-[1.58rem] font-bold leading-tight text-primary">
            Buenos días, {userName}
          </h1>
          <p className="m-0 mt-1 text-sm text-muted">
            Tu enfoque de hoy en 3 acciones.
          </p>
        </div>
        <QuickLogHub
          origin="today"
          latestCheckin={null}
          currentWeightKg={signals.currentWeightKg}
          onSaved={async () => {
            await loadTodaySignals();
          }}
        />
      </header>

      {status === "loading" ? <TodaySkeleton /> : null}
      {status === "error" ? (
        <TodayErrorState
          message={t("today.hubErrorMessage")}
          retryLabel={t("ui.retry")}
          onRetry={() => void loadTodaySignals()}
        />
      ) : null}

      {status === "success" ? (
        <>
          {showCheckinSuccess ? (
            <section className="status-card status-card--success premium-fade-up" role="status" aria-live="polite">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-sm font-semibold text-primary">
                    Check-in guardado
                  </p>
                  <p className="m-0 mt-1 text-sm text-muted">
                    Tu progreso de hoy ya se ha actualizado con tus métricas
                    reales.
                  </p>
                </div>
                <ButtonLink
                  as={Link}
                  href="/app/seguimiento"
                  variant="secondary"
                  className="fit-content"
                >
                  Ver progreso
                </ButtonLink>
              </div>
            </section>
          ) : null}
          {showEmptyBanner ? (
            <TodayEmptyState
              description={t("today.hubEmptyDescription")}
              ctaLabel={t("today.hubEmptyCta")}
              href={trainingRoute}
            />
          ) : null}

          <section
            className="card premium-surface-card surface-content-card today-secondary-card today-hero-card premium-fade-up"
            data-testid="today-action-card-primary"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Acción principal de hoy
                </p>
                <h2 className="m-0 mt-2 text-[1.95rem] font-semibold leading-tight text-primary">
                  {signals.trainingState === "workout"
                    ? signals.trainingName
                    : signals.trainingState === "rest"
                      ? "Día de recuperación"
                      : "Configura tu plan"}
                </h2>
                <p className="today-hero-meta m-0 mt-3 text-sm text-muted">
                  {trainingMeta}
                </p>
                {signals.trainingState === "workout" &&
                !canStartTodayWorkout ? (
                  <p className="m-0 mt-2 text-xs text-muted">
                    Aun no hay sesión disponible para hoy.
                  </p>
                ) : null}
                {signals.trainingStatus === "error" ? (
                  <p className="m-0 mt-2 text-xs text-danger">
                    No se pudo cargar tu sesión de hoy.
                  </p>
                ) : null}
              </div>
              <div className="today-hero-icon flex h-12 w-12 items-center justify-center rounded-2xl border">
                <PremiumWorkoutIcon
                  width={24}
                  height={24}
                  className="text-primary"
                />
              </div>
            </div>

            <div
              className={`today-progress-inset today-hero-progress mt-1 space-y-2 ${isDailyProgressComplete ? "today-hero-progress--complete" : ""}`}
            >
              <div className="today-hero-progress-head text-xs">
                <span className="today-hero-progress-label">Progreso diario</span>
                <span
                  className={`today-hero-progress-pill today-hero-progress-value ${isDailyProgressComplete ? "today-hero-progress-value--complete" : ""}`}
                >
                  {dailyProgressPercent}%
                </span>
              </div>
              <ProgressBar value={dailyProgressPercent} total={100} />
            </div>

            {signals.trainingState === "no-plan" ? (
              <div className="mt-4 space-y-2">
                <Button
                  className="flex h-12 w-full rounded-xl font-semibold"
                  onClick={handlePrimaryTrainingAction}
                >
                  {primaryActionLabel}
                </Button>
                <Button
                  variant="ghost"
                  className="flex h-10 w-full rounded-xl text-sm font-medium"
                  disabled={!hasAiAccess}
                  onClick={() => hasAiAccess && router.push(aiPlanRoute)}
                >
                  {t("today.trainingAiCta")}
                </Button>
                {aiLockReason ? (
                  <p className="m-0 text-xs text-muted">{aiLockReason}</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <Button
                  className="flex h-12 w-full rounded-xl font-semibold"
                  onClick={handlePrimaryTrainingAction}
                  disabled={
                    signals.trainingState === "workout" && !canStartTodayWorkout
                  }
                >
                  {primaryActionLabel}
                </Button>
                {signals.trainingState === "workout" ? (
                  <ButtonLink
                    as={Link}
                    href={trainingRoute}
                    variant="ghost"
                    className="flex h-10 w-full rounded-xl text-sm font-medium"
                  >
                    Ver detalles
                  </ButtonLink>
                ) : null}
              </div>
            )}
          </section>

          <div
            className="today-cards-grid grid md:grid-cols-2"
            data-testid="today-actions-grid"
          >
            <section
              className={`card premium-surface-card surface-content-card today-secondary-card today-nutrition-card today-nutrition-card--${nutritionCardTone} premium-fade-up`}
              data-testid="today-action-card"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="today-module-icon flex h-11 w-11 items-center justify-center rounded-xl border">
                  <PremiumNutritionIcon
                    width={20}
                    height={20}
                    className="text-primary"
                  />
                </div>
                <div>
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Nutrición
                  </p>
                  <h2 className="m-0 mt-0.5 text-[1.1rem] font-semibold text-primary">
                    Calorías
                  </h2>
                </div>
              </div>

              <div className="today-nutrition-layout mb-6">
                <div className="today-nutrition-copy min-w-0">
                  <p className="today-nutrition-meta-label m-0">Consumidas hoy</p>
                  <div className="today-nutrition-kcal mt-1.5">
                    <span className="today-nutrition-kcal-value">
                      {nutritionPrimaryKcal === "--"
                        ? "--"
                        : nutritionSummaryValue}
                    </span>
                    {nutritionSummaryTarget ? (
                      <span className="today-nutrition-kcal-goal">
                        / {nutritionSummaryTarget}
                      </span>
                    ) : null}
                    <span className="today-nutrition-kcal-unit">kcal</span>
                  </div>
                  <p className="today-nutrition-meta m-0 mt-2.5">
                    {nutritionMetaText}
                  </p>
                </div>
                <div className="today-nutrition-ring-wrap shrink-0">
                  {canRenderNutritionRing ? (
                    <NutritionRing
                      value={nutritionConsumedKcal}
                      total={nutritionGoalKcal ?? 0}
                    />
                  ) : (
                    <div className="today-nutrition-empty-ring flex h-[70px] w-[70px] items-center justify-center rounded-full border">
                      <span className="text-xs font-semibold text-muted">
                        Sin objetivo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="today-progress-inset today-nutrition-progress mb-5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted">Avance nutricional</span>
                  <span className="today-nutrition-progress-percent font-semibold text-primary">
                    {nutritionProgressPercent}%
                  </span>
                </div>
                <ProgressBar value={nutritionConsumedKcal} total={nutritionGoalKcal ?? 0} />
                <p className="today-nutrition-progress-line m-0">{nutritionProgressLabel}</p>
              </div>

              <ButtonLink
                as={Link}
                href="/app/nutricion"
                variant="secondary"
                className="today-cta-secondary flex h-11 w-full rounded-xl font-medium"
                onClick={() =>
                  trackEvent("nutrition_log_opened", {
                    target: "nutrition",
                    origin: "today",
                  })
                }
              >
                Registrar comida
              </ButtonLink>
            </section>

            <section
              className="card premium-surface-card surface-content-card today-secondary-card today-checkin-card premium-fade-up"
              data-testid="today-action-card"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="today-module-icon flex h-11 w-11 items-center justify-center rounded-xl border">
                  <PremiumCheckinIcon
                    width={20}
                    height={20}
                    className="text-primary"
                  />
                </div>
                <div>
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Check-in
                  </p>
                  <h2 className="m-0 mt-0.5 text-base font-semibold text-primary">
                    Peso actual
                  </h2>
                </div>
              </div>

              <div className="today-checkin-summary mb-5 space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-[2.75rem] font-bold leading-none text-primary">
                    {checkinMainWeight}
                  </span>
                  <span className="pb-1 text-sm font-medium text-muted">
                    kg
                  </span>
                </div>
                <div className="today-checkin-meta">
                  <p className="m-0 text-xs text-muted">{checkinContext}</p>
                  {checkinGoalContext ? (
                    <p className="m-0 mt-1 text-xs text-muted">
                      {checkinGoalContext}
                    </p>
                  ) : null}
                </div>
              </div>

              {signals.checkinStatus === "error" ? (
                <div className="today-progress-inset today-progress-inset--danger space-y-2">
                  <p className="m-0 text-xs text-danger">
                    No se pudo cargar check-in.
                  </p>
                  <Button
                    variant="ghost"
                    className="h-9 w-full rounded-xl text-sm"
                    onClick={() => void loadTodaySignals()}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : signals.checkinStatus === "empty" ? (
                <div className="today-progress-inset today-progress-inset--disabled space-y-1">
                  <p className="m-0 text-xs font-medium text-primary">
                    Sin check-ins recientes
                  </p>
                  <p className="m-0 text-xs text-muted">
                    Añade uno para ver la variación frente al ultimo registro.
                  </p>
                </div>
              ) : null}

              <ButtonLink
                as={Link}
                href={checkinRoute}
                variant="secondary"
                className="today-cta-secondary mt-4 flex h-11 w-full rounded-xl font-medium"
                data-testid="quick-action-tracking"
                onClick={() =>
                  trackEvent("checkin_opened", {
                    target: "checkin",
                    origin: "today",
                  })
                }
              >
                {signals.checkinDoneThisWeek
                  ? "Actualizar check-in"
                  : t("profile.checkinTitle")}
              </ButtonLink>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
