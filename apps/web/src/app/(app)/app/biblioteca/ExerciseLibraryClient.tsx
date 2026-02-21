"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getExerciseCoverUrl } from "@/lib/exerciseMedia";
import {
  type ExerciseRecent,
  useExerciseRecents,
} from "@/lib/exerciseRecents";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import type { Exercise, TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, ExerciseCard, SkeletonExerciseList } from "@/components/exercise-library";
import AddExerciseDayPickerModal from "@/components/training-plan/AddExerciseDayPickerModal";
import { fetchExercisesList } from "@/services/exercises";

const PAGE_SIZE = 24;

function getExerciseMuscles(exercise: Exercise | ExerciseRecent) {
  const main = exercise.mainMuscleGroup ? [exercise.mainMuscleGroup] : [];
  const secondary = Array.isArray(exercise.secondaryMuscleGroups) ? exercise.secondaryMuscleGroups : [];
  const legacyPrimary = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
  const legacySecondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];

  const raw = [...main, ...secondary, ...legacyPrimary, ...legacySecondary]
    .filter((muscle): muscle is string => typeof muscle === "string")
    .map((muscle) => muscle.trim())
    .filter((muscle) => muscle.length > 0);

  return Array.from(new Set(raw));
}

export default function ExerciseLibraryClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const athleteUserId = searchParams.get("athleteUserId")?.trim() || "";
  const detailParams = useMemo(() => {
    const params = new URLSearchParams();
    if (athleteUserId) {
      params.set("athleteUserId", athleteUserId);
    }
    params.set("from", "plan");
    const returnTo = athleteUserId ? `/app/trainer/clients/${athleteUserId}` : "/app/entrenamiento";
    params.set("returnTo", returnTo);
    return params.toString();
  }, [athleteUserId]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<string[]>([]);
  const [muscleOptions, setMuscleOptions] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<string[]>([]);
  const infiniteScrollRef = useRef<HTMLDivElement | null>(null);
  const [isClearingRecents, setIsClearingRecents] = useState(false);
  const {
    recents,
    clearRecents,
    loading: recentsLoading,
    hasError: recentsError,
    refresh: refreshRecents,
  } = useExerciseRecents();
  const {
    favorites,
    toggleFavorite,
    loading: favoritesLoading,
    hasError: favoritesError,
    refresh: refreshFavorites,
  } = useExerciseFavorites();
  const [targetPlans, setTargetPlans] = useState<TrainingPlanDetail[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planRetryKey, setPlanRetryKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingExercise, setPendingExercise] = useState<Exercise | ExerciseRecent | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const { notify } = useToast();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setActivePage(1);
  }, [debouncedQuery, equipmentFilter, muscleFilter, retryKey]);

  useEffect(() => {
    const controller = new AbortController();
    const equipment = equipmentFilter === "all" ? undefined : equipmentFilter;
    const muscle = muscleFilter === "all" ? undefined : muscleFilter;

    const loadExercises = async () => {
      try {
        setError(null);
        if (activePage === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const result = await fetchExercisesList(
          {
            query: debouncedQuery,
            equipment,
            muscle,
            page: activePage,
            limit: PAGE_SIZE,
          },
          controller.signal
        );

        setHasMore(result.hasMore);
        setEquipmentOptions(result.filters.equipment);
        setMuscleOptions(result.filters.primaryMuscle);
        setExercises((prev) => {
          if (activePage === 1) return result.items;
          const seen = new Set(prev.map((item) => item.id));
          const incoming = result.items.filter((item) => item.id && !seen.has(item.id));
          return [...prev, ...incoming];
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t("library.loadErrorList"));
        if (activePage === 1) {
          setExercises([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    void loadExercises();
    return () => controller.abort();
  }, [activePage, debouncedQuery, equipmentFilter, muscleFilter, retryKey, t]);

  useEffect(() => {
    if (equipmentFilter === "all") return;
    if (!equipmentOptions.includes(equipmentFilter)) {
      setEquipmentFilter("all");
    }
  }, [equipmentFilter, equipmentOptions]);

  useEffect(() => {
    if (muscleFilter === "all") return;
    if (!muscleOptions.includes(muscleFilter)) {
      setMuscleFilter("all");
    }
  }, [muscleFilter, muscleOptions]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const element = infiniteScrollRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const shouldLoad = entries.some((entry) => entry.isIntersecting);
        if (!shouldLoad) return;
        setActivePage((prev) => prev + 1);
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  const handleResetFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setEquipmentFilter("all");
    setMuscleFilter("all");
    setError(null);
  };

  const handleFavoriteToggle = (exerciseId: string, isFavorite: boolean) => {
    if (!exerciseId || pendingFavoriteIds.includes(exerciseId)) return;
    setPendingFavoriteIds((prev) => [...prev, exerciseId]);
    toggleFavorite(exerciseId);
    notify({
      title: isFavorite ? t("library.favoriteRemovedToastTitle") : t("library.favoriteAddedToastTitle"),
      description: t("library.favoriteToastDescription"),
      variant: "success",
    });
    window.setTimeout(() => {
      setPendingFavoriteIds((prev) => prev.filter((id) => id !== exerciseId));
    }, 400);
  };

  const handleClearRecents = () => {
    if (isClearingRecents) return;
    setIsClearingRecents(true);
    clearRecents();
    notify({
      title: t("library.recentsClearedToastTitle"),
      description: t("library.recentsClearedToastDescription"),
      variant: "success",
    });
    window.setTimeout(() => setIsClearingRecents(false), 400);
  };

  useEffect(() => {
    let active = true;

    const loadTargetPlan = async () => {
      setPlansLoading(true);
      setPlansError(null);
      setTargetPlans([]);

      try {
        if (athleteUserId) {
          const assignmentResponse = await fetch(`/api/trainer/clients/${athleteUserId}/assigned-plan`, {
            cache: "no-store",
            credentials: "include",
          });
          if (!assignmentResponse.ok) {
            throw new Error("ASSIGNMENT_ERROR");
          }

          const assignmentData = (await assignmentResponse.json()) as { assignedPlan?: { id?: string } | null };
          const assignedPlanId = assignmentData.assignedPlan?.id;

          if (!assignedPlanId) {
            if (!active) return;
            setPlansLoading(false);
            return;
          }

          const detailResponse = await fetch(`/api/training-plans/${assignedPlanId}`, {
            cache: "no-store",
            credentials: "include",
          });

          if (!detailResponse.ok) {
            throw new Error("PLAN_DETAIL_ERROR");
          }

          const detail = (await detailResponse.json()) as TrainingPlanDetail;
          if (!active) return;
          setTargetPlans([detail]);
          setPlansLoading(false);
          return;
        }

        const listResponse = await fetch("/api/training-plans?limit=20", {
          cache: "no-store",
          credentials: "include",
        });
        if (!listResponse.ok) {
          throw new Error("PLAN_LIST_ERROR");
        }

        const listData = (await listResponse.json()) as { items?: TrainingPlanListItem[] };
        const planIds = (listData.items ?? []).map((item) => item.id).filter(Boolean);

        if (planIds.length === 0) {
          if (!active) return;
          setPlansLoading(false);
          return;
        }

        const details = await Promise.all(
          planIds.map(async (planId) => {
            const detailResponse = await fetch(`/api/training-plans/${planId}`, {
              cache: "no-store",
              credentials: "include",
            });
            if (!detailResponse.ok) return null;
            return (await detailResponse.json()) as TrainingPlanDetail;
          })
        );

        if (!active) return;
        setTargetPlans(details.filter((detail): detail is TrainingPlanDetail => detail !== null));
        setPlansLoading(false);
      } catch (_err) {
        if (!active) return;
        setPlansError(t("library.addToPlansLoadError"));
        setPlansLoading(false);
      }
    };

    void loadTargetPlan();
    return () => {
      active = false;
    };
  }, [athleteUserId, planRetryKey, t]);

  const openDayPicker = (exercise: Exercise | ExerciseRecent) => {
    setPendingExercise(exercise);
    setAddExerciseError(null);
    setPickerOpen(true);
  };

  const addExerciseToPlans = async (planIds: string[]) => {
    if (!pendingExercise?.id || planIds.length === 0 || addingExercise) return;

    setAddingExercise(true);
    setAddExerciseError(null);
    try {
      const plansById = new Map(targetPlans.map((plan) => [plan.id, plan]));
      const selectedPlans = planIds
        .map((planId) => plansById.get(planId))
        .filter((plan): plan is TrainingPlanDetail => Boolean(plan));

      if (selectedPlans.length === 0) {
        setAddingExercise(false);
        setAddExerciseError(t("library.addToPlansSubmitError"));
        return;
      }

      const responses = await Promise.all(
        selectedPlans.map(async (plan) => {
          const dayId = plan.days?.[0]?.id;
          if (!dayId) return false;

          const response = await fetch(`/api/training-plans/${plan.id}/days/${dayId}/exercises`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            cache: "no-store",
            body: JSON.stringify({
              exerciseId: pendingExercise.id,
              ...(athleteUserId ? { athleteUserId } : {}),
            }),
          });

          return response.ok;
        })
      );

      setAddingExercise(false);

      if (responses.some((ok) => !ok)) {
        setAddExerciseError(t("library.addToPlansSubmitError"));
        return;
      }

      notify({
        title: t("library.addToPlansSuccessTitle"),
        description: t("library.addToPlansSuccessDescription")
          .replace("{exercise}", pendingExercise.name)
          .replace("{count}", String(selectedPlans.length)),
        variant: "success",
      });
      setPickerOpen(false);
      setPendingExercise(null);
    } catch (_err) {
      setAddingExercise(false);
      setAddExerciseError(t("library.addToPlansSubmitError"));
    }
  };

  const favoriteExercises = useMemo(
    () => exercises.filter((exercise) => Boolean(exercise.id && favorites.includes(exercise.id))),
    [exercises, favorites]
  );

  const hasAvailableFilters = equipmentOptions.length > 0 || muscleOptions.length > 0;

  const renderExerciseCard = (exercise: Exercise | ExerciseRecent, fallbackKey: string) => {
    const muscles = getExerciseMuscles(exercise);
    const exerciseId = exercise.id;
    const coverUrl = getExerciseCoverUrl(exercise) || "/placeholders/exercise-cover.svg";
    const isFavorite = Boolean(exerciseId && favorites.includes(exerciseId));
    const isFavoritePending = Boolean(exerciseId && pendingFavoriteIds.includes(exerciseId));
    const favoriteLabel = isFavorite ? t("library.favoriteRemove") : t("library.favoriteAdd");
    const addLabel = t("library.addActionLabel");

    return (
      <ExerciseCard
        key={exerciseId || fallbackKey}
        id={exerciseId}
        name={exercise.name}
        href={exerciseId ? `/app/biblioteca/${exerciseId}?${detailParams}` : undefined}
        coverUrl={coverUrl}
        mediaAltPrefix={t("library.mediaAlt")}
        muscles={muscles}
        noMuscleDataLabel={t("library.noMuscleData")}
        equipmentLabel={t("library.equipmentLabel")}
        equipmentValue={exercise.equipment ?? t("library.equipmentFallback")}
        description={exercise.description}
        favoriteLabel={favoriteLabel}
        addLabel={addLabel}
        isFavorite={isFavorite}
        isFavoritePending={isFavoritePending}
        onFavoriteToggle={exerciseId ? () => handleFavoriteToggle(exerciseId, isFavorite) : undefined}
        onAdd={() => openDayPicker(exercise)}
      />
    );
  };

  const showFavoritesEmpty = !favoritesLoading && !favoritesError && favoriteExercises.length === 0;
  const showRecentsEmpty = !recentsLoading && !recentsError && recents.length === 0;

  return (
    <section className="card">
      <div className="library-search">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("library.searchPlaceholder")}
          label={t("library.searchLabel")}
          helperText={t("library.searchDebounceHelper")}
        />

        {hasAvailableFilters ? (
          <>
            <div className="filter-grid">
              {equipmentOptions.length > 0 ? (
                <label className="ui-input-field">
                  <span className="ui-input-label">{t("library.equipmentFilterLabel")}</span>
                  <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="ui-input">
                    <option value="all">{t("library.allOption")}</option>
                    {equipmentOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {muscleOptions.length > 0 ? (
                <label className="ui-input-field">
                  <span className="ui-input-label">{t("library.muscleFilterLabel")}</span>
                  <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)} className="ui-input">
                    <option value="all">{t("library.allOption")}</option>
                    {muscleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="library-filter-actions">
              <Badge variant="muted">{t("library.filtersActive")}</Badge>
              {equipmentOptions.length > 0 ? (
                <Badge>
                  {t("library.filterEquipmentLabel")} {equipmentFilter === "all" ? t("library.allOption") : equipmentFilter}
                </Badge>
              ) : null}
              {muscleOptions.length > 0 ? (
                <Badge>
                  {t("library.filterMuscleLabel")} {muscleFilter === "all" ? t("library.allOption") : muscleFilter}
                </Badge>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="library-section mt-16">
        <div className="library-section-header">
          {favoritesLoading ? (
            <Skeleton variant="line" className="w-40" />
          ) : (
            <h3 className="m-0">{t("library.favoritesTitle")}</h3>
          )}
        </div>
        <div className="library-section-body">
          {favoritesLoading ? (
            <SkeletonExerciseList count={2} className="mt-12" />
          ) : favoritesError ? (
            <div className="library-section-empty">
              <ErrorState
                title={t("library.favoritesErrorTitle")}
                description={t("library.favoritesErrorDescription")}
                actions={[
                  {
                    label: t("ui.retry"),
                    onClick: refreshFavorites,
                    variant: "secondary",
                  },
                ]}
              />
            </div>
          ) : showFavoritesEmpty ? (
            <div className="library-section-empty">
              <EmptyState
                title={t("library.favoritesEmptyTitle")}
                description={t("library.favoritesEmptyDescription")}
                icon="sparkles"
              />
            </div>
          ) : (
            <div className="list-grid mt-12">
              {favoriteExercises.map((exercise, index) => renderExerciseCard(exercise, `favorite:${exercise.id ?? exercise.name}:${index}`))}
            </div>
          )}
        </div>
      </div>

      <div className="library-section mt-16">
        <div className="library-section-header">
          {recentsLoading ? (
            <Skeleton variant="line" className="w-40" />
          ) : (
            <h3 className="m-0">{t("library.recentsTitle")}</h3>
          )}
          {recentsLoading ? (
            <Skeleton variant="line" className="w-45" />
          ) : recentsError ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearRecents}
              disabled={recents.length === 0}
              loading={isClearingRecents}
            >
              {t("library.recentsClear")}
            </Button>
          )}
        </div>
        <div className="library-section-body">
          {recentsLoading ? (
            <SkeletonExerciseList count={2} className="mt-12" />
          ) : recentsError ? (
            <div className="library-section-empty">
              <ErrorState
                title={t("library.recentsErrorTitle")}
                description={t("library.recentsErrorDescription")}
                actions={[
                  {
                    label: t("ui.retry"),
                    onClick: refreshRecents,
                    variant: "secondary",
                  },
                ]}
              />
            </div>
          ) : showRecentsEmpty ? (
            <div className="library-section-empty">
              <EmptyState
                title={t("library.recentsEmptyTitle")}
                description={t("library.recentsEmptyDescription")}
                icon="dumbbell"
              />
            </div>
          ) : (
            <div className="list-grid mt-12">
              {recents.map((exercise, index) => renderExerciseCard(exercise, `recent:${exercise.id ?? exercise.name}:${index}`))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonExerciseList className="mt-16" />
      ) : error ? (
        <ErrorState
          title={t("library.errorTitle")}
          description={error}
          actions={[
            {
              label: t("ui.retry"),
              onClick: () => setRetryKey((prev) => prev + 1),
              variant: "secondary",
            },
          ]}
          className="mt-16"
        />
      ) : exercises.length === 0 ? (
        <EmptyState
          title={t("library.emptyTitle")}
          description={t("library.emptyTryAnotherSearch")}
          icon="book"
          actions={[
            {
              label: t("library.resetFilters"),
              onClick: handleResetFilters,
              variant: "secondary",
            },
            {
              label: t("library.retrySearch"),
              onClick: () => setRetryKey((prev) => prev + 1),
            },
          ]}
          className="mt-16"
        />
      ) : (
        <>
          <div className="list-grid mt-16">
            {exercises.map((exercise, index) => renderExerciseCard(exercise, `exercise:${exercise.id ?? exercise.name}:${index}`))}
          </div>
          {loadingMore ? <SkeletonExerciseList className="mt-12" count={2} /> : null}
          {hasMore ? (
            <div className="inline-actions mt-16">
              <Button variant="secondary" onClick={() => setActivePage((prev) => prev + 1)} loading={loadingMore}>
                {t("library.loadMore")}
              </Button>
              <div ref={infiniteScrollRef} aria-hidden="true" className="library-infinite-scroll-sentinel" />
            </div>
          ) : null}
        </>
      )}

      <AddExerciseDayPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPendingExercise(null);
          setAddExerciseError(null);
        }}
        exerciseName={pendingExercise?.name ?? t("training.exerciseLabel")}
        plans={targetPlans.map((plan) => ({ id: plan.id, title: plan.title, daysCount: plan.days.length }))}
        loadingPlans={plansLoading}
        loadError={plansError}
        isSubmitting={addingExercise}
        submitError={addExerciseError}
        canSubmit={targetPlans.some((plan) => (plan.days?.length ?? 0) > 0)}
        allowMultiSelect
        onConfirm={addExerciseToPlans}
        onRetryLoad={() => setPlanRetryKey((prev) => prev + 1)}
        emptyCtaHref={athleteUserId ? `/app/trainer/clients/${athleteUserId}` : "/app/entrenamiento"}
      />
    </section>
  );
}
