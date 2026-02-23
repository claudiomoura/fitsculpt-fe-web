"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { addDays, parseDate, toDateKey } from "@/lib/calendar";
import type { ProfileData } from "@/lib/profile";
import { isProfileComplete } from "@/lib/profileCompletion";
import { buildWeightProgressSummary, hasSufficientWeightProgress, normalizeWeightLogs } from "@/lib/weightProgress";
import { NUTRITION_ADHERENCE_STORAGE_KEY } from "@/lib/nutritionAdherence";
import { defaultFoodProfiles } from "@/lib/foodProfiles";
import type { CheckinEntry, FoodEntry, TrackingSnapshot, WorkoutEntry } from "@/services/tracking";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

type UserFood = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type TrackingPayload = Partial<TrackingSnapshot>;

type WorkoutSessionEntry = {
  sets?: number | null;
  reps?: number | null;
};

type WorkoutSession = {
  finishedAt?: string | null;
  startedAt?: string;
  entries?: WorkoutSessionEntry[] | null;
};

type WorkoutItem = {
  id: string;
  sessions?: WorkoutSession[] | null;
};

const WEEK_DAYS = 7;

type WeeklyKpi = {
  key: string;
  title: string;
  valueLabel: string;
  helperLabel: string;
  deltaLabel?: string;
  bars?: number[];
  ctaHref: string;
  ctaLabel: string;
};

const isDateKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeTrackingPayload = (payload: TrackingPayload) => {
  const checkins = Array.isArray(payload.checkins)
    ? payload.checkins.filter((entry) => entry && isDateKey(entry.date) && Number.isFinite(Number(entry.weightKg)))
    : [];

  const foodLog = Array.isArray(payload.foodLog)
    ? payload.foodLog.filter((entry) => entry && isDateKey(entry.date) && typeof entry.foodKey === "string")
    : [];

  const workoutLog = Array.isArray(payload.workoutLog)
    ? payload.workoutLog.filter((entry) => entry && isDateKey(entry.date))
    : [];

  return { checkins, foodLog, workoutLog };
};

