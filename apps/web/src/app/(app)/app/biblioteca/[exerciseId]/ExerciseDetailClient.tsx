"use client";

import { useEffect, useMemo, useState } from "react";

type ExerciseDetail = {
  id: string;
  name: string;
  equipment?: string | null;
  mainMuscleGroup?: string | null;
  secondaryMuscleGroups?: string[] | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  description?: string | null;
};

function getExerciseMuscles(exercise: ExerciseDetail) {
  const main = exercise.mainMuscleGroup ? [exercise.mainMuscleGroup] : [];
  const secondary = Array.isArray(exercise.secondaryMuscleGroups) ? exercise.secondaryMuscleGroups : [];
  const legacyPrimary = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
  const legacySecondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
  return [...main, ...secondary, ...legacyPrimary, ...legacySecondary].filter(Boolean);
}

export default function ExerciseDetailClient({ exerciseId }: { exerciseId: string }) {
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadExercise = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/exercises/${exerciseId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError("No se pudo cargar el ejercicio.");
          setExercise(null);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as ExerciseDetail;
        setExercise(data);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("No se pudo cargar el ejercicio.");
        setExercise(null);
        setLoading(false);
      }
    };

    void loadExercise();
    return () => controller.abort();
  }, [exerciseId]);

  const fallbackSteps = useMemo(
    () => [
      "Colócate en la posición inicial con postura estable.",
      "Ejecuta el movimiento principal de forma controlada.",
      "Mantén la respiración constante y el core activado.",
      "Regresa a la posición inicial sin perder la técnica.",
    ],
    []
  );

  const fallbackTips = useMemo(
    () => [
      "Mantén la espalda neutra en todo momento.",
      "Evita balanceos o movimientos bruscos.",
      "Ajusta la carga para completar todas las repeticiones con buena forma.",
    ],
    []
  );

  const fallbackMistakes = useMemo(
    () => [
      "Curvar la espalda o perder el control postural.",
      "Bloquear las articulaciones al final del movimiento.",
      "Usar impulso en lugar de fuerza controlada.",
    ],
    []
  );

  if (loading) {
    return (
      <section className="card">
        <p className="muted">Cargando detalle del ejercicio...</p>
      </section>
    );
  }

  if (error || !exercise) {
    return (
      <section className="card">
        <p className="muted">{error ?? "Ejercicio no encontrado."}</p>
      </section>
    );
  }

  const muscles = getExerciseMuscles(exercise);

  return (
    <section className="card" style={{ maxWidth: 860, margin: "0 auto" }}>
      <div className="form-stack">
        <h1 className="section-title">{exercise.name}</h1>
        <p className="section-subtitle">
          {exercise.description ?? "Guía técnica con foco en seguridad y control."}
        </p>
      </div>

      <div className="badge-list" style={{ marginTop: 12 }}>
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

      <p className="muted" style={{ marginTop: 8 }}>
        Equipamiento: {exercise.equipment ?? "Sin especificar"}
      </p>

      <div
        className="card"
        style={{
          marginTop: 20,
          background: "rgba(255,255,255,0.03)",
          borderStyle: "dashed",
        }}
      >
        <p className="muted" style={{ textAlign: "center" }}>
          Espacio reservado para vídeo o imagen del ejercicio.
        </p>
      </div>

      <div className="list-grid" style={{ marginTop: 20 }}>
        <div className="feature-card">
          <h3>Cómo hacerlo</h3>
          <ul className="muted" style={{ marginTop: 8 }}>
            {fallbackSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
        <div className="feature-card">
          <h3>Consejos de técnica</h3>
          <ul className="muted" style={{ marginTop: 8 }}>
            {fallbackTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <div className="feature-card">
          <h3>Errores comunes</h3>
          <ul className="muted" style={{ marginTop: 8 }}>
            {fallbackMistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
