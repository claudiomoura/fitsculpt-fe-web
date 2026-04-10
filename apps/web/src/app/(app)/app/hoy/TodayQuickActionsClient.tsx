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
  PremiumSparklesIcon,
} from "@/components/icons/PremiumIcons";
import { Button, ButtonLink } from "@/design-system/components/Button";
import { readAuthEntitlementSnapshot } from "@/context/auth/entitlements";
import { useLanguage } from "@/context/LanguageProvider";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { trackEvent } from "@/lib/analytics";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { canAccessFeature } from "@/lib/entitlements";
import { parseWeeklyCoachWeeklyStateResponse } from "@/lib/weeklyAdaptiveCoachContracts";
import type {
  AuthMeResponse,
  NutritionPlanDetail,
  NutritionPlanListItem,
  TrainingPlanDetail,
} from "@/lib/types";
import { buildNutritionAdherenceStoreFromMealLog } from "@/lib/nutritionAdherence";
import { getNutritionMealKey } from "@/lib/nutritionMealKey";
import { pickWorkoutIdForDateCandidates } from "@/lib/trainingWorkoutSelection";
import { TodayEmptyState } from "./TodayEmptyState";
import { TodayErrorState } from "./TodayErrorState";
import { TodaySkeleton } from "./TodaySkeleton";
import { fetchAuthMe } from "@/lib/authDedup";
import { hasAiEntitlement } from "@/components/access/aiEntitlements";
import QuickLogHub, {
  type QuickLogHubHandle,
} from "@/components/quick-log/QuickLogHub";

// NEW COMPONENTS - Phase 3 Integration
import { TodayHeader } from "./components/TodayHeader";
import { TodaySummaryCard } from "./components/TodaySummaryCard";
import { TodayViewTabs } from "./components/TodayViewTabs";
import { TodayPriorityHero } from "./components/TodayPriorityHero";
import { TodayNutritionCard } from "./components/TodayNutritionCard";
import { TodayCheckinCard } from "./components/TodayCheckinCard";
import { TodayWeeklySummaryCard } from "./components/TodayWeeklySummaryCard";

const trainingRoute = "/app/entrenamiento";
const nutritionRoute = "/app/nutricion";
const nutritionEditRoute = "/app/nutricion/editar";
const nutritionAiRoute = "/app/nutricion?ai=1";
const billingRoute = "/app/settings/billing";
const manualPlanRoute = "/app/entrenamiento/editar";
const aiPlanRoute = "/app/entrenamiento?ai=1";
const checkinRoute = "/app/seguimiento/check-in";

type ViewStatus = "loading" | "success" | "error";
type TrainingState = "workout" | "rest" | "no-plan";
type ModuleStatus = "ready" | "empty" | "error";