function ProgressRing({
  value,
  target,
  statusClass,
  ariaLabel,
}: {
  value: number;
  target: number | null;
  statusClass: string;
  ariaLabel: string;
}) {
  const size = 88;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target ? Math.min(value / target, 1) : 0;
  const dash = circumference * progress;
  return (
    <svg className={`progress-ring ${statusClass}`} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
      <circle
        className="progress-ring-track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        className="progress-ring-value"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DashboardClient() {
  const { t, locale } = useLanguage();
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([]);
  const [workoutLog, setWorkoutLog] = useState<WorkoutEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([]);
  const [userFoods, setUserFoods] = useState<UserFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadTracking = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("LOAD_ERROR");
        const data = normalizeTrackingPayload((await response.json()) as TrackingPayload);
        if (active) {
          setCheckins(data.checkins);
          setFoodLog(data.foodLog);
          setWorkoutLog(data.workoutLog);
        }
      } catch (_err) {
        if (active) setError(t("dashboard.chartError"));
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTracking();
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    let active = true;
    const loadUserFoods = async () => {
      try {
        const response = await fetch("/api/user-foods", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const data = (await response.json()) as UserFood[];
        if (active) setUserFoods(data);
      } catch (_err) {
        if (active) setUserFoods([]);
      }
    };
    void loadUserFoods();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadWorkouts = async () => {
      try {
        const response = await fetch("/api/workouts", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const data = (await response.json()) as WorkoutItem[];
        if (active) setWorkouts(Array.isArray(data) ? data : []);
      } catch (_err) {
        if (active) setWorkouts([]);
      }
    };
    void loadWorkouts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as ProfileData;
        if (!active) return;
        setProfile(data);
      } catch (_err) {
        if (active) setProfile(null);
      } finally {
        if (active) setProfileLoading(false);
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const profileReady = profile ? isProfileComplete(profile) : false;
  const nutritionTargets = profile?.nutritionPlan
    ? {
        calories: profile.nutritionPlan.dailyCalories,
        protein: profile.nutritionPlan.proteinG,
        carbs: profile.nutritionPlan.carbsG,
        fat: profile.nutritionPlan.fatG,
      }
    : null;

  const userFoodMap = useMemo(() => new Map(userFoods.map((food) => [food.id, food])), [userFoods]);

  const todayKey = toDateKey(new Date());
  const todayEntries = useMemo(() => foodLog.filter((entry) => entry.date === todayKey), [foodLog, todayKey]);
  const todayTotals = useMemo(() => {
    const resolveFoodProfile = (key: string) => {
      if (key.startsWith("user:")) {
        const id = key.replace("user:", "");
        const food = userFoodMap.get(id);
        if (!food) return null;
        return {
          label: food.name,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          calories: food.calories,
        };
      }
      const profile = defaultFoodProfiles[key];
      if (!profile) return null;
      const calories = profile.protein * 4 + profile.carbs * 4 + profile.fat * 9;
      return { label: t(profile.labelKey), ...profile, calories };
    };
    return todayEntries.reduce(
      (totals, entry) => {
        const profile = resolveFoodProfile(entry.foodKey);
        if (!profile) return totals;
        const factor = entry.grams / 100;
        totals.protein += profile.protein * factor;
        totals.carbs += profile.carbs * factor;
        totals.fat += profile.fat * factor;
        totals.calories += profile.calories * factor;
        return totals;
      },
      { protein: 0, carbs: 0, fat: 0, calories: 0 }
    );
  }, [todayEntries, userFoodMap, t]);

  const getStatusClass = (value: number, target?: number | null) => {
    if (!target) return "status-under";
    const delta = value - target;
    if (Math.abs(delta) <= 0.5) return "status-exact";
    return delta < 0 ? "status-under" : "status-over";
  };

  const getStatusLabel = (value: number, target?: number | null) => {
    if (!target) return t("tracking.targetsMissing");
    const delta = value - target;
    if (Math.abs(delta) <= 0.5) return t("tracking.statusExact");
    return delta < 0 ? t("tracking.statusUnder") : t("tracking.statusOver");
  };

  const calorieDelta = nutritionTargets ? nutritionTargets.calories - todayTotals.calories : null;
  const calorieStatus = nutritionTargets ? getStatusClass(todayTotals.calories, nutritionTargets.calories) : "";

  const weightLogs = useMemo(() => normalizeWeightLogs(checkins), [checkins]);
  const weightProgress = useMemo(() => buildWeightProgressSummary(weightLogs), [weightLogs]);
  const currentWeight = weightProgress.current;
  const hasWeightEntries = Boolean(currentWeight?.entries.length);
  const hasWeightProgress = hasSufficientWeightProgress(weightProgress);
  const weightDelta = weightProgress.deltaKg;
  const weightDeltaLabel =
    hasWeightProgress && weightDelta !== null
      ? weightDelta > 0
        ? t("dashboard.weightProgressTrendUp")
        : weightDelta < 0
          ? t("dashboard.weightProgressTrendDown")
          : t("dashboard.weightProgressTrendStable")
      : null;
  const weightDeltaStatus =
    weightDelta === null || !hasWeightProgress
      ? ""
      : weightDelta > 0
        ? "status-over"
        : weightDelta < 0
          ? "status-under"
          : "status-exact";
  const weightDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale === "pt" ? "pt-PT" : "en-US", {
        day: "2-digit",
        month: "short",
      }),
    [locale]
  );

  const currentWeekDays = useMemo(() => {
    const start = addDays(new Date(), -(WEEK_DAYS - 1));
    return Array.from({ length: WEEK_DAYS }, (_, index) => toDateKey(addDays(start, index)));
  }, []);
  const previousWeekDays = useMemo(() => {
    const start = addDays(new Date(), -(WEEK_DAYS * 2 - 1));
    return Array.from({ length: WEEK_DAYS }, (_, index) => toDateKey(addDays(start, index)));
  }, []);

  const currentWeekSet = useMemo(() => new Set(currentWeekDays), [currentWeekDays]);
  const previousWeekSet = useMemo(() => new Set(previousWeekDays), [previousWeekDays]);

  const workoutSessionDates = useMemo(
    () =>
      workouts.flatMap((workout) =>
        (workout.sessions ?? []).map((session) => {
          const source = session.finishedAt ?? session.startedAt;
          const parsed = parseDate(source ?? null);
          return parsed ? toDateKey(parsed) : null;
        })
      ),
    [workouts]
  );
  const trackedWorkoutDates = useMemo(() => workoutLog.map((entry) => entry.date), [workoutLog]);

  const weeklyKpis = useMemo<WeeklyKpi[]>(() => {
    const dayIndexMap = new Map(currentWeekDays.map((day, index) => [day, index]));
    const prevDayIndexMap = new Map(previousWeekDays.map((day, index) => [day, index]));

    const sessionsByDay = Array.from({ length: WEEK_DAYS }, () => 0);
    let currentSessions = 0;
    let previousSessions = 0;
    [...workoutSessionDates, ...trackedWorkoutDates].forEach((dateKey) => {
      if (!dateKey) return;
      const currentDayIndex = dayIndexMap.get(dateKey);
      if (typeof currentDayIndex === "number") {
        currentSessions += 1;
        sessionsByDay[currentDayIndex] += 1;
        return;
      }
      if (prevDayIndexMap.has(dateKey)) previousSessions += 1;
    });

    const volumeByDay = Array.from({ length: WEEK_DAYS }, () => 0);
    let currentVolume = 0;
    let previousVolume = 0;
    workouts.forEach((workout) => {
      (workout.sessions ?? []).forEach((session) => {
        const source = session.finishedAt ?? session.startedAt;
        const parsed = parseDate(source ?? null);
        if (!parsed) return;
        const dateKey = toDateKey(parsed);
        const volume = (session.entries ?? []).reduce((sum, entry) => {
          const sets = Number(entry.sets ?? 0);
          const reps = Number(entry.reps ?? 0);
          if (!Number.isFinite(sets) || !Number.isFinite(reps)) return sum;
          return sum + Math.max(0, sets) * Math.max(0, reps);
        }, 0);
        const currentDayIndex = dayIndexMap.get(dateKey);
        if (typeof currentDayIndex === "number") {
          currentVolume += volume;
          volumeByDay[currentDayIndex] += volume;
          return;
        }
        if (prevDayIndexMap.has(dateKey)) previousVolume += volume;
      });
    });

    let adherenceStore: Record<string, string[]> = {};
    if (typeof window !== "undefined") {
      try {
        adherenceStore = JSON.parse(window.localStorage.getItem(NUTRITION_ADHERENCE_STORAGE_KEY) ?? "{}") as Record<string, string[]>;
      } catch (_err) {
        adherenceStore = {};
      }
    }
    const adherenceByDay = currentWeekDays.map((day) => (Array.isArray(adherenceStore[day]) ? adherenceStore[day].length : 0));
    const adherenceDaysCurrent = adherenceByDay.filter((count) => count > 0).length;
    const adherenceDaysPrevious = previousWeekDays.filter(
      (day) => Array.isArray(adherenceStore[day]) && adherenceStore[day].length > 0
    ).length;

    const caloriesByDay = Array.from({ length: WEEK_DAYS }, () => 0);
    const calorieDays = new Set<string>();
    foodLog.forEach((entry) => {
      const currentDayIndex = dayIndexMap.get(entry.date);
      if (typeof currentDayIndex !== "number") return;
      const profile = entry.foodKey.startsWith("user:")
        ? userFoodMap.get(entry.foodKey.replace("user:", ""))
        : defaultFoodProfiles[entry.foodKey];
      if (!profile) return;
      const baseCalories = profile.calories ?? profile.protein * 4 + profile.carbs * 4 + profile.fat * 9;
      const calories = baseCalories * (entry.grams / 100);
      caloriesByDay[currentDayIndex] += calories;
      calorieDays.add(entry.date);
    });
    const averageCalories = calorieDays.size > 0 ? caloriesByDay.reduce((sum, value) => sum + value, 0) / calorieDays.size : 0;

    const weightByDay = Array.from({ length: WEEK_DAYS }, () => 0);
    let currentWeightEntries = 0;
    checkins.forEach((entry) => {
      const dayIndex = dayIndexMap.get(entry.date);
      if (typeof dayIndex !== "number") return;
      const weight = Number(entry.weightKg);
      if (!Number.isFinite(weight)) return;
      weightByDay[dayIndex] = weight;
      currentWeightEntries += 1;
    });

    const activityDaysCurrent = new Set<string>();
    const activityDaysPrevious = new Set<string>();
    const ingest = (dateKey: string | null) => {
      if (!dateKey) return;
      if (currentWeekSet.has(dateKey)) activityDaysCurrent.add(dateKey);
      if (previousWeekSet.has(dateKey)) activityDaysPrevious.add(dateKey);
    };
    [...workoutSessionDates, ...trackedWorkoutDates].forEach((dateKey) => ingest(dateKey));
    foodLog.forEach((entry) => ingest(entry.date));
    checkins.forEach((entry) => ingest(entry.date));
    currentWeekDays.forEach((day) => {
      if (adherenceByDay[dayIndexMap.get(day) ?? -1] > 0) ingest(day);
    });
    previousWeekDays.forEach((day) => {
      if (Array.isArray(adherenceStore[day]) && adherenceStore[day].length > 0) ingest(day);
    });

    let currentStreak = 0;
    for (let i = currentWeekDays.length - 1; i >= 0; i -= 1) {
      if (!activityDaysCurrent.has(currentWeekDays[i])) break;
      currentStreak += 1;
    }

    const formatDelta = (current: number, previous: number, suffix = "") => {
      if (previous === 0) return undefined;
      const diff = current - previous;
      const sign = diff > 0 ? "+" : "";
      return `${sign}${diff}${suffix} vs ${t("dashboard.kpiPreviousWeek")}`;
    };

    const hasWeeklyData =
      currentSessions > 0 ||
      currentVolume > 0 ||
      adherenceDaysCurrent > 0 ||
      activityDaysCurrent.size > 0 ||
      calorieDays.size > 0 ||
      currentWeightEntries > 0;

    if (!hasWeeklyData) {
      return [];
    }

    const kpis: WeeklyKpi[] = [
      {
        key: "sessions",
        title: t("dashboard.kpiSessionsTitle"),
        valueLabel: String(currentSessions),
        helperLabel: t("dashboard.kpiSessionsHelper"),
        deltaLabel: formatDelta(currentSessions, previousSessions),
        bars: sessionsByDay,
        ctaHref: "/app/entrenamiento",
        ctaLabel: t("dashboard.kpiGoCalendar"),
      },
      {
        key: "volume",
        title: t("dashboard.kpiVolumeTitle"),
        valueLabel: `${Math.round(currentVolume)}`,
        helperLabel: t("dashboard.kpiVolumeHelper"),
        deltaLabel: formatDelta(Math.round(currentVolume), Math.round(previousVolume)),
        bars: volumeByDay,
        ctaHref: "/app/entrenamiento",
        ctaLabel: t("dashboard.kpiGoToday"),
      },
      {
        key: "adherence",
        title: t("dashboard.kpiAdherenceTitle"),
        valueLabel: `${Math.round((adherenceDaysCurrent / WEEK_DAYS) * 100)}%`,
        helperLabel: `${adherenceDaysCurrent}/${WEEK_DAYS} ${t("dashboard.kpiDays")}`,
        deltaLabel: formatDelta(adherenceDaysCurrent, adherenceDaysPrevious, ` ${t("dashboard.kpiDaysShort")}`),
        bars: adherenceByDay,
        ctaHref: "/app/nutricion",
        ctaLabel: t("dashboard.kpiGoToday"),
      },
      {
        key: "streak",
        title: t("dashboard.kpiStreakTitle"),
        valueLabel: `${currentStreak} ${t("dashboard.kpiDaysShort")}`,
        helperLabel: t("dashboard.kpiStreakHelper"),
        deltaLabel: formatDelta(activityDaysCurrent.size, activityDaysPrevious.size, ` ${t("dashboard.kpiDaysShort")}`),
        bars: currentWeekDays.map((day) => (activityDaysCurrent.has(day) ? 1 : 0)),
        ctaHref: "/app/hoy",
        ctaLabel: t("dashboard.kpiGoToday"),
      },
    ];

    if (nutritionTargets?.calories && calorieDays.size > 0) {
      kpis.splice(3, 0, {
        key: "calories",
        title: t("dashboard.kpiCaloriesTitle"),
        valueLabel: `${Math.round(averageCalories)} ${t("units.kcal")}`,
        helperLabel: `${t("dashboard.kpiCaloriesGoal")} ${nutritionTargets.calories} ${t("units.kcal")}`,
        deltaLabel: `${Math.round(averageCalories - nutritionTargets.calories)} ${t("units.kcal")}`,
        bars: caloriesByDay,
        ctaHref: "/app/hoy",
        ctaLabel: t("dashboard.kpiGoToday"),
      });
    }

    if (currentWeightEntries > 0) {
      const lastWeight = [...checkins]
        .filter((entry) => currentWeekSet.has(entry.date))
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1);
      if (lastWeight) {
        kpis.splice(Math.min(4, kpis.length), 0, {
          key: "weight",
          title: t("dashboard.kpiWeightTitle"),
          valueLabel: `${lastWeight.weightKg.toFixed(1)} ${t("units.kilograms")}`,
          helperLabel: t("dashboard.kpiWeightHelper"),
          bars: weightByDay,
          ctaHref: "/app/seguimiento",
          ctaLabel: t("dashboard.progressCta"),
        });
      }
    }

    return kpis;
  }, [
    checkins,
    currentWeekDays,
    currentWeekSet,
    foodLog,
    nutritionTargets?.calories,
    previousWeekDays,
    previousWeekSet,
    t,
    trackedWorkoutDates,
    userFoodMap,
    workouts,
    workoutSessionDates,
  ]);

  const handleRetry = () => window.location.reload();

  const weightProgressContent = (() => {
    if (loading) {
      return (
        <div className="dashboard-loading mt-12">
          <Skeleton variant="line" className="w-32" />
          <div className="dashboard-charts">
            <SkeletonCard />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="dashboard-error">
          <div className="status-card status-card--warning">
            <div className="inline-actions-sm">
              <Icon name="warning" />
              <strong>{t("dashboard.weightProgressErrorTitle")}</strong>
            </div>
            <p className="muted">{error}</p>
          </div>
          <div className="inline-actions">
            <Button variant="secondary" onClick={handleRetry}>
              {t("ui.retry")}
            </Button>
            <ButtonLink variant="ghost" href="/app/seguimiento">
              {t("dashboard.weightProgressBackCta")}
            </ButtonLink>
          </div>
        </div>
      );
    }

    if (!hasWeightEntries) {
      return (
        <div className="empty-state dashboard-empty">
          <div className="empty-state-icon">
            <Icon name="info" />
          </div>
          <div>
            <p className="muted m-0">{t("dashboard.weightProgressEmptyTitle")}</p>
            <p className="muted m-0">{t("dashboard.weightProgressEmptySubtitle")}</p>
          </div>
          <ButtonLink href="/app/seguimiento#weight-entry" className="fit-content">
            {t("dashboard.weightProgressEmptyCta")}
          </ButtonLink>
        </div>
      );
    }

    if (!hasWeightProgress || !currentWeight) {
      return (
        <div className="empty-state dashboard-empty">
          <div className="empty-state-icon">
            <Icon name="info" />
          </div>
          <div>
            <p className="muted m-0">{t("dashboard.weightProgressInsufficientTitle")}</p>
            <p className="muted m-0">{t("dashboard.weightProgressInsufficientSubtitle")}</p>
          </div>
          <ButtonLink href="/app/seguimiento#weight-entry" className="fit-content">
            {t("dashboard.weightProgressEmptyCta")}
          </ButtonLink>
        </div>
      );
    }

    return (
      <div className="list-grid">
        <div className="feature-card stack-md">
          <div>
            <span className="muted">{t("dashboard.weightProgressLast7Days")}</span>
            <div className="mt-6">
              <strong>
                {currentWeight.latest.weightKg.toFixed(1)} {t("units.kilograms")}
              </strong>
              <p className="muted mt-6">
                {t("dashboard.weightProgressLatestLabel")} {weightDateFormatter.format(currentWeight.latest.date)}
              </p>
            </div>
          </div>
          <div className="stack-sm">
            {weightDeltaLabel ? (
              <>
                <span className={`status-pill ${weightDeltaStatus}`}>
                  {weightDeltaLabel} {Math.abs(weightDelta ?? 0).toFixed(1)} {t("units.kilograms")}
                </span>
                <span className="muted">{t("dashboard.weightProgressDeltaLabel")}</span>
              </>
            ) : (
              <span className="muted">{t("dashboard.weightProgressDeltaUnavailable")}</span>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div className="page page-with-tabbar-safe-area">
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("dashboard.todayTitle")}</h2>
            <p className="section-subtitle">{t("dashboard.todaySubtitle")}</p>
          </div>
        </div>
        {profileLoading ? (
          <div className="list-grid dashboard-summary-grid" aria-busy="true" aria-live="polite">
            <div className="feature-card today-calories-card dashboard-summary-card">
              <div className="stack-sm">
                <Skeleton variant="line" className="w-45" />
                <Skeleton variant="line" className="w-70" />
              </div>
              <div className="today-calories-body">
                <Skeleton className="dashboard-summary-skeleton-ring" />
                <div className="dashboard-summary-skeleton-meta">
                  <Skeleton variant="line" className="w-40" />
                  <Skeleton variant="line" className="w-55" />
                  <Skeleton variant="line" className="w-60" />
                </div>
              </div>
            </div>
            {Array.from({ length: 1 }).map((_, index) => (
              <div key={`dashboard-summary-skeleton-${index}`} className="feature-card dashboard-summary-card">
                <Skeleton variant="line" className="w-40" />
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-45" />
              </div>
            ))}
          </div>
        ) : !profileReady ? (
          <div className="empty-state mt-16">
            <div className="empty-state-icon">
              <Icon name="sparkles" />
            </div>
            <div>
              <h3 className="m-0">{t("dashboard.profileIncompleteTitle")}</h3>
              <p className="muted">{t("dashboard.profileIncompleteSubtitle")}</p>
            </div>
            <ButtonLink href="/app/onboarding?next=/app">
              {t("profile.openOnboarding")}
            </ButtonLink>
          </div>
        ) : (
          <div className="list-grid dashboard-summary-grid">
            <div className="feature-card today-calories-card dashboard-summary-card">
              <div>
                <strong>{t("dashboard.todayCaloriesTitle")}</strong>
                <p className="muted mt-6">
                  {t("dashboard.todayCaloriesSubtitle")}
                </p>
              </div>
              <div className="today-calories-body">
                {loading ? (
                  <div className="dashboard-summary-loading" aria-busy="true" aria-live="polite">
                    <Skeleton className="dashboard-summary-skeleton-ring" />
                    <div className="dashboard-summary-skeleton-meta">
                      <Skeleton variant="line" className="w-40" />
                      <Skeleton variant="line" className="w-55" />
                      <Skeleton variant="line" className="w-60" />
                    </div>
                  </div>
                ) : error ? (
                  <div className="status-card status-card--warning">
                    <div className="inline-actions-sm">
                      <Icon name="warning" />
                      <strong>{t("dashboard.todayCaloriesErrorTitle")}</strong>
                    </div>
                    <p className="muted">{t("dashboard.todayCaloriesErrorDescription")}</p>
                    <div className="inline-actions-sm">
                      <Button variant="secondary" onClick={handleRetry}>
                        {t("ui.retry")}
                      </Button>
                      <ButtonLink variant="ghost" href="/app/seguimiento">
                        {t("dashboard.progressCta")}
                      </ButtonLink>
                    </div>
                  </div>
                ) : (
                  <>
                    <ProgressRing
                      value={todayTotals.calories}
                      target={nutritionTargets?.calories ?? null}
                      statusClass={calorieStatus}
                      ariaLabel={t("dashboard.calorieProgressLabel")}
                    />
                    <div className="today-calories-meta">
                      <div className="today-calories-value">
                        {todayTotals.calories.toFixed(0)} {t("units.kcal")}
                      </div>
                      {nutritionTargets ? (
                        <span className={`status-pill ${calorieStatus}`}>
                          {getStatusLabel(todayTotals.calories, nutritionTargets.calories)}
                        </span>
                      ) : (
                        <span className="muted">{t("tracking.targetsMissing")}</span>
                      )}
                      {nutritionTargets && calorieDelta !== null ? (
                        <span className="muted">
                          {calorieDelta >= 0
                            ? `${t("dashboard.caloriesRemainingLabel")} ${Math.round(calorieDelta)} ${t("units.kcal")}`
                            : `${t("dashboard.caloriesOverLabel")} ${Math.round(Math.abs(calorieDelta))} ${t("units.kcal")}`}
                        </span>
                      ) : null}
                      {nutritionTargets ? (
                        <div className="today-macro-badges">
                          <span
                            className={`status-pill is-compact ${getStatusClass(todayTotals.protein, nutritionTargets?.protein)}`}
                          >
                            {t("macros.proteinShort")} {todayTotals.protein.toFixed(0)}
                            {t("units.grams")}
                          </span>
                          <span
                            className={`status-pill is-compact ${getStatusClass(todayTotals.carbs, nutritionTargets?.carbs)}`}
                          >
                            {t("macros.carbsShort")} {todayTotals.carbs.toFixed(0)}
                            {t("units.grams")}
                          </span>
                          <span
                            className={`status-pill is-compact ${getStatusClass(todayTotals.fat, nutritionTargets?.fat)}`}
                          >
                            {t("macros.fatShort")} {todayTotals.fat.toFixed(0)}
                            {t("units.grams")}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("dashboard.aiSectionTitle")}</h2>
            <p className="section-subtitle">{t("dashboard.aiSectionSubtitle")}</p>
          </div>
        </div>
        <div className="list-grid dashboard-ai-grid">
          <div className="feature-card stack-md">
            <div>
              <strong>{t("dashboard.aiTrainingTitle")}</strong>
              <p className="muted mt-6">{t("dashboard.aiTrainingSubtitle")}</p>
            </div>
            <ButtonLink href="/app/entrenamiento?ai=1">
              {t("dashboard.aiTrainingCta")}
            </ButtonLink>
          </div>
          <div className="feature-card stack-md">
            <div>
              <strong>{t("dashboard.aiNutritionTitle")}</strong>
              <p className="muted mt-6">{t("dashboard.aiNutritionSubtitle")}</p>
            </div>
            <ButtonLink href="/app/nutricion?ai=1">
              {t("dashboard.aiNutritionCta")}
            </ButtonLink>
          </div>
          <div className="feature-card stack-md">
            <div>
              <strong>{t("dashboard.aiWeeklySummaryTitle")}</strong>
              <p className="muted mt-6">{t("dashboard.aiWeeklySummarySubtitle")}</p>
            </div>
            <div className="status-card">
              <div className="inline-actions-sm">
                <Icon name="info" />
                <strong>{t("access.notAvailableTitle")}</strong>
              </div>
              <p className="muted">{t("access.notAvailableDescription")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("dashboard.weightProgressTitle")}</h2>
            <p className="section-subtitle">{t("dashboard.weightProgressSubtitle")}</p>
          </div>
          <ButtonLink variant="secondary" href="/app/seguimiento#weight-entry">
            {t("dashboard.weightProgressCta")}
          </ButtonLink>
        </div>

        {weightProgressContent}
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("dashboard.progressTitle")}</h2>
            <p className="section-subtitle">{t("dashboard.kpiSubtitle")}</p>
          </div>
          <ButtonLink variant="secondary" href="/app/seguimiento">
            {t("dashboard.progressCta")}
          </ButtonLink>
        </div>

        {loading ? (
          <div className="dashboard-loading mt-12">
            <Skeleton variant="line" className="w-40" />
            <div className="dashboard-charts">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ) : error ? (
          <div className="dashboard-error">
            <div className="status-card status-card--warning">
              <div className="inline-actions-sm">
                <Icon name="warning" />
                <strong>{t("dashboard.errorTitle")}</strong>
              </div>
              <p className="muted">{error}</p>
            </div>
            <div className="inline-actions">
              <Button variant="secondary" onClick={handleRetry}>
                {t("ui.retry")}
              </Button>
              <ButtonLink variant="ghost" href="/app/seguimiento">
                {t("dashboard.progressCta")}
              </ButtonLink>
            </div>
          </div>
        ) : weeklyKpis.length === 0 ? (
          <div className="empty-state dashboard-empty">
            <div className="empty-state-icon">
              <Icon name="info" />
            </div>
            <div>
              <p className="muted m-0">{t("dashboard.kpiEmptyTitle")}</p>
            </div>
            <div className="dashboard-summary-actions">
              <ButtonLink href="/app/hoy" className="fit-content">
                {t("dashboard.kpiGoToday")}
              </ButtonLink>
              <ButtonLink variant="secondary" href="/app/entrenamiento" className="fit-content">
                {t("dashboard.kpiGoCalendar")}
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="dashboard-kpi-grid">
            {weeklyKpis.map((kpi) => {
              const maxBar = Math.max(...(kpi.bars ?? [0]), 1);
              return (
                <article key={kpi.key} className="feature-card dashboard-kpi-card" aria-label={`${kpi.title}: ${kpi.valueLabel}`}>
                  <div className="stack-sm">
                    <span className="muted">{kpi.title}</span>
                    <strong className="dashboard-kpi-value">{kpi.valueLabel}</strong>
                    <span className="muted">{kpi.helperLabel}</span>
                    {kpi.deltaLabel ? <span className="status-pill status-exact">{kpi.deltaLabel}</span> : null}
                  </div>
                  {kpi.bars && kpi.bars.length > 0 ? (
                    <div className="dashboard-kpi-bars" role="img" aria-label={`${kpi.title} ${kpi.bars.join(", ")}`}>
                      {kpi.bars.map((value, index) => (
                        <span
                          key={`${kpi.key}-bar-${index}`}
                          className="dashboard-kpi-bar"
                          style={{ height: `${Math.max(8, (value / maxBar) * 100)}%` }}
                        />
                      ))}
                    </div>
                  ) : null}
                  <ButtonLink variant="ghost" href={kpi.ctaHref} className="fit-content">
                    {kpi.ctaLabel}
                  </ButtonLink>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
