"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getExerciseDemoUrl } from "@/lib/exerciseMedia";
import { addExerciseRecent } from "@/lib/exerciseRecents";
import type { Exercise } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Button } from "@/components/ui/Button";
import {
  ExerciseDetailErrorState,
  ExerciseDetailHeader,
  ExerciseDetailSections,
  ExerciseMediaViewer,
  ExerciseDetailEmptyState,
} from "@/components/exercise-library";

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
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);

  useEffect(() => {
    if (exercise) {
      addExerciseRecent(exercise);
    }
  }, [exercise]);
  if (error) {
    return (
      <ExerciseDetailErrorState
        title={t("exerciseDetail.errorTitle")}
        description={error ?? t("library.loadError")}
        actionLabel={t("ui.backToLibrary")}
        actionHref="/app/biblioteca"
      />
    );
  }

  if (!exercise) {
    return (
      <ExerciseDetailEmptyState
        title={t("exerciseDetail.emptyTitle")}
        description={t("exerciseDetail.emptyDescription")}
        actionLabel={t("ui.backToLibrary")}
        actionHref="/app/biblioteca"
      />
    );
  }

  const { primary, secondary } = getMuscleGroups(exercise);
  const levelLabel = t("library.levelGeneral");
  const equipmentLabel = exercise.equipment ?? t("library.equipmentFallback");
  const hasDescription = Boolean(exercise.description);
  const hasTechnique = Boolean(exercise.technique);
  const hasTips = Boolean(exercise.tips);
  const demoMedia = getExerciseDemoUrl(exercise);
  const hasMedia = Boolean(exercise.mediaUrl || exercise.videoUrl || exercise.posterUrl || exercise.imageUrl);
  const demoImageUrl = forceImageFallback ? "/placeholders/exercise-demo.svg" : demoMedia.url;
  const badgeItems = useMemo(
    () => [
      {
        label: t("library.primaryLabel"),
        value: primary[0] ?? t("library.noMuscleData"),
      },
      ...secondary.map((muscle) => ({
        label: t("library.secondaryLabel"),
        value: muscle,
        variant: "muted" as const,
      })),
      {
        label: t("library.levelLabel"),
        value: levelLabel,
      },
      {
        label: t("library.equipmentLabel"),
        value: equipmentLabel,
      },
    ],
    [equipmentLabel, levelLabel, primary, secondary, t]
  );

  return (
    <section className="card centered-card">
      <ExerciseDetailHeader
        title={exercise.name}
        subtitle={t("ui.exerciseGuide")}
        badges={badgeItems}
        actions={
          <ButtonLink variant="secondary" href="/app/biblioteca">
            {t("ui.backToLibrary")}
          </ButtonLink>
        }
      />

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
          <div className="inline-actions-sm">
            {hasMedia ? (
              <Button variant="secondary" size="sm" onClick={() => setIsMediaViewerOpen(true)}>
                {t("exerciseDetail.openMedia")}
              </Button>
            ) : null}
            {!hasMedia ? <p className="muted">{t("library.mediaPlaceholder")}</p> : null}
          </div>
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

      <ExerciseDetailSections
        description={hasDescription ? exercise.description : null}
        technique={hasTechnique ? exercise.technique : null}
        tips={hasTips ? exercise.tips : null}
        primaryMuscles={primary}
        secondaryMuscles={secondary}
        labels={{
          executionTab: t("exerciseDetail.tabExecution"),
          musclesTab: t("exerciseDetail.tabMuscles"),
          executionPrepTitle: t("exerciseDetail.executionPrep"),
          executionMoveTitle: t("exerciseDetail.executionMove"),
          executionTipsTitle: t("exerciseDetail.executionTips"),
          executionEmpty: t("library.noExecutionDetails"),
          muscleMapPlaceholder: t("exerciseDetail.muscleMapPlaceholder"),
          primaryMusclesTitle: t("exerciseDetail.primaryMuscles"),
          secondaryMusclesTitle: t("exerciseDetail.secondaryMuscles"),
          secondaryMusclesEmpty: t("library.secondaryFallback"),
          noMusclesFallback: t("library.noMuscleData"),
        }}
      />

      <ExerciseMediaViewer
        open={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        media={hasMedia ? demoMedia : null}
        title={t("exerciseDetail.mediaViewerTitle")}
        description={t("exerciseDetail.mediaViewerDescription")}
        closeLabel={t("ui.close")}
        mediaAlt={`${t("library.mediaAlt")} ${exercise.name}`}
      />
    </section>
  );
}
