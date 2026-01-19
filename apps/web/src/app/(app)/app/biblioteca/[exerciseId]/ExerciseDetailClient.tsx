"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import type { Exercise } from "@/lib/types";

type ExerciseDetailClientProps = {
  exercise: Exercise | null;
  error?: string | null;
  mediaUrl?: string | null;
  hasMedia?: boolean;
};

type MuscleGroups = {
  primary: string[];
  secondary: string[];
};

function getMuscleGroups(exercise: Exercise): MuscleGroups {
  const primaryFromMain = exercise.mainMuscleGroup ? [exercise.mainMuscleGroup] : [];
  const primaryFromLegacy = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
  const secondaryFromMain = Array.isArray(exercise.secondaryMuscleGroups) ? exercise.secondaryMuscleGroups : [];
  const secondaryFromLegacy = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];

  return {
    primary: [...primaryFromMain, ...primaryFromLegacy].filter(Boolean),
    secondary: [...secondaryFromMain, ...secondaryFromLegacy].filter(Boolean),
  };
}

export default function ExerciseDetailClient({
  exercise,
  error,
  mediaUrl,
  hasMedia = false,
}: ExerciseDetailClientProps) {
  const { t } = useLanguage();
  if (error || !exercise) {
    return (
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <p className="muted">{error ?? "No se pudo cargar el ejercicio."}</p>
        <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/biblioteca">
          {t("ui.backToLibrary")}
        </Link>
      </section>
    );
  }

  const { primary, secondary } = getMuscleGroups(exercise);
  const levelLabel = "General";
  const equipmentLabel = exercise.equipment ?? "Sin especificar";
  const descriptionText =
    exercise.description ?? "Pronto añadiremos la explicación paso a paso.";
  const techniqueText = exercise.technique ?? "Pronto añadiremos la explicación paso a paso.";
  const tipsText = exercise.tips ?? "Pronto añadiremos la explicación paso a paso.";

  return (
    <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="form-stack">
        <h1 className="section-title" style={{ fontSize: 28 }}>
          {exercise.name}
        </h1>
        <p className="section-subtitle">{t("ui.exerciseGuide")}</p>
      </div>

      <div className="badge-list" style={{ marginTop: 12 }}>
        <span className="badge">
          Principal: {primary[0] ?? "General"}
        </span>
        {secondary.length > 0 ? (
          secondary.map((muscle) => (
            <span key={muscle} className="badge">
              Secundario: {muscle}
            </span>
          ))
        ) : (
          <span className="badge">Secundarios: Sin definir</span>
        )}
        <span className="badge">Nivel: {levelLabel}</span>
        <span className="badge">Equipamiento: {equipmentLabel}</span>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div className="feature-card exercise-media">
          {hasMedia && mediaUrl ? (
            <img
              src={mediaUrl}
              alt={`Demostración del ejercicio ${exercise.name}`}
              className="exercise-media-img"
            />
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Aquí irá el modelo 3D / GIF del ejercicio, como en FitnessAI.
            </p>
          )}
          {/* Para activar el GIF, sube el archivo en /public/exercises con el slug del ejercicio.
              Ejemplo: "elevaciones-de-talones.gif" para "Elevaciones de talones". */}
        </div>

        <div className="feature-card">
          <h3>{t("ui.description")}</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            {descriptionText}
          </p>
        </div>
      </div>

      <div className="list-grid" style={{ marginTop: 16 }}>
        <div className="feature-card">
          <h3>{t("ui.technique")}</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            {techniqueText}
          </p>
        </div>
        <div className="feature-card">
          <h3>{t("ui.tips")}</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            {tipsText}
          </p>
        </div>
      </div>

      <Link className="btn" style={{ width: "fit-content", marginTop: 20 }} href="/app/biblioteca">
        {t("ui.backToLibrary")}
      </Link>
    </section>
  );
}
