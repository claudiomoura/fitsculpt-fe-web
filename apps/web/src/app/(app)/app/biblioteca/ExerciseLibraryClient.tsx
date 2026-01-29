"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getExerciseCoverUrl } from "@/lib/exerciseMedia";
import type { Exercise } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";

type ExerciseResponse = {
  items: Exercise[];
};

function getExerciseMuscles(exercise: Exercise) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const handleResetFilters = () => {
    setQuery("");
    setEquipmentFilter("all");
    setMuscleFilter("all");
    setError(null);
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

      {loading ? (
        <div className="list-grid mt-16">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : error ? (
        <div className="empty-state mt-16">
          <div className="empty-state-icon">
            <Icon name="warning" />
          </div>
          <div>
            <h3 className="m-0">{t("library.errorTitle")}</h3>
            <p className="muted">{error}</p>
          </div>
          <Button variant="secondary" onClick={() => setRetryKey((prev) => prev + 1)}>
            {t("ui.retry")}
          </Button>
        </div>
      ) : exercises.length === 0 ? (
        <div className="empty-state mt-16">
          <div className="empty-state-icon">
            <Icon name="book" />
          </div>
          <div>
            <h3 className="m-0">{t("library.emptyTitle")}</h3>
            <p className="muted">{t("library.empty")}</p>
          </div>
          <div className="empty-state-actions">
            <Button variant="secondary" onClick={handleResetFilters}>
              {t("library.resetFilters")}
            </Button>
            <Button onClick={() => setRetryKey((prev) => prev + 1)}>
              {t("library.retrySearch")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="list-grid mt-16">
          {exercises.map((exercise) => {
            const muscles = getExerciseMuscles(exercise);
            const exerciseId = exercise.id;
            const coverUrl = getExerciseCoverUrl(exercise) || "/placeholders/exercise-cover.svg";
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
              <Link
                key={exerciseId}
                href={`/app/biblioteca/${exerciseId}`}
                className="feature-card library-card"
              >
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
