"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getExerciseDemoUrl } from "@/lib/exerciseMedia";
import type { Exercise } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

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
      <section className="card centered-card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Icon name="warning" />
          </div>
          <div>
            <h3 className="m-0">{t("library.errorTitle")}</h3>
            <p className="muted">{error ?? t("library.loadError")}</p>
          </div>
          <ButtonLink href="/app/biblioteca" className="fit-content">
            {t("ui.backToLibrary")}
          </ButtonLink>
        </div>
      </section>
    );
  }

  const { primary, secondary } = getMuscleGroups(exercise);
  const levelLabel = t("library.levelGeneral");
  const primaryLabel = primary[0] ?? t("library.levelGeneral");
  const equipmentLabel = exercise.equipment ?? t("library.equipmentFallback");
  const hasDescription = Boolean(exercise.description);
  const hasTechnique = Boolean(exercise.technique);
  const hasTips = Boolean(exercise.tips);
  const hasExecutionDetails = hasDescription || hasTechnique || hasTips;
  const demoMedia = getExerciseDemoUrl(exercise);
  const hasMedia = Boolean(exercise.mediaUrl || exercise.videoUrl || exercise.posterUrl || exercise.imageUrl);
  const demoImageUrl = forceImageFallback ? "/placeholders/exercise-demo.svg" : demoMedia.url;

  return (
    <section className="card centered-card">
      <div className="page-header">
        <div className="page-header-body">
          <h1 className="section-title">{exercise.name}</h1>
          <p className="section-subtitle">{t("ui.exerciseGuide")}</p>
        </div>
        <div className="page-header-actions">
          <ButtonLink variant="secondary" href="/app/biblioteca">
            {t("ui.backToLibrary")}
          </ButtonLink>
        </div>
      </div>

      <div className="badge-list mt-12">
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

      <div className="exercise-detail-grid">
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
          {!hasMedia ? <p className="muted">{t("library.mediaPlaceholder")}</p> : null}
        </div>

        {hasDescription ? (
          <div className="feature-card">
            <h3>{t("ui.description")}</h3>
            <p className="muted mt-8">
              {exercise.description}
            </p>
          </div>
        ) : null}
      </div>

      <div className="tab-list mt-20">
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
        hasExecutionDetails ? (
          <div className="tab-panel">
            {hasDescription ? (
              <div className="feature-card">
                <h3>{t("exerciseDetail.executionPrep")}</h3>
                <p className="muted mt-8">
                  {exercise.description}
                </p>
              </div>
            ) : null}
            {hasTechnique ? (
              <div className="feature-card">
                <h3>{t("exerciseDetail.executionMove")}</h3>
                <p className="muted mt-8">
                  {exercise.technique}
                </p>
              </div>
            ) : null}
            {hasTips ? (
              <div className="feature-card">
                <h3>{t("exerciseDetail.executionTips")}</h3>
                <p className="muted mt-8">
                  {exercise.tips}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="muted mt-16">
            {t("library.noExecutionDetails")}
          </p>
        )
      ) : (
        <div className="tab-panel">
          <div className="feature-card muscle-map">
            <span className="muted">{t("exerciseDetail.muscleMapPlaceholder")}</span>
          </div>
          <div className="list-grid">
            <div className="feature-card">
              <h3>{t("exerciseDetail.primaryMuscles")}</h3>
              <p className="muted mt-8">{primaryLabel}</p>
            </div>
            <div className="feature-card">
              <h3>{t("exerciseDetail.secondaryMuscles")}</h3>
              {secondary.length > 0 ? (
                <ul className="muted list-muted">
                  {secondary.map((muscle, index) => (
                    <li key={`${muscle}-${index}`}>{muscle}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted mt-8">{t("library.secondaryFallback")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
