"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { EmptyState } from "@/components/exercise-library/states/EmptyState";
import { ErrorState } from "@/components/exercise-library/states/ErrorState";
import { SkeletonExerciseList } from "@/components/exercise-library/states/SkeletonExerciseList";
import {
  TodayEnergySkeleton,
  TodayNotesSkeleton,
  TodayNutritionSkeleton,
  TodayTrainingSkeleton,
  TodayWeightSkeleton,
} from "@/components/today/TodaySummarySkeletons";
import { TodayEnergySummary, type TodayEnergySummaryData } from "@/components/today/TodayEnergySummary";
import { TodayNutritionSummary, type TodayNutritionSummaryData } from "@/components/today/TodayNutritionSummary";
import { TodayNotesSummary, type TodayNotesSummaryData } from "@/components/today/TodayNotesSummary";
import { TodaySection } from "@/components/today/TodaySection";
import { TodayTrainingSummary, type TodayTrainingSummaryData } from "@/components/today/TodayTrainingSummary";
import { TodayWeightSummary, type TodayWeightSummaryData } from "@/components/today/TodayWeightSummary";
import { ButtonLink } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import { getExerciseCoverUrl } from "@/lib/exerciseMedia";
import { useExerciseRecents } from "@/lib/exerciseRecents";
import type { NutritionMeal } from "@/lib/profile";
import { slugifyExerciseName } from "@/lib/slugify";
import type { TrainingPlanDetail } from "@/lib/types";

type CheckinEntry = {
  date?: string | null;
  weightKg?: number | null;
  energy?: number | null;
  notes?: string | null;
};

type TrackingPayload = {
  checkins?: CheckinEntry[];
};

type ActiveTrainingPlanPayload = {
  source?: "assigned" | "own";
  plan?: TrainingPlanDetail | null;
};

type NutritionPlansPayload = {
  items?: NutritionPlanListItem[];
};

type SectionStatus = "loading" | "error" | "empty" | "ready";

type SectionState<T> = {
  status: SectionStatus;
  data?: T;
};

type ShortcutExercise = {
  id: string;
  name: string;
  equipment: string | null;
  coverUrl: string;
  isFallback: boolean;
};

type ErrorAction = NonNullable<ComponentProps<typeof ErrorState>["actions"]>[number];
type EmptyAction = NonNullable<ComponentProps<typeof EmptyState>["actions"]>[number];

const SHORTCUT_LIMIT = 4;

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

type TrainingSummarySource = {
  startDate?: string | null;
  days: Array<{
    date?: string;
    label: string;
    focus: string;
    duration: number;
  }>;
};

const buildTrainingSummary = (plan?: TrainingSummarySource | null): TodayTrainingSummaryData | null => {
  if (!plan?.days?.length) return null;
  const day = findTodayPlanDay(plan.days, plan.startDate);
  if (!day) return null;
  return {
    label: day.label,
    focus: day.focus,
    duration: day.duration,
  };
};

const buildNutritionSummary = (plan?: NutritionPlanDetail | null): TodayNutritionSummaryData | null => {
  if (!plan?.days?.length) return null;
  const day = findTodayPlanDay(plan.days, plan.startDate);
  if (!day || day.meals.length === 0) return null;
  const todayKey = toDateKey(new Date());
const meals = day.meals.map((meal: NutritionMeal, index: number) => {
  const title = meal.title?.trim() ?? "";
  const description = meal.description?.trim() ?? "";

  const parts = [
    day.date ?? todayKey,
    meal.type ?? "",
    title ? slugifyExerciseName(title) : "",
    description ? slugifyExerciseName(description) : "",
  ].filter(Boolean);

  // key MUST be a string (avoid null) to satisfy TS and React keys
  const key = parts.length > 0 ? parts.join(":") : `meal:${todayKey}:${index}`;

  return {
    key,
    title: meal.title,
    description: meal.description,
    type: meal.type,
  };
});
  return {
    label: day.dayLabel,
    meals,
    calories: plan.dailyCalories,
    dayKey: todayKey,
  };
};

const getLatestWeight = (checkins: CheckinEntry[]): TodayWeightSummaryData | null => {
  const validEntries = checkins
    .map((entry) => ({ entry, parsed: parseDate(entry.date) }))
    .filter(
      (item): item is { entry: CheckinEntry; parsed: Date } =>
        item.parsed !== null && Number.isFinite(item.entry.weightKg)
    );

  if (validEntries.length === 0) return null;

  const latest = validEntries
    .sort((a, b) => b.parsed.getTime() - a.parsed.getTime())[0]?.entry;

  if (!latest?.date || !Number.isFinite(latest.weightKg)) return null;

  return { weightKg: Number(latest.weightKg), date: latest.date };
};

