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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, SkeletonExerciseList } from "@/components/exercise-library";

type ExerciseResponse = {
  items: Exercise[];
};

function getExerciseMuscles(exercise: Exercise | ExerciseRecent) {
  const main = exercise.mainMuscleGroup ? [exercise.mainMuscleGroup] : [];
  const secondary = Array.isArray(exercise.secondaryMuscleGroups) ? exercise.secondaryMuscleGroups : [];
  const legacyPrimary = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
  const legacySecondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
  return [...main, ...secondary, ...legacyPrimary, ...legacySecondary].filter(Boolean);
}

export default function ExerciseLibraryClient() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<string[]>([]);
  const [isClearingRecents, setIsClearingRecents] = useState(false);
  const { notify } = useToast();

  const handleResetFilters = () => {
    setQuery("");
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
    const controller = new AbortController();
    const loadExercises = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        if (equipmentFilter !== "all") params.set("equipment", equipmentFilter);
        if (muscleFilter !== "all") params.set("muscle", muscleFilter);
        params.set("limit", "200");
        const response = await fetch(`/api/exercises?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t("library.loadErrorList"));
          setExercises([]);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as ExerciseResponse;
        setExercises(data.items ?? []);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t("library.loadErrorList"));
        setExercises([]);
        setLoading(false);
      }
    };

    void loadExercises();
    return () => controller.abort();
  }, [equipmentFilter, muscleFilter, query, retryKey, t]);

  const equipmentOptions = useMemo(() => {
    const options = Array.from(new Set(exercises.map((ex) => ex.equipment).filter(Boolean)));
    return ["all", ...options];
  }, [exercises]);

  const muscleOptions = useMemo(() => {
    const all = exercises.flatMap((ex) => getExerciseMuscles(ex));
    const unique = Array.from(new Set(all)).filter(Boolean);
    return ["all", ...unique];
  }, [exercises]);

  const favoriteExercises = useMemo(
    () => exercises.filter((exercise) => Boolean(exercise.id && favorites.includes(exercise.id))),
    [exercises, favorites]
  );

  const renderExerciseCard = (exercise: Exercise | ExerciseRecent) => {
    const muscles = getExerciseMuscles(exercise);
    const exerciseId = exercise.id;
    const coverUrl = getExerciseCoverUrl(exercise) || "/placeholders/exercise-cover.svg";
    const isFavorite = Boolean(exerciseId && favorites.includes(exerciseId));
    const isFavoritePending = Boolean(exerciseId && pendingFavoriteIds.includes(exerciseId));
    const favoriteLabel = isFavorite ? t("library.favoriteRemove") : t("library.favoriteAdd");
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
        <div key={exercise.name} className="feature-card">
          {content}
        </div>
      );
    }

    return (
      <div key={exerciseId} className="feature-card library-card">
        <Link href={`/app/biblioteca/${exerciseId}`} className="library-card-link">
          {content}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="library-favorite-button"
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
          helperText={t("library.searchHelper")}
        />
        <div className="filter-grid">
          <label className="ui-input-field">
            <span className="ui-input-label">{t("library.equipmentFilterLabel")}</span>
            <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="ui-input">
              {equipmentOptions.map((option) => (
                <option key={option ?? "all"} value={option ?? "all"}>
                  {option === "all" ? t("library.allOption") : option}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-input-field">
            <span className="ui-input-label">{t("library.muscleFilterLabel")}</span>
            <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)} className="ui-input">
              {muscleOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? t("library.allOption") : option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="library-filter-actions">
          <Badge variant="muted">{t("library.filtersActive")}</Badge>
          <Badge>
            {t("library.filterEquipmentLabel")}{" "}
            {equipmentFilter === "all" ? t("library.allOption") : equipmentFilter}
          </Badge>
          <Badge>
            {t("library.filterMuscleLabel")}{" "}
            {muscleFilter === "all" ? t("library.allOption") : muscleFilter}
          </Badge>
        </div>
      </div>

      <div className="library-section mt-16">
        <div className="library-section-header">
          {favoritesLoading ? (
            <Skeleton variant="line" className="w-30" />
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
              {favoriteExercises.map((exercise) => renderExerciseCard(exercise))}
            </div>
          )}
        </div>
      </div>

      <div className="library-section mt-16">
        <div className="library-section-header">
          {recentsLoading ? (
            <Skeleton variant="line" className="w-25" />
          ) : (
            <h3 className="m-0">{t("library.recentsTitle")}</h3>
          )}
          {recentsLoading ? (
            <Skeleton variant="line" className="w-20" />
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
              {recents.map((exercise) => renderExerciseCard(exercise))}
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
          description={t("library.empty")}
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
        <div className="list-grid mt-16">
          {exercises.map((exercise) => renderExerciseCard(exercise))}
        </div>
      )}
    </section>
  );
}
