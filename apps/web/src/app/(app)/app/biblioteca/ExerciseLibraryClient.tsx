"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Exercise = {
  id: string;
  name: string;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description?: string | null;
};

type ExerciseResponse = {
  items: Exercise[];
};

export default function ExerciseLibraryClient() {
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
          setError("No se pudieron cargar los ejercicios.");
          setExercises([]);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as ExerciseResponse;
        setExercises(data.items ?? []);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("No se pudieron cargar los ejercicios.");
        setExercises([]);
        setLoading(false);
      }
    };

    void loadExercises();
    return () => controller.abort();
  }, [equipmentFilter, muscleFilter, query]);

  const equipmentOptions = useMemo(() => {
    const options = Array.from(new Set(exercises.map((ex) => ex.equipment).filter(Boolean)));
    return ["all", ...options];
  }, [exercises]);

  const muscleOptions = useMemo(() => {
    const all = exercises.flatMap((ex) => [...ex.primaryMuscles, ...ex.secondaryMuscles]);
    const unique = Array.from(new Set(all)).filter(Boolean);
    return ["all", ...unique];
  }, [exercises]);

  return (
    <section className="card">
      <div className="form-stack">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ejercicio o músculo"
        />
        <label className="form-stack">
          Equipamiento
          <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)}>
            {equipmentOptions.map((option) => (
              <option key={option ?? "all"} value={option ?? "all"}>
                {option === "all" ? "Todos" : option}
              </option>
            ))}
          </select>
        </label>
        <label className="form-stack">
          Grupo muscular
          <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)}>
            {muscleOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "Todos" : option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Cargando ejercicios...
        </p>
      ) : error ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : exercises.length === 0 ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Aún no hay ejercicios registrados. Genera un plan de entrenamiento con IA para poblar la biblioteca.
        </p>
      ) : (
        <div className="list-grid" style={{ marginTop: 16 }}>
          {exercises.map((exercise) => {
            const muscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
            return (
              <Link
                key={exercise.id}
                href={`/app/biblioteca/${exercise.id}`}
                className="feature-card"
                style={{ textDecoration: "none" }}
              >
                <h3>{exercise.name}</h3>
                <div className="badge-list">
                  {muscles.length > 0 ? (
                    muscles.map((muscle) => (
                      <span key={muscle} className="badge">
                        {muscle}
                      </span>
                    ))
                  ) : (
                    <span className="badge">Sin datos musculares</span>
                  )}
                </div>
                <p className="muted">Equipamiento: {exercise.equipment ?? "Sin especificar"}</p>
                <p className="muted">{exercise.description ?? "Sin descripción disponible."}</p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