const getLatestEnergy = (checkins: CheckinEntry[]): TodayEnergySummaryData | null => {
  const validEntries = checkins
    .map((entry) => ({ entry, parsed: parseDate(entry.date) }))
    .filter(
      (item): item is { entry: CheckinEntry; parsed: Date } =>
        item.parsed !== null && Number.isFinite(item.entry.energy)
    );

  if (validEntries.length === 0) return null;

  const latest = validEntries
    .sort((a, b) => b.parsed.getTime() - a.parsed.getTime())[0]?.entry;

  if (!latest?.date || !Number.isFinite(latest.energy)) return null;

  return { energy: Number(latest.energy), date: latest.date };
};
const getLatestNote = (checkins: CheckinEntry[]): TodayNotesSummaryData | null => {
  const validEntries = checkins
    .map((entry) => ({ entry, parsed: parseDate(entry.date) }))
    .filter(
      (item): item is { entry: CheckinEntry; parsed: Date } =>
        item.parsed !== null &&
        typeof item.entry.notes === "string" &&
        item.entry.notes.trim().length > 0
    );

  if (validEntries.length === 0) return null;

  const latest = validEntries
    .sort((a, b) => b.parsed.getTime() - a.parsed.getTime())[0]?.entry;

  if (!latest?.date || !latest.notes?.trim()) return null;

  return { notes: latest.notes.trim(), date: latest.date };
};
export default function TodaySummaryClient() {
  const { t } = useLanguage();
  const mountedRef = useRef(true);
  const [trainingState, setTrainingState] = useState<SectionState<TodayTrainingSummaryData>>({ status: "loading" });
  const [nutritionState, setNutritionState] = useState<SectionState<TodayNutritionSummaryData>>({ status: "loading" });
  const [weightState, setWeightState] = useState<SectionState<TodayWeightSummaryData>>({ status: "loading" });
  const [energyState, setEnergyState] = useState<SectionState<TodayEnergySummaryData>>({ status: "loading" });
  const [notesState, setNotesState] = useState<SectionState<TodayNotesSummaryData>>({ status: "loading" });
  const [energySupported, setEnergySupported] = useState(false);
  const [notesSupported, setNotesSupported] = useState(false);
  const [assignedPlanId, setAssignedPlanId] = useState<string | null>(null);
  const [assignedNutritionPlanId, setAssignedNutritionPlanId] = useState<string | null>(null);
  const {
    favorites,
    loading: favoritesLoading,
    hasError: favoritesError,
    refresh: refreshFavorites,
  } = useExerciseFavorites();
  const {
    recents,
    loading: recentsLoading,
    hasError: recentsError,
    refresh: refreshRecents,
  } = useExerciseRecents();

  const loadAssignedNutritionPlan = useCallback(async () => {
    setNutritionState({ status: "loading" });
    setAssignedNutritionPlanId(null);

    try {
      const listResponse = await fetch("/api/nutrition-plans?limit=1", { cache: "no-store" });
      if (!listResponse.ok) throw new Error("NUTRITION_PLAN_LIST_ERROR");

      const listData = (await listResponse.json()) as NutritionPlansPayload;
      const latestPlan = listData.items?.[0];

      if (!latestPlan) {
        if (!mountedRef.current) return;
        setNutritionState({ status: "empty" });
        return;
      }

      const detailResponse = await fetch(`/api/nutrition-plans/${latestPlan.id}`, { cache: "no-store" });
      if (!detailResponse.ok) throw new Error("NUTRITION_PLAN_DETAIL_ERROR");

      const planDetail = (await detailResponse.json()) as NutritionPlanDetail;
      if (!mountedRef.current) return;

      const nutritionSummary = buildNutritionSummary(planDetail);
      setAssignedNutritionPlanId(latestPlan.id);
      setNutritionState(nutritionSummary ? { status: "ready", data: nutritionSummary } : { status: "empty" });
    } catch {
      if (!mountedRef.current) return;
      setNutritionState({ status: "error" });
    }
  }, []);

  const loadAssignedTrainingPlan = useCallback(async () => {
    setTrainingState({ status: "loading" });
    setAssignedPlanId(null);

    try {
      const activeResponse = await fetch("/api/training-plans/active?includeDays=1", { cache: "no-store" });
      if (!activeResponse.ok) throw new Error("TRAINING_PLAN_ACTIVE_ERROR");

      const activePayload = (await activeResponse.json()) as ActiveTrainingPlanPayload;
      const planDetail = activePayload.plan;

      if (!planDetail) {
        if (!mountedRef.current) return;
        setTrainingState({ status: "empty" });
        return;
      }
      if (!mountedRef.current) return;

      const trainingSummary = buildTrainingSummary(planDetail);
      setAssignedPlanId(planDetail.id);
      setTrainingState(trainingSummary ? { status: "ready", data: trainingSummary } : { status: "empty" });
    } catch {
      if (!mountedRef.current) return;
      setTrainingState({ status: "error" });
    }
  }, []);

  const loadTracking = useCallback(async () => {
    setWeightState({ status: "loading" });
    setEnergyState({ status: "loading" });
    setNotesState({ status: "loading" });

    try {
      const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("TRACKING_ERROR");
      const data = (await response.json()) as TrackingPayload;
      if (!mountedRef.current) return;
      const checkins = data.checkins ?? [];
      const latestWeight = getLatestWeight(checkins);
      const latestEnergy = getLatestEnergy(checkins);
      const latestNotes = getLatestNote(checkins);
      const hasEnergyField = checkins.some((entry) => Object.prototype.hasOwnProperty.call(entry, "energy"));
      const hasNotesField = checkins.some((entry) => Object.prototype.hasOwnProperty.call(entry, "notes"));
      setWeightState(latestWeight ? { status: "ready", data: latestWeight } : { status: "empty" });
      setEnergyState(latestEnergy ? { status: "ready", data: latestEnergy } : { status: "empty" });
      setNotesState(latestNotes ? { status: "ready", data: latestNotes } : { status: "empty" });
      setEnergySupported(hasEnergyField);
      setNotesSupported(hasNotesField);
    } catch {
      if (!mountedRef.current) return;
      setWeightState({ status: "error" });
      setEnergyState({ status: "error" });
      setNotesState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadAssignedNutritionPlan();
    void loadAssignedTrainingPlan();
    void loadTracking();
    return () => {
      mountedRef.current = false;
    };
  }, [loadAssignedNutritionPlan, loadAssignedTrainingPlan, loadTracking]);

  const trainingAction = useMemo(
    () => (
      <ButtonLink
        variant="secondary"
        href={assignedPlanId ? `/app/biblioteca/entrenamientos/${assignedPlanId}?from=hoy` : "/app/biblioteca/entrenamientos"}
        size="lg"
      >
        {t("today.trainingCta")}
      </ButtonLink>
    ),
    [assignedPlanId, t]
  );

  const nutritionAction = useMemo(
    () => (
      <ButtonLink
        variant="secondary"
        href={assignedNutritionPlanId ? `/app/dietas/${assignedNutritionPlanId}?from=hoy` : "/app/dietas"}
        size="lg"
      >
        {t("today.nutritionCta")}
      </ButtonLink>
    ),
    [assignedNutritionPlanId, t]
  );

  const weightAction = useMemo(
    () => (
      <ButtonLink variant="secondary" href="/app/seguimiento#weight-entry" size="lg">
        {t("today.weightCta")}
      </ButtonLink>
    ),
    [t]
  );

  const energyAction = useMemo(() => {
    if (!energySupported) return null;
    return (
      <ButtonLink variant="secondary" href="/app/seguimiento#checkin-entry" size="lg">
        {t("today.energyCta")}
      </ButtonLink>
    );
  }, [energySupported, t]);

  const notesAction = useMemo(() => {
    if (!notesSupported) return null;
    return (
      <ButtonLink variant="secondary" href="/app/seguimiento#checkin-entry" size="lg">
        {t("today.notesCta")}
      </ButtonLink>
    );
  }, [notesSupported, t]);

const nutritionEmptyActions: EmptyAction[] = [
  {
    label: t("today.nutritionCta"),
    href: assignedNutritionPlanId ? `/app/dietas/${assignedNutritionPlanId}?from=hoy` : "/app/dietas",
    variant: "secondary",
  },
];

const nutritionErrorActions: ErrorAction[] = [
  {
    label: t("today.nutritionCta"),
    href: assignedNutritionPlanId ? `/app/dietas/${assignedNutritionPlanId}?from=hoy` : "/app/dietas",
  },
  { label: t("ui.retry"), onClick: loadAssignedNutritionPlan, variant: "secondary" },
];

const energyEmptyActions: EmptyAction[] | undefined = energySupported
  ? [{ label: t("today.energyCta"), href: "/app/seguimiento#checkin-entry", variant: "secondary" }]
  : undefined;

const notesEmptyActions: EmptyAction[] | undefined = notesSupported
  ? [{ label: t("today.notesCta"), href: "/app/seguimiento#checkin-entry", variant: "secondary" }]
  : undefined;
const energyErrorActions: ErrorAction[] = [
  ...(energySupported ? [{ label: t("today.energyCta"), href: "/app/seguimiento#checkin-entry" }] : []),
  { label: t("ui.retry"), onClick: loadTracking, variant: "secondary" },
];

const notesErrorActions: ErrorAction[] = [
  ...(notesSupported ? [{ label: t("today.notesCta"), href: "/app/seguimiento#checkin-entry" }] : []),
  { label: t("ui.retry"), onClick: loadTracking, variant: "secondary" },
];

  const recentsById = useMemo(() => {
    return new Map(recents.map((recent) => [recent.id, recent]));
  }, [recents]);

  const favoriteItems = useMemo<ShortcutExercise[]>(
    () =>
      favorites.slice(0, SHORTCUT_LIMIT).map((favoriteId) => {
        const recent = recentsById.get(favoriteId);
        if (recent) {
          return {
            id: recent.id,
            name: recent.name,
            equipment: recent.equipment ?? null,
            coverUrl: getExerciseCoverUrl(recent),
            isFallback: false,
          };
        }

        return {
          id: favoriteId,
          name: t("today.shortcutsExerciseFallback"),
          equipment: null,
          coverUrl: getExerciseCoverUrl(null),
          isFallback: true,
        };
      }),
    [favorites, recentsById, t]
  );

  const recentItems = useMemo<ShortcutExercise[]>(
    () =>
      recents.slice(0, SHORTCUT_LIMIT).map((recent) => ({
        id: recent.id,
        name: recent.name,
        equipment: recent.equipment ?? null,
        coverUrl: getExerciseCoverUrl(recent),
        isFallback: false,
      })),
    [recents]
  );

  const renderShortcutCard = (item: ShortcutExercise) => {
    const equipmentLabel = item.equipment ?? t("library.equipmentFallback");
    return (
      <div key={item.id} className="feature-card library-card">
        <Link href={`/app/biblioteca/${item.id}`} className="library-card-link">
          <img
            src={item.coverUrl}
            alt={`${t("library.mediaAlt")} ${item.name}`}
            className="exercise-card-media"
            onError={(event) => {
              event.currentTarget.src = "/placeholders/exercise-cover.svg";
            }}
          />
          <h3>{item.name}</h3>
          <p className="muted">
            {t("library.equipmentLabel")}: {equipmentLabel}
          </p>
          {item.isFallback ? (
            <p className="muted">
              {t("today.shortcutsExerciseIdLabel")}: {item.id}
            </p>
          ) : null}
        </Link>
      </div>
    );
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h2 className="section-title">{t("today.summarySectionTitle")}</h2>
          <p className="section-subtitle">{t("today.summarySectionSubtitle")}</p>
        </div>
      </div>

      <TodaySection
        title={t("today.trainingSectionTitle")}
        subtitle={t("today.trainingSectionSubtitle")}
        action={trainingAction}
        status={trainingState.status}
        loading={<TodayTrainingSkeleton />}
        error={
          <ErrorState
            title={t("today.trainingErrorTitle")}
            description={t("today.trainingErrorDescription")}
            actions={[{ label: t("ui.retry"), onClick: loadAssignedTrainingPlan, variant: "secondary" }]}
          />
        }
        empty={
          <EmptyState
            title={t("today.trainingEmptyTitle")}
            description={t("today.trainingAssignedEmptyDescription")}
            actions={[{ label: t("today.trainingCta"), href: "/app/biblioteca/entrenamientos", variant: "secondary" }]}
          />
        }
      >
        {trainingState.data && <TodayTrainingSummary data={trainingState.data} />}
      </TodaySection>

      <TodaySection
        title={t("today.nutritionSectionTitle")}
        subtitle={t("today.nutritionSectionSubtitle")}
        action={nutritionAction}
        status={nutritionState.status}
        loading={<TodayNutritionSkeleton />}
        error={
          <ErrorState
            title={t("today.nutritionErrorTitle")}
            description={t("today.nutritionErrorDescription")}
            actions={nutritionErrorActions}
          />
        }
        empty={
          <EmptyState
            title={t("today.nutritionEmptyTitle")}
            description={t("today.nutritionEmptyDescription")}
            actions={nutritionEmptyActions}
          />
        }
      >
        {nutritionState.data && <TodayNutritionSummary data={nutritionState.data} />}
      </TodaySection>

      <TodaySection
        title={t("today.weightSectionTitle")}
        subtitle={t("today.weightSectionSubtitle")}
        action={weightAction}
        status={weightState.status}
        loading={<TodayWeightSkeleton />}
        error={
          <ErrorState
            title={t("today.weightErrorTitle")}
            description={t("today.weightErrorDescription")}
            actions={[
              { label: t("today.weightCta"), href: "/app/seguimiento#weight-entry" },
              { label: t("ui.retry"), onClick: loadTracking, variant: "secondary" },
            ]}
          />
        }
        empty={
          <EmptyState
            title={t("today.weightEmptyTitle")}
            description={t("today.weightEmptyDescription")}
            actions={[{ label: t("today.weightCta"), href: "/app/seguimiento#weight-entry", variant: "secondary" }]}
          />
        }
      >
        {weightState.data && <TodayWeightSummary data={weightState.data} />}
      </TodaySection>

      <TodaySection
        title={t("today.energySectionTitle")}
        subtitle={t("today.energySectionSubtitle")}
        action={energyAction ?? undefined}
        status={energyState.status}
        loading={<TodayEnergySkeleton />}
        error={
          <ErrorState
            title={t("today.energyErrorTitle")}
            description={t("today.energyErrorDescription")}
            actions={energyErrorActions}
          />
        }
        empty={
          <EmptyState
            title={t("today.energyEmptyTitle")}
            description={t("today.energyEmptyDescription")}
            actions={energyEmptyActions}
          />
        }
      >
        {energyState.data && <TodayEnergySummary data={energyState.data} />}
      </TodaySection>

      <TodaySection
        title={t("today.notesSectionTitle")}
        subtitle={t("today.notesSectionSubtitle")}
        action={notesAction ?? undefined}
        status={notesState.status}
        loading={<TodayNotesSkeleton />}
        error={
          <ErrorState
            title={t("today.notesErrorTitle")}
            description={t("today.notesErrorDescription")}
            actions={notesErrorActions}
          />
        }
        empty={
          <EmptyState
            title={t("today.notesEmptyTitle")}
            description={t("today.notesEmptyDescription")}
            actions={notesEmptyActions}
          />
        }
      >
        {notesState.data && <TodayNotesSummary data={notesState.data} />}
      </TodaySection>

      <TodaySection
        title={t("today.shortcutsSectionTitle")}
        subtitle={t("today.shortcutsSectionSubtitle")}
        status="ready"
        loading={<></>}
        error={<></>}
        empty={<></>}
      >
        <div className="stack-lg">
          <div>
            <div className="section-head">
              <h3 className="section-title section-title-sm">{t("today.shortcutsFavoritesTitle")}</h3>
            </div>
            {favoritesLoading ? (
              <SkeletonExerciseList count={2} showAction={false} className="mt-12" />
            ) : favoritesError ? (
              <ErrorState
                title={t("today.shortcutsFavoritesErrorTitle")}
                description={t("today.shortcutsFavoritesErrorDescription")}
                actions={[
                  { label: t("ui.retry"), onClick: refreshFavorites, variant: "secondary" },
                ]}
              />
            ) : favorites.length === 0 ? (
              <EmptyState
                title={t("today.shortcutsFavoritesEmptyTitle")}
                description={t("today.shortcutsFavoritesEmptyDescription")}
                icon="sparkles"
              />
            ) : (
              <div className="list-grid mt-12">
                {favoriteItems.map((item) => renderShortcutCard(item))}
              </div>
            )}
          </div>
          <div>
            <div className="section-head">
              <h3 className="section-title section-title-sm">{t("today.shortcutsRecentsTitle")}</h3>
            </div>
            {recentsLoading ? (
              <SkeletonExerciseList count={2} showAction={false} className="mt-12" />
            ) : recentsError ? (
              <ErrorState
                title={t("today.shortcutsRecentsErrorTitle")}
                description={t("today.shortcutsRecentsErrorDescription")}
                actions={[
                  { label: t("ui.retry"), onClick: refreshRecents, variant: "secondary" },
                ]}
              />
            ) : recents.length === 0 ? (
              <EmptyState
                title={t("today.shortcutsRecentsEmptyTitle")}
                description={t("today.shortcutsRecentsEmptyDescription")}
                icon="dumbbell"
              />
            ) : (
              <div className="list-grid mt-12">
                {recentItems.map((item) => renderShortcutCard(item))}
              </div>
            )}
          </div>
        </div>
      </TodaySection>
    </>
  );
}
