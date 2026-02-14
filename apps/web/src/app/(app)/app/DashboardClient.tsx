"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import type { NutritionPlanData, ProfileData, TrainingPlanData } from "@/lib/profile";
import { isProfileComplete } from "@/lib/profileCompletion";
import { buildWeightProgressSummary, hasSufficientWeightProgress, normalizeWeightLogs } from "@/lib/weightProgress";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

type CheckinEntry = {
  date: string;
  weightKg: number;
  bodyFatPercent: number;
};

type FoodEntry = {
  id: string;
  date: string;
  foodKey: string;
  grams: number;
};

type UserFood = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type TrackingPayload = {
  checkins?: CheckinEntry[];
  foodLog?: FoodEntry[];
};

type TodaySummary = {
  training?: { label: string; focus: string; duration: number } | null;
  nutrition?: { label: string; meals: number } | null;
};

type ChartPoint = {
  label: string;
  value: number;
};

const defaultFoodProfiles: Record<string, { labelKey: string; protein: number; carbs: number; fat: number }> = {
  salmon: { labelKey: "foods.salmon", protein: 20, carbs: 0, fat: 13 },
  eggs: { labelKey: "foods.eggs", protein: 13, carbs: 1.1, fat: 10 },
  chicken: { labelKey: "foods.chicken", protein: 31, carbs: 0, fat: 3.6 },
  rice: { labelKey: "foods.brownRice", protein: 2.7, carbs: 28, fat: 0.3 },
  quinoa: { labelKey: "foods.quinoa", protein: 4.4, carbs: 21, fat: 1.9 },
  yogurt: { labelKey: "foods.greekYogurt", protein: 10, carbs: 4, fat: 4 },
  potatoes: { labelKey: "foods.potato", protein: 2, carbs: 17, fat: 0.1 },
  avocado: { labelKey: "foods.avocado", protein: 2, carbs: 9, fat: 15 },
};

function buildSeries(checkins: CheckinEntry[], key: "weightKg" | "bodyFatPercent") {
  return [...checkins]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => {
      const value = Number(entry[key]);
      if (!Number.isFinite(value)) return null;
      return { label: entry.date, value };
    })
    .filter((entry): entry is ChartPoint => entry !== null);
}

