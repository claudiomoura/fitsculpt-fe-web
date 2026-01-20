"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getExerciseCoverUrl } from "@/lib/exerciseMedia";
import type { Exercise } from "@/lib/types";

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
  }, [equipmentFilter, muscleFilter, query, t]);

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
      <div className="form-stack">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("library.searchPlaceholder")}
        />
        <label className="form-stack">
          {t("library.equipmentFilterLabel")}
          <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)}>
            {equipmentOptions.map((option) => (
              <option key={option ?? "all"} value={option ?? "all"}>
                {option === "all" ? t("library.allOption") : option}
              </option>
            ))}
          </select>
        </label>
        <label className="form-stack">
          {t("library.muscleFilterLabel")}
          <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)}>
            {muscleOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? t("library.allOption") : option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {t("library.loading")}
        </p>
      ) : error ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : exercises.length === 0 ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {t("library.empty")}
        </p>
      ) : (
        <div className="list-grid" style={{ marginTop: 16 }}>
          {exercises.map((exercise) => {
            const muscles = getExerciseMuscles(exercise);
            const exerciseId = exercise.id;
            const coverUrl = getExerciseCoverUrl(exercise);
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
                      <span key={muscle} className="badge">
                        {muscle}
                      </span>
                    ))
                  ) : (
                    <span className="badge">{t("library.noMuscleData")}</span>
                  )}
                </div>
                <p className="muted">{t("library.equipmentLabel")}: {exercise.equipment ?? t("library.equipmentFallback")}</p>
                <p className="muted">{exercise.description ?? t("library.descriptionFallback")}</p>
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
                className="feature-card"
                style={{ textDecoration: "none" }}
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
