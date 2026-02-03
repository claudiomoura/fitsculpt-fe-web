"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { TodaySectionCard } from "@/components/today/TodaySectionCard";
import { TodayTrainingSummary, type TodayTrainingSummaryData } from "@/components/today/TodayTrainingSummary";
import { TodayWeightSummary, type TodayWeightSummaryData } from "@/components/today/TodayWeightSummary";
import { ButtonLink } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { differenceInDays, parseDate, toDateKey } from "@/lib/calendar";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import { getExerciseCoverUrl } from "@/lib/exerciseMedia";
import { useExerciseRecents } from "@/lib/exerciseRecents";
import type { NutritionPlanData, ProfileData, TrainingPlanData } from "@/lib/profile";

type CheckinEntry = {
  date?: string | null;
  weightKg?: number | null;
  energy?: number | null;
  notes?: string | null;
};

type TrackingPayload = {
  checkins?: CheckinEntry[];
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

const buildTrainingSummary = (plan?: TrainingPlanData | null): TodayTrainingSummaryData | null => {
  if (!plan?.days?.length) return null;
  const day = findTodayPlanDay(plan.days, plan.startDate);
  if (!day) return null;
  return {
    label: day.label,
    focus: day.focus,
    duration: day.duration,
  };
};

const buildNutritionSummary = (plan?: NutritionPlanData | null): TodayNutritionSummaryData | null => {
  if (!plan?.days?.length) return null;
  const day = findTodayPlanDay(plan.days, plan.startDate);
  if (!day) return null;
  return {
    label: day.dayLabel,
    meals: day.meals.length,
    calories: plan.dailyCalories,
  };
};

const getLatestWeight = (checkins: CheckinEntry[]): TodayWeightSummaryData | null => {
  const validEntries = checkins
    .map((entry) => ({ entry, parsed: parseDate(entry.date) }))
    .filter(({ entry, parsed }) => parsed && Number.isFinite(entry.weightKg));
  if (validEntries.length === 0) return null;
  const latest = validEntries.sort((a, b) => a.parsed.getTime() - b.parsed.getTime()).at(-1)?.entry;
  if (!latest?.date || !Number.isFinite(latest.weightKg)) return null;
  return { weightKg: Number(latest.weightKg), date: latest.date };
};

const getLatestEnergy = (checkins: CheckinEntry[]): TodayEnergySummaryData | null => {
  const validEntries = checkins
    .map((entry) => ({ entry, parsed: parseDate(entry.date) }))
    .filter(({ entry, parsed }) => parsed && Number.isFinite(entry.energy));
  if (validEntries.length === 0) return null;
  const latest = validEntries.sort((a, b) => a.parsed.getTime() - b.parsed.getTime()).at(-1)?.entry;
  if (!latest?.date || !Number.isFinite(latest.energy)) return null;
  return { energy: Number(latest.energy), date: latest.date };
};

const getLatestNote = (checkins: CheckinEntry[]): TodayNotesSummaryData | null => {
  const validEntries = checkins
    .map((entry) => ({ entry, parsed: parseDate(entry.date) }))
    .filter(({ entry, parsed }) => parsed && typeof entry.notes === "string");
  if (validEntries.length === 0) return null;
  const latest = validEntries
    .filter(({ entry }) => entry.notes && entry.notes.trim().length > 0)
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())
    .at(-1)?.entry;
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

  const loadProfile = useCallback(async () => {
    setTrainingState({ status: "loading" });
    setNutritionState({ status: "loading" });

    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) throw new Error("PROFILE_ERROR");
      const data = (await response.json()) as ProfileData;
      if (!mountedRef.current) return;

      const trainingSummary = buildTrainingSummary(data.trainingPlan);
      const nutritionSummary = buildNutritionSummary(data.nutritionPlan);

      setTrainingState(trainingSummary ? { status: "ready", data: trainingSummary } : { status: "empty" });
      setNutritionState(nutritionSummary ? { status: "ready", data: nutritionSummary } : { status: "empty" });
    } catch {
      if (!mountedRef.current) return;
      setTrainingState({ status: "error" });
      setNutritionState({ status: "error" });
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
    void loadProfile();
    void loadTracking();
    return () => {
      mountedRef.current = false;
    };
  }, [loadProfile, loadTracking]);

  const trainingAction = useMemo(
    () => (
      <ButtonLink variant="secondary" href="/app/entrenamiento" size="lg">
        {t("today.trainingCta")}
      </ButtonLink>
    ),
    [t]
  );

  const nutritionAction = useMemo(
    () => (
      <ButtonLink variant="secondary" href="/app/nutricion" size="lg">
        {t("today.nutritionCta")}
      </ButtonLink>
    ),
    [t]
  );

  const weightAction = useMemo(
    () => (
      <ButtonLink variant="secondary" href="/app/seguimiento#weight-entry" size="lg">
        {t("quickActions.recordWeight")}
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

  const energyEmptyActions = energySupported
    ? [{ label: t("today.energyCta"), href: "/app/seguimiento#checkin-entry", variant: "secondary" }]
    : undefined;
  const notesEmptyActions = notesSupported
    ? [{ label: t("today.notesCta"), href: "/app/seguimiento#checkin-entry", variant: "secondary" }]
    : undefined;
  const energyErrorActions = [
    ...(energySupported ? [{ label: t("today.energyCta"), href: "/app/seguimiento#checkin-entry" }] : []),
    { label: t("ui.retry"), onClick: loadTracking, variant: "secondary" },
  ];
  const notesErrorActions = [
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
      <TodaySectionCard title={t("today.trainingSectionTitle")} subtitle={t("today.trainingSectionSubtitle")} action={trainingAction}>
        {trainingState.status === "loading" ? (
          <TodayTrainingSkeleton />
        ) : trainingState.status === "error" ? (
          <ErrorState
            title={t("today.trainingErrorTitle")}
            description={t("today.trainingErrorDescription")}
            actions={[{ label: t("ui.retry"), onClick: loadProfile, variant: "secondary" }]}
          />
        ) : trainingState.status === "empty" ? (
          <EmptyState
            title={t("today.trainingEmptyTitle")}
            description={t("today.trainingEmptyDescription")}
          />
        ) : (
          trainingState.data && <TodayTrainingSummary data={trainingState.data} />
        )}
      </TodaySectionCard>

      <TodaySectionCard title={t("today.nutritionSectionTitle")} subtitle={t("today.nutritionSectionSubtitle")} action={nutritionAction}>
        {nutritionState.status === "loading" ? (
          <TodayNutritionSkeleton />
        ) : nutritionState.status === "error" ? (
          <ErrorState
            title={t("today.nutritionErrorTitle")}
            description={t("today.nutritionErrorDescription")}
            actions={[{ label: t("ui.retry"), onClick: loadProfile, variant: "secondary" }]}
          />
        ) : nutritionState.status === "empty" ? (
          <EmptyState
            title={t("today.nutritionEmptyTitle")}
            description={t("today.nutritionEmptyDescription")}
          />
        ) : (
          nutritionState.data && <TodayNutritionSummary data={nutritionState.data} />
        )}
      </TodaySectionCard>

      <TodaySectionCard title={t("today.weightSectionTitle")} subtitle={t("today.weightSectionSubtitle")} action={weightAction}>
        {weightState.status === "loading" ? (
          <TodayWeightSkeleton />
        ) : weightState.status === "error" ? (
          <ErrorState
            title={t("today.weightErrorTitle")}
            description={t("today.weightErrorDescription")}
            actions={[
              { label: t("quickActions.recordWeight"), href: "/app/seguimiento#weight-entry" },
              { label: t("ui.retry"), onClick: loadTracking, variant: "secondary" },
            ]}
          />
        ) : weightState.status === "empty" ? (
          <EmptyState
            title={t("today.weightEmptyTitle")}
            description={t("today.weightEmptyDescription")}
            actions={[{ label: t("quickActions.recordWeight"), href: "/app/seguimiento#weight-entry", variant: "secondary" }]}
          />
        ) : (
          weightState.data && <TodayWeightSummary data={weightState.data} />
        )}
      </TodaySectionCard>

      <TodaySectionCard title={t("today.energySectionTitle")} subtitle={t("today.energySectionSubtitle")} action={energyAction ?? undefined}>
        {energyState.status === "loading" ? (
          <TodayEnergySkeleton />
        ) : energyState.status === "error" ? (
          <ErrorState
            title={t("today.energyErrorTitle")}
            description={t("today.energyErrorDescription")}
            actions={energyErrorActions}
          />
        ) : energyState.status === "empty" ? (
          <EmptyState
            title={t("today.energyEmptyTitle")}
            description={t("today.energyEmptyDescription")}
            actions={energyEmptyActions}
          />
        ) : (
          energyState.data && <TodayEnergySummary data={energyState.data} />
        )}
      </TodaySectionCard>

      <TodaySectionCard title={t("today.notesSectionTitle")} subtitle={t("today.notesSectionSubtitle")} action={notesAction ?? undefined}>
        {notesState.status === "loading" ? (
          <TodayNotesSkeleton />
        ) : notesState.status === "error" ? (
          <ErrorState
            title={t("today.notesErrorTitle")}
            description={t("today.notesErrorDescription")}
            actions={notesErrorActions}
          />
        ) : notesState.status === "empty" ? (
          <EmptyState
            title={t("today.notesEmptyTitle")}
            description={t("today.notesEmptyDescription")}
            actions={notesEmptyActions}
          />
        ) : (
          notesState.data && <TodayNotesSummary data={notesState.data} />
        )}
      </TodaySectionCard>

      <TodaySectionCard
        title={t("today.shortcutsSectionTitle")}
        subtitle={t("today.shortcutsSectionSubtitle")}
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
      </TodaySectionCard>
    </>
  );
}
