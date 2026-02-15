"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getExerciseCoverUrl } from "@/lib/exerciseMedia";
import {
  type ExerciseRecent,
  useExerciseRecents,
} from "@/lib/exerciseRecents";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import type { Exercise } from "@/lib/types";
import { fetchExercisesList } from "@/services/exercises";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, SkeletonExerciseList } from "@/components/exercise-library";

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
  const [isClearingRecents, setIsClearingRecents] = useState(false);
  const [selectedForPlan, setSelectedForPlan] = useState<Exercise | ExerciseRecent | null>(null);
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

    const content = (
      <>
        <img
          src={coverUrl}
          alt={`${t("library.mediaAlt")} ${exercise.name}`}
          className="exercise-card-media"
          onError={(event) => {
            event.currentTarget.src = "/placeholders/exercise-cover.svg";
          }}
        />
        <h3>{exercise.name}</h3>
        <div className="badge-list">
          {muscles.length > 0 ? (
            muscles.map((muscle) => (
              <Badge key={muscle}>{muscle}</Badge>
            ))
          ) : (
            <Badge variant="muted">{t("library.noMuscleData")}</Badge>
          )}
        </div>
        <p className="muted">
          {t("library.equipmentLabel")}: {exercise.equipment ?? t("library.equipmentFallback")}
        </p>
        {exercise.description ? <p className="muted">{exercise.description}</p> : null}
      </>
    );

    if (!exerciseId) {
      return (
        <div key={fallbackKey} className="feature-card">
          {content}
          <div className="inline-actions-sm">
            <Button variant="secondary" size="sm" aria-label={addLabel} onClick={() => setSelectedForPlan(exercise)}>
              +
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div key={exerciseId} className="feature-card library-card">
        <Link href={`/app/biblioteca/${exerciseId}`} className="library-card-link">
          {content}
        </Link>
        <div className="inline-actions-sm">
          <Button variant="secondary" size="sm" aria-label={addLabel} onClick={() => setSelectedForPlan(exercise)}>
            +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={isFavorite}
            aria-label={favoriteLabel}
            loading={isFavoritePending}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleFavoriteToggle(exerciseId, isFavorite);
            }}
          >
            {favoriteLabel}
          </Button>
        </div>
      </div>
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
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={Boolean(selectedForPlan)}
        onClose={() => setSelectedForPlan(null)}
        title={t("library.addActionModalTitle")}
        description={selectedForPlan ? t("library.addActionModalDescription", { name: selectedForPlan.name }) : undefined}
        footer={
          <Button variant="secondary" onClick={() => setSelectedForPlan(null)}>
            {t("ui.close")}
          </Button>
        }
      >
        <p className="muted">{t("library.addActionPendingDescription")}</p>
      </Modal>
    </section>
  );
}