function LineChart({ data, unit, label }: { data: ChartPoint[]; unit: string; label: string }) {
  if (data.length === 0) return null;

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const width = 120;
  const height = 40;
  const padding = 6;

  const points = data.map((point, index) => {
    const x = padding + (index / Math.max(1, data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (point.value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const latest = data[data.length - 1];

  return (
    <div className="chart-wrapper">
      <div className="chart-meta">
        <strong>
          {latest.value} {unit}
        </strong>
        <span className="muted">{latest.label}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label={label}>
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={path}
        />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="2.2" fill="var(--accent)" />
        ))}
      </svg>
    </div>
  );
}

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
  const { entitlements, loading: entitlementsLoading } = useAuthEntitlements();
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([]);
  const [userFoods, setUserFoods] = useState<UserFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [summary, setSummary] = useState<TodaySummary | null>(null);

  useEffect(() => {
    let active = true;
    const loadTracking = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("LOAD_ERROR");
        const data = (await response.json()) as TrackingPayload;
        if (active) {
          setCheckins(data.checkins ?? []);
          setFoodLog(data.foodLog ?? []);
        }
      } catch {
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
      } catch {
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
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as ProfileData;
        if (!active) return;
        setProfile(data);
      } catch {
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

  useEffect(() => {
    if (!profile || !profileReady) {
      setSummary(null);
      return;
    }
    const buildTrainingSummary = (plan?: TrainingPlanData | null) => {
      if (!plan?.days?.length) return null;
      const todayKey = toDateKey(new Date());
      const dayFromDate = plan.days.find((day) => {
        const parsed = parseDate(day.date);
        return parsed ? toDateKey(parsed) === todayKey : false;
      });
      if (dayFromDate) {
        return { label: dayFromDate.label, focus: dayFromDate.focus, duration: dayFromDate.duration };
      }
      const start = parseDate(plan.startDate);
      if (!start) return null;
      const index = differenceInDays(new Date(), start);
      if (index < 0 || index >= plan.days.length) return null;
      const day = plan.days[index];
      return { label: day.label, focus: day.focus, duration: day.duration };
    };
    const buildNutritionSummary = (plan?: NutritionPlanData | null) => {
      if (!plan?.days?.length) return null;
      const todayKey = toDateKey(new Date());
      const dayFromDate = plan.days.find((day) => {
        const parsed = parseDate(day.date);
        return parsed ? toDateKey(parsed) === todayKey : false;
      });
      if (dayFromDate) {
        return { label: dayFromDate.dayLabel, meals: dayFromDate.meals.length };
      }
      const start = parseDate(plan.startDate);
      if (!start) return null;
      const index = differenceInDays(new Date(), start);
      if (index < 0 || index >= plan.days.length) return null;
      const day = plan.days[index];
      return { label: day.dayLabel, meals: day.meals.length };
    };

    const training = buildTrainingSummary(profile.trainingPlan);
    const nutrition = buildNutritionSummary(profile.nutritionPlan);
    setSummary({ training, nutrition });
  }, [profile, profileReady]);

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
      new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        day: "2-digit",
        month: "short",
      }),
    [locale]
  );

  const weightSeries = useMemo(() => buildSeries(checkins, "weightKg"), [checkins]);
  const bodyFatSeries = useMemo(() => buildSeries(checkins, "bodyFatPercent"), [checkins]);
  const hasWeightData = weightSeries.length > 0;
  const hasBodyFatData = bodyFatSeries.length > 0;
  const handleRetry = () => window.location.reload();

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
            {Array.from({ length: 3 }).map((_, index) => (
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
            <div className="feature-card dashboard-summary-card">
              <span className="muted">{t("dashboard.todayTrainingTitle")}</span>
              {summary?.training ? (
                <>
                  <strong className="mt-6">{summary.training.focus}</strong>
                  <p className="muted mt-6">
                    {summary.training.duration} {t("training.minutesLabel")}
                  </p>
                  {summary.training.label ? <Badge>{summary.training.label}</Badge> : null}
                  <ButtonLink variant="secondary" href="/app/entrenamiento">
                    {t("dashboard.todayTrainingCta")}
                  </ButtonLink>
                </>
              ) : (
                <>
                  <strong className="mt-6">{t("dashboard.restDayTitle")}</strong>
                  <p className="muted mt-6">{t("dashboard.restDaySubtitle")}</p>
                  <ButtonLink variant="secondary" href="/app/entrenamiento">
                    {t("dashboard.restDayCta")}
                  </ButtonLink>
                </>
              )}
            </div>
            <div className="feature-card dashboard-summary-card">
              <span className="muted">{t("dashboard.todayNutritionTitle")}</span>
              {summary?.nutrition ? (
                <>
                  <strong className="mt-6">{t("dashboard.todayNutritionPrimaryLabel")}</strong>
                  <p className="muted mt-6">
                    {summary.nutrition.meals} {t("dashboard.todayMealsLabel")}
                    {nutritionTargets?.calories
                      ? ` · ${nutritionTargets.calories} ${t("units.kcal")}`
                      : ""}
                  </p>
                  {summary.nutrition.label ? <Badge>{summary.nutrition.label}</Badge> : null}
                </>
              ) : (
                <>
                  <strong className="mt-6">{t("dashboard.todayNutritionPrimaryLabel")}</strong>
                  <p className="muted mt-6">{t("dashboard.todayNutritionEmpty")}</p>
                </>
              )}
              <ButtonLink variant="secondary" href="/app/nutricion">
                {t("dashboard.todayNutritionCta")}
              </ButtonLink>
            </div>
            <div className="feature-card dashboard-summary-card stack-md">
              <div>
                <strong>{t("dashboard.quickActionsTitle")}</strong>
                <p className="muted mt-6">{t("dashboard.quickActionsSubtitle")}</p>
              </div>
              <div className="list-grid">
                <ButtonLink href="/app/workouts">
                  {t("dashboard.aiTrainingCta")}
                </ButtonLink>
                <ButtonLink href="/app/nutricion?ai=1">
                  {t("dashboard.aiNutritionCta")}
                </ButtonLink>
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
            {entitlementsLoading ? (
              <div className="stack-sm" aria-busy="true" aria-live="polite">
                <Skeleton variant="line" className="w-45" />
                <Skeleton variant="line" className="w-70" />
              </div>
            ) : entitlements.status !== "known" || !entitlements.features.hasProSupport ? (
              <div className="status-card">
                <div className="inline-actions-sm">
                  <Icon name="info" />
                  <strong>{t("dashboard.aiWeeklySummaryLockedTitle")}</strong>
                </div>
                <p className="muted">{t("dashboard.aiWeeklySummaryLockedDescription")}</p>
              </div>
            ) : (
              <div className="status-card">
                <div className="inline-actions-sm">
                  <Icon name="info" />
                  <strong>{t("dashboard.aiWeeklySummaryEmptyTitle")}</strong>
                </div>
                <p className="muted">{t("dashboard.aiWeeklySummaryEmptyDescription")}</p>
              </div>
            )}
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

        {loading ? (
          <div className="dashboard-loading mt-12">
            <Skeleton variant="line" className="w-32" />
            <div className="dashboard-charts">
              <SkeletonCard />
            </div>
          </div>
        ) : error ? (
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
        ) : !hasWeightEntries ? (
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
        ) : !hasWeightProgress || !currentWeight ? (
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
) : (
  <div className="list-grid">
    <div className="feature-card stack-md">
      <div>
        <span className="muted">{t("dashboard.weightProgressLast7Days")}</span>
        <div className="mt-6">
          <strong>
            {currentWeight.latest.weightKg.toFixed(1)} {t("units.kilograms")}
          </strong>
          <p className="muted mt-6">
            {t("dashboard.weightProgressLatestLabel")}{" "}
            {weightDateFormatter.format(currentWeight.latest.date)}
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
)}
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title section-title-sm">{t("dashboard.progressTitle")}</h2>
            <p className="section-subtitle">{t("dashboard.progressSubtitle")}</p>
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
        ) : checkins.length === 0 ? (
          <div className="empty-state dashboard-empty">
            <div className="empty-state-icon">
              <Icon name="info" />
            </div>
            <div>
              <p className="muted m-0">{t("dashboard.progressEmpty")}</p>
              <p className="muted m-0">{t("dashboard.progressEmptyHint")}</p>
            </div>
            <ButtonLink href="/app/seguimiento" className="fit-content">
              {t("dashboard.progressEmptyCta")}
            </ButtonLink>
          </div>
        ) : (
          <div className="dashboard-charts">
            <div className="feature-card chart-card">
              <div className="chart-header">
                <h3>{t("dashboard.weightChartTitle")}</h3>
                <span className="muted">{t("dashboard.weightChartSubtitle")}</span>
              </div>
              {hasWeightData ? (
                <LineChart data={weightSeries} unit={t("units.kilograms")} label={t("dashboard.weightChartAria")} />
              ) : (
                <div className="empty-state">
                  <div>
                    <p className="muted m-0">{t("dashboard.weightProgressEmptyTitle")}</p>
                    <p className="muted m-0">{t("dashboard.weightProgressEmptySubtitle")}</p>
                  </div>
                  <ButtonLink href="/app/seguimiento" className="fit-content">
                    {t("dashboard.progressEmptyCta")}
                  </ButtonLink>
                </div>
              )}
            </div>
            <div className="feature-card chart-card">
              <div className="chart-header">
                <h3>{t("dashboard.bodyFatChartTitle")}</h3>
                <span className="muted">{t("dashboard.bodyFatChartSubtitle")}</span>
              </div>
              {hasBodyFatData ? (
                <LineChart data={bodyFatSeries} unit={t("units.percent")} label={t("dashboard.bodyFatChartAria")} />
              ) : (
                <div className="empty-state">
                  <div>
                    <p className="muted m-0">{t("dashboard.bodyFatEmptyTitle")}</p>
                    <p className="muted m-0">{t("dashboard.bodyFatEmptySubtitle")}</p>
                  </div>
                  <ButtonLink href="/app/seguimiento" className="fit-content">
                    {t("dashboard.progressEmptyCta")}
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
