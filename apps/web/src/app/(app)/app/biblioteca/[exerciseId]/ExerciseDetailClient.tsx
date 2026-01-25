"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getExerciseDemoUrl } from "@/lib/exerciseMedia";
import type { Exercise } from "@/lib/types";

type ExerciseDetailClientProps = {
  exercise: Exercise | null;
  error?: string | null;
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
}: ExerciseDetailClientProps) {
  const { t } = useLanguage();
  const [forceImageFallback, setForceImageFallback] = useState(false);
  const [activeTab, setActiveTab] = useState<"execution" | "muscles">("execution");
  if (error || !exercise) {
    return (
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <p className="muted">{error ?? t("library.loadError")}</p>
        <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/biblioteca">
          {t("ui.backToLibrary")}
        </Link>
      </section>
    );
  }

  const { primary, secondary } = getMuscleGroups(exercise);
  const levelLabel = t("library.levelGeneral");
  const primaryLabel = primary[0] ?? t("library.levelGeneral");
  const equipmentLabel = exercise.equipment ?? t("library.equipmentFallback");
  const descriptionText =
    exercise.description ?? t("library.descriptionFallback");
  const techniqueText = exercise.technique ?? t("library.descriptionFallback");
  const tipsText = exercise.tips ?? t("library.descriptionFallback");
  const demoMedia = getExerciseDemoUrl(exercise);
  const demoImageUrl = forceImageFallback ? "/placeholders/exercise-demo.svg" : demoMedia.url;

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
          {t("library.primaryLabel")}: {primary[0] ?? t("library.levelGeneral")}
        </span>
        {secondary.length > 0 ? (
          secondary.map((muscle, index) => (
            <span key={`${muscle}-${index}`} className="badge">
              {t("library.secondaryLabel")}: {muscle}
            </span>
          ))
        ) : (
          <span className="badge">{t("library.secondaryLabel")}: {t("library.secondaryFallback")}</span>
        )}
        <span className="badge">{t("library.levelLabel")}: {levelLabel}</span>
        <span className="badge">{t("library.equipmentLabel")}: {equipmentLabel}</span>
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
          {demoMedia.kind === "video" && !forceImageFallback ? (
            <video
              className="exercise-media-img"
              autoPlay
              loop
              muted
              playsInline
              poster={demoMedia.poster}
              onError={() => setForceImageFallback(true)}
            >
              <source src={demoMedia.url} />
            </video>
          ) : (
            <img
              src={demoImageUrl}
              alt={`${t("library.mediaAlt")} ${exercise.name}`}
              className="exercise-media-img"
              onError={(event) => {
                event.currentTarget.src = "/placeholders/exercise-demo.svg";
              }}
            />
          )}
        </div>

        <div className="feature-card">
          <h3>{t("ui.description")}</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            {descriptionText}
          </p>
        </div>
      </div>

      <div className="tab-list" style={{ marginTop: 20 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "execution" ? "active" : ""}`}
          onClick={() => setActiveTab("execution")}
        >
          {t("exerciseDetail.tabExecution")}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "muscles" ? "active" : ""}`}
          onClick={() => setActiveTab("muscles")}
        >
          {t("exerciseDetail.tabMuscles")}
        </button>
      </div>

      {activeTab === "execution" ? (
        <div className="tab-panel">
          <div className="feature-card">
            <h3>{t("exerciseDetail.executionPrep")}</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              {descriptionText}
            </p>
          </div>
          <div className="feature-card">
            <h3>{t("exerciseDetail.executionMove")}</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              {techniqueText}
            </p>
          </div>
          <div className="feature-card">
            <h3>{t("exerciseDetail.executionTips")}</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              {tipsText}
            </p>
          </div>
        </div>
      ) : (
        <div className="tab-panel">
          <div className="feature-card muscle-map">
            <span className="muted">{t("exerciseDetail.muscleMapPlaceholder")}</span>
          </div>
          <div className="list-grid">
            <div className="feature-card">
              <h3>{t("exerciseDetail.primaryMuscles")}</h3>
              <p className="muted" style={{ marginTop: 8 }}>{primaryLabel}</p>
            </div>
            <div className="feature-card">
              <h3>{t("exerciseDetail.secondaryMuscles")}</h3>
              {secondary.length > 0 ? (
                <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {secondary.map((muscle, index) => (
                    <li key={`${muscle}-${index}`}>{muscle}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted" style={{ marginTop: 8 }}>{t("library.secondaryFallback")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Link className="btn" style={{ width: "fit-content", marginTop: 20 }} href="/app/biblioteca">
        {t("ui.backToLibrary")}
      </Link>
    </section>
  );
}