type TodaySignals = {
  checkinDoneThisWeek: boolean;
  weeklyCoachCheckInDue: boolean;
  userName: string;
  subscriptionPlan: string;
  aiTokenBalance: number;
  hasAiEntitlement: boolean;
  gymMembershipState: "in_gym" | "not_in_gym" | "unknown";
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
  passiveData?: {
    snapshots?: Array<{
      date?: string | null;
      syncedAt?: string | null;
      bodyWeightKg?: number | null;
    }>;
  };
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

type SummaryEntry = {
  ok: boolean;
  status: number;
  data: unknown;
};

type TodaySummaryPayload = {
  tracking?: SummaryEntry;
  activeTraining?: SummaryEntry;
  nutritionList?: SummaryEntry;
  nutritionDetail?: SummaryEntry | null;
  authMe?: SummaryEntry;
  profile?: SummaryEntry;
  weeklyCoach?: SummaryEntry | null;
};

type WorkoutLookupItem = {
  id: string;
  name?: string | null;
  scheduledAt?: string | null;
  sessions?: Array<{ finishedAt?: string | null }>;
};

type ProgressTone = "low" | "medium" | "high" | "complete";

const integerFormatter = new Intl.NumberFormat("es-ES");

function parseRepsFromSets(value?: string | number | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.match(/x\s*(.+)$/i);
  const reps = match?.[1]?.trim();
  return reps ? reps : undefined;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeProfileSummaryPayload(value: unknown): ProfileSummaryPayload {
  if (!isRecord(value)) {
    return {};
  }

  const flattened: Record<string, unknown> = { ...value };
  const nestedProfile = flattened.profile;
  delete flattened.profile;

  if (isRecord(nestedProfile)) {
    return {
      ...(normalizeProfileSummaryPayload(nestedProfile) as Record<string, unknown>),
      ...flattened,
    } as ProfileSummaryPayload;
  }

  return flattened as ProfileSummaryPayload;
}

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

function estimateNutritionTargetCalories(
  profile: ProfileSummaryPayload,
): number | null {
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

export const getLatestPassiveWeight = (payload?: TrackingPayload | null) => {
  const latest =
    payload?.passiveData?.snapshots
      ?.map((entry) => {
        const date = parseDate(entry.date);
        if (!date) return null;
        const syncedAt =
          typeof entry.syncedAt === "string" ? new Date(entry.syncedAt) : null;
        const syncedAtMs =
          syncedAt && Number.isFinite(syncedAt.getTime())
            ? syncedAt.getTime()
            : date.getTime();
        return {
          weightKg: Number(entry.bodyWeightKg),
          dateMs: date.getTime(),
          syncedAtMs,
        };
      })
      .filter(
        (item): item is { weightKg: number; dateMs: number; syncedAtMs: number } =>
          item !== null,
      )
      .filter((item) => Number.isFinite(item.weightKg) && item.weightKg > 0)
      .sort((a, b) => b.dateMs - a.dateMs || b.syncedAtMs - a.syncedAtMs)?.[0] ??
    null;

  return latest ? Number(latest.weightKg) : null;
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
  const quickLogHubRef = useRef<QuickLogHubHandle>(null);
  const [signals, setSignals] = useState<TodaySignals>({
    checkinDoneThisWeek: false,
    weeklyCoachCheckInDue: false,
    userName: "",
    subscriptionPlan: "FREE",
    aiTokenBalance: 0,
    hasAiEntitlement: false,
    gymMembershipState: "unknown",
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
      const summaryResponse = await fetch("/api/hoy/summary", {
        cache: "no-store",
        credentials: "include",
      });

      if (!summaryResponse.ok) {
        setStatus("error");
        return;
      }

      const summary = (await summaryResponse.json()) as TodaySummaryPayload;
      const trackingSummary = summary.tracking;
      const activeTrainingSummary = summary.activeTraining;
      const nutritionListSummary = summary.nutritionList;
      const nutritionDetailSummary = summary.nutritionDetail;
      const authMeSummary = summary.authMe;
      const profileSummary = summary.profile;
      const weeklyCoachSummary = summary.weeklyCoach;

      const trackingResponse = {
        ok: trackingSummary?.ok ?? false,
        json: async () => trackingSummary?.data,
      };
      const activeTrainingResponse = {
        ok: activeTrainingSummary?.ok ?? false,
        json: async () => activeTrainingSummary?.data,
      };
      const nutritionListResponse = {
        ok: nutritionListSummary?.ok ?? false,
        json: async () => nutritionListSummary?.data,
      };
      const authMeResponse = authMeSummary?.ok ? authMeSummary.data : null;
      const profileResponse = {
        ok: profileSummary?.ok ?? false,
        json: async () => profileSummary?.data,
      };

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
        weeklyCoachCheckInDue: false,
        userName: "",
        subscriptionPlan: "FREE",
        aiTokenBalance: 0,
        hasAiEntitlement: false,
        gymMembershipState: "unknown",
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

      if (weeklyCoachSummary?.ok) {
        const weeklyCoachState = parseWeeklyCoachWeeklyStateResponse(weeklyCoachSummary.data);
        if (
          weeklyCoachState?.featureFlags.weeklyCoachEnabled &&
          weeklyCoachState.featureFlags.weeklyCheckInEnabled
        ) {
          nextSignals.weeklyCoachCheckInDue = weeklyCoachState.checkInDue;
        }
      }

      let trackingPayload: TrackingPayload = {
        checkins: [],
        mealLog: [],
      };
      const todayDateKey = toDateKey(new Date());
      let todayTrainingDay: TrainingPlanDetail["days"][number] | null = null;
      let profileEstimatedNutritionTarget: number | null = null;

      if (authMeResponse) {
        const authMe = authMeResponse as AuthMeResponse;
        const entitlementSnapshot = readAuthEntitlementSnapshot(authMe);
        nextSignals.userName = authMe.name?.trim() ?? "";
        nextSignals.subscriptionPlan = entitlementSnapshot.subscriptionPlan;
        nextSignals.aiTokenBalance = entitlementSnapshot.tokenBalance;
        nextSignals.hasTrainingAccess = entitlementSnapshot.modules.strength;
      }

      if (profileResponse.ok) {
        const profile = normalizeProfileSummaryPayload(await profileResponse.json());
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
          profileEstimatedNutritionTarget =
            estimateNutritionTargetCalories(profile);
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
        if (!isPositiveNumber(nextSignals.currentWeightKg)) {
          nextSignals.currentWeightKg = getLatestPassiveWeight(trackingPayload);
        }
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
            todayTrainingDay = trainingDay;
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
          const nutritionDetailResponse = nutritionDetailSummary
            ? {
                ok: nutritionDetailSummary.ok,
                json: async () => nutritionDetailSummary.data,
              }
            : await fetch(`/api/nutrition-plans/${nutritionPlanId}`, {
                cache: "no-store",
                credentials: "include",
              });
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

              // Count meals that are actually marked as consumed in adherence store
              const adherenceConsumedCount = nutritionDay.meals.reduce(
                (count, meal, index) =>
                  count +
                  (consumedMealKeys.has(
                    getNutritionMealKey(meal, nutritionDayKey, index),
                  )
                    ? 1
                    : 0),
                0,
              );

              // Only count calories from meals that are actually marked as consumed
              // If no meals are marked as consumed in adherence store, show 0 even if mealLog has entries
              if (adherenceConsumedCount === 0) {
                // No meals marked as consumed - show 0
                nextSignals.nutritionMealsLogged = 0;
                nextSignals.nutritionConsumedCalories = 0;
                nextSignals.nutritionProteinG = 0;
                nextSignals.nutritionCarbsG = 0;
                nextSignals.nutritionFatsG = 0;
              } else {
                // Count only consumed meals from the adherence store
                nextSignals.nutritionMealsLogged = adherenceConsumedCount;
                nextSignals.nutritionConsumedCalories = Math.round(
                  nutritionDay.meals.reduce(
                    (sum, meal, index) =>
                      sum +
                      (consumedMealKeys.has(
                        getNutritionMealKey(meal, nutritionDayKey, index),
                      )
                        ? Number.isFinite(meal.macros?.calories)
                          ? (meal.macros?.calories ?? 0)
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
                        ? Number.isFinite(meal.macros?.protein)
                          ? (meal.macros?.protein ?? 0)
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
                        ? Number.isFinite(meal.macros?.carbs)
                          ? (meal.macros?.carbs ?? 0)
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
                        ? Number.isFinite(meal.macros?.fats)
                          ? (meal.macros?.fats ?? 0)
                          : 0
                        : 0),
                    0,
                  ),
                );
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

      if (
        todayTrainingDay &&
        nextSignals.trainingState === "workout" &&
        nextSignals.hasTrainingAccess
      ) {
        const workoutsResponse = await fetch("/api/workouts?take=30", {
          cache: "no-store",
          credentials: "include",
        });
        const targetDayKey = nextSignals.trainingDayKey ?? todayDateKey;
        if (workoutsResponse.ok) {
          const workoutsPayload =
            (await workoutsResponse.json()) as WorkoutLookupItem[];
          const dayCandidates = Array.isArray(workoutsPayload)
            ? workoutsPayload.filter(
                (workout) =>
                  normalizeWorkoutDateKey(workout.scheduledAt) === targetDayKey,
              )
            : [];

          const matchedWorkoutId = pickWorkoutIdForDateCandidates(
            dayCandidates,
            todayTrainingDay.focus,
          );

          if (matchedWorkoutId) {
            nextSignals.todayWorkoutId = matchedWorkoutId;
          } else {
            const scheduledDate = parseDate(targetDayKey) ?? new Date();
            const createResponse = await fetch("/api/workouts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name:
                  todayTrainingDay.focus ||
                  todayTrainingDay.label ||
                  nextSignals.trainingName,
                notes: `Dia: ${todayTrainingDay.label}`,
                scheduledAt: new Date(
                  `${toDateKey(scheduledDate)}T12:00:00`,
                ).toISOString(),
                durationMin: Number.isFinite(todayTrainingDay.duration)
                  ? Number(todayTrainingDay.duration)
                  : 45,
                exercises: (todayTrainingDay.exercises ?? []).map(
                  (exercise, index) => ({
                    exerciseId: exercise.id,
                    name: exercise.name,
                    sets:
                      typeof exercise.sets === "number" ||
                      typeof exercise.sets === "string"
                        ? String(exercise.sets)
                        : undefined,
                    reps: exercise.reps ?? parseRepsFromSets(exercise.sets),
                    notes: exercise.notes ?? undefined,
                    order: index,
                  }),
                ),
              }),
            });

            if (createResponse.ok) {
              const createdWorkout = (await createResponse.json()) as {
                id?: string;
              } | null;
              nextSignals.todayWorkoutId = createdWorkout?.id ?? null;
            } else {
              nextSignals.todayWorkoutId = null;
            }
          }
        } else {
          nextSignals.todayWorkoutId = null;
        }
      } else {
        nextSignals.todayWorkoutId = null;
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
    !signals.checkinDoneThisWeek &&
    !signals.weeklyCoachCheckInDue;
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
  const trainingTodayHref = signals.trainingDayKey
    ? `${trainingRoute}?day=${encodeURIComponent(signals.trainingDayKey)}`
    : trainingRoute;
  const trainingWeekHref = trainingTodayHref;
  const primaryActionLabel =
    signals.trainingState === "rest"
      ? "Ver semana"
      : signals.trainingState === "workout"
        ? "Empezar ahora"
        : t("today.trainingManualCta");
  const primaryActionTarget =
    signals.trainingState === "no-plan"
      ? manualPlanRoute
      : signals.trainingState === "workout"
        ? todayTrainingHref
        : trainingRoute;

  const handlePrimaryTrainingAction = () => {
    if (!signals.hasTrainingAccess) {
      trackEvent("today_cta_click", {
        target: "billing",
        origin: "today_training",
        returnTo: currentRoute,
      });
      router.push(billingHref);
      return;
    }
    trackEvent("today_cta_click", {
      target: "training",
      origin: "today_training",
    });
    if (signals.trainingState === "workout") {
      trackEvent("training_start_clicked", {
        target: "training",
        origin: "today",
      });
      trackEvent("workout_started", { target: "training", origin: "today" });
    }
    router.push(primaryActionTarget);
  };

  // Prepare weekly summary data
  const weeklyData = useMemo((): Array<{
    day: string;
    completed: boolean;
    type: "training" | "nutrition" | "checkin" | null;
  }> => {
    // This would ideally come from tracking history
    // For now, we'll create a simple structure based on current signals
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    return weekDays.map((day, idx) => {
      // Simple logic: past days might have data, future days don't
      const isPast = idx < dayOfWeek;
      const isToday = idx === dayOfWeek;

      if (!isPast && !isToday) {
        return { day, completed: false, type: null };
      }

      // For today, use current signals
      if (isToday) {
        let type: "training" | "nutrition" | "checkin" | null = null;
        if (signals.trainingState === "workout") {
          type = "training";
        } else if (signals.nutritionReady) {
          type = "nutrition";
        } else if (signals.checkinDoneThisWeek) {
          type = "checkin";
        }

        return {
          day,
          completed:
            signals.trainingState === "workout" ||
            signals.nutritionReady ||
            signals.checkinDoneThisWeek,
          type,
        };
      }

      // Past days - placeholder (would need historical data)
      return { day, completed: false, type: null };
    });
  }, [signals]);

  // Prepare mini metrics for TodaySummaryCard
  const trainingCompleted = signals.trainingState === "workout" ? 1 : 0;
  const nutritionCompleted = signals.nutritionMealsLogged > 0 ? 1 : 0;
  const checkinCompleted = signals.checkinDoneThisWeek ? 1 : 0;
  const todayDayKey = toDateKey(new Date());
  const nutritionTodayHref = `${nutritionRoute}?day=${encodeURIComponent(todayDayKey)}`;
  const nutritionPlanHref = nutritionRoute;
  const handleTrainingTodayClick = () => {
    trackEvent("today_cta_click", {
      target: "training",
      origin: "today_training_day",
    });
  };
  const handleTrainingWeekClick = () => {
    trackEvent("today_cta_click", {
      target: "training",
      origin: "today_training_week",
    });
  };
  const handleNutritionTodayClick = () => {
    trackEvent("today_cta_click", {
      target: "nutrition",
      origin: "today_nutrition_today",
    });
  };
  const handleNutritionRegisterClick = () => {
    trackEvent("today_cta_click", {
      target: "nutrition",
      origin: "today_nutrition_register",
    });
    quickLogHubRef.current?.open("meal");
  };
  const handleNutritionPlanClick = () => {
    trackEvent("today_cta_click", {
      target: "nutrition",
      origin: "today_nutrition_plan",
    });
  };

  return (
    <div className="today-page-stack flex flex-col gap-6 pb-0">
      {/* Block 1: Header with greeting */}
      <TodayHeader userName={userName} />

      {/* QuickLogHub - kept in header area for easy access */}
      <div className="flex justify-end">
        <QuickLogHub
          ref={quickLogHubRef}
          origin="today"
          latestCheckin={null}
          currentWeightKg={signals.currentWeightKg}
          onSaved={async () => {
            await loadTodaySignals();
          }}
        />
      </div>

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
          {/* Check-in success message */}
          {showCheckinSuccess ? (
            <section
              className="status-card status-card--success premium-fade-up"
              role="status"
              aria-live="polite"
            >
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

          {/* Empty banner when no data */}
          {showEmptyBanner ? (
            <TodayEmptyState
              description={t("today.hubEmptyDescription")}
              ctaLabel={t("today.hubEmptyCta")}
              href={trainingRoute}
            />
          ) : null}

          {/* Main Dashboard - 8-block premium layout */}
          <div className="today-premium-stack flex flex-col gap-6">
            {/* Block 1: Summary Card - Daily progress overview (DONUT) - FIRST */}
            <TodaySummaryCard
              dailyProgressPercent={dailyProgressPercent}
              completedGoals={completedGoals}
              totalGoals={3}
              trainingCompleted={trainingCompleted}
              trainingTotal={1}
              nutritionCompleted={nutritionCompleted}
              nutritionTotal={1}
              checkinCompleted={checkinCompleted}
              checkinTotal={1}
            />

            {/* Block 2: Priority Hero - Today's workout/training - SECOND */}
            <TodayPriorityHero
              trainingState={signals.trainingState}
              trainingName={signals.trainingName}
              trainingDuration={signals.trainingDuration}
              trainingExerciseCount={signals.trainingExerciseCount}
              todayWorkoutId={signals.todayWorkoutId}
              hasTrainingAccess={signals.hasTrainingAccess}
              primaryActionLabel={primaryActionLabel}
              onPrimaryAction={handlePrimaryTrainingAction}
              secondaryActionLabel={
                signals.trainingState === "workout"
                  ? "Entreno de hoy"
                  : undefined
              }
              secondaryActionHref={
                signals.trainingState === "workout"
                  ? trainingTodayHref
                  : undefined
              }
              onSecondaryAction={
                signals.trainingState === "workout"
                  ? handleTrainingTodayClick
                  : undefined
              }
              tertiaryActionLabel={
                signals.trainingState === "workout" ? "Ver semana" : undefined
              }
              tertiaryActionHref={
                signals.trainingState === "workout"
                  ? trainingWeekHref
                  : undefined
              }
              onTertiaryAction={
                signals.trainingState === "workout"
                  ? handleTrainingWeekClick
                  : undefined
              }
            />

            {/* Block 5: Nutrition Card */}
            <TodayNutritionCard
              consumedCalories={signals.nutritionConsumedCalories}
              targetCalories={signals.nutritionTargetCalories}
              proteinG={signals.nutritionProteinG}
              carbsG={signals.nutritionCarbsG}
              fatsG={signals.nutritionFatsG}
              mealsLogged={signals.nutritionMealsLogged}
              mealsTotal={signals.nutritionMealsTotal}
              hasPlan={
                signals.nutritionStatus === "ready" ||
                signals.nutritionMealsTotal > 0
              }
              primaryCtaLabel="Ver comidas de hoy"
              primaryCtaHref={nutritionTodayHref}
              onPrimaryCtaClick={handleNutritionTodayClick}
              secondaryCtaLabel="Registrar comida"
              onSecondaryCtaClick={handleNutritionRegisterClick}
              tertiaryCtaLabel="Ver plan"
              tertiaryCtaHref={nutritionPlanHref}
              onTertiaryCtaClick={handleNutritionPlanClick}
              nutritionHref={nutritionTodayHref}
              detailsHref={nutritionRoute}
              editHref={nutritionEditRoute}
              aiCreateHref={nutritionAiRoute}
            />

            {/* Block 5.5: Coach Card - After nutrition, before weight */}
            <section
              className="card"
              style={{
                background: hasAiAccess
                  ? "linear-gradient(135deg, var(--color-primary-alpha) 0%, var(--surface-card) 100%)"
                  : "var(--surface-card)",
                border: "1px solid var(--surface-border-default)",
                padding: "clamp(16px, 3vw, 24px)",
                borderRadius: 16,
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onClick={() => router.push("/app/coach")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/app/coach"); }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    background: hasAiAccess ? "var(--color-primary)" : "var(--surface-inset-bg)",
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <PremiumSparklesIcon
                    width={24}
                    height={24}
                    style={{ color: hasAiAccess ? "white" : "var(--color-primary)" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {t("coach.surfaceTitle") || "Tu Coach IA"}
                  </h3>
                  <p className="muted m-0" style={{ fontSize: "0.875rem", lineHeight: 1.4 }}>
                    {hasAiAccess
                      ? (t("coach.surfaceSubtitle") || "Asesoría personalizada para tus objetivos")
                      : "✨ Desbloquea Coach IA, recomendaciones y más"
                    }
                  </p>
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "1.25rem" }}>›</div>
              </div>
            </section>

            {/* Block 6: Check-in Card - Weight tracking */}
            <TodayCheckinCard
              currentWeightKg={signals.currentWeightKg}
              previousWeightKg={signals.previousWeightKg}
              goalWeightKg={signals.goalWeightKg}
              checkinDoneThisWeek={signals.checkinDoneThisWeek}
              weeklyCoachCheckInDue={signals.weeklyCoachCheckInDue}
              checkinTrend={signals.checkinTrend}
            />

            {/* Block 7: Weekly Summary - Week at a glance */}
            <TodayWeeklySummaryCard weekData={weeklyData} />
          </div>
        </>
      ) : null}
    </div>
  );
}
