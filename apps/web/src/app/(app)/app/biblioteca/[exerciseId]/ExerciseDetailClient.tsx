"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { addExerciseRecent } from "@/lib/exerciseRecents";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import type { Exercise } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/Button";
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
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [mediaPreviewError, setMediaPreviewError] = useState(false);
  const { favorites, toggleFavorite } = useExerciseFavorites();
  const media = useMemo(() => {
    if (!exercise) return null;
    const videoUrl = exercise.mediaUrl ?? exercise.videoUrl;
    if (videoUrl) {
      return {
        kind: "video" as const,
        url: videoUrl,
        poster: exercise.posterUrl ?? exercise.imageUrl ?? undefined,
      };
    }

    const imageUrl = exercise.imageUrl ?? exercise.posterUrl;
    if (imageUrl) {
      return {
        kind: "image" as const,
        url: imageUrl,
      };
    }

    return null;
  }, [exercise]);

  useEffect(() => {
    if (exercise) {
      addExerciseRecent(exercise);
    }
  }, [exercise]);

  useEffect(() => {
    if (!exercise) return;
    setMediaPreviewError(false);
  }, [exercise?.id, media?.url]);
  if (error) {
    return (
      <ExerciseDetailErrorState
        title={t("exerciseDetail.errorTitle")}
        description={error ?? t("library.loadError")}
        actionLabel={t("ui.backToLibrary")}
        actionHref="/app/biblioteca"
        onRetry={() => window.location.reload()}
        retryLabel={t("ui.retry")}
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
  const hasMedia = Boolean(media);
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
  const isFavorite = Boolean(exercise?.id && favorites.includes(exercise.id));
  const favoriteLabel = isFavorite ? t("library.favoriteRemove") : t("library.favoriteAdd");

  return (
    <section className="card centered-card">
      <ExerciseDetailHeader
        title={exercise.name}
        subtitle={t("ui.exerciseGuide")}
        badges={badgeItems}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={isFavorite}
              aria-label={favoriteLabel}
              onClick={() => {
                if (!exercise.id) return;
                toggleFavorite(exercise.id);
              }}
            >
              {favoriteLabel}
            </Button>
            <ButtonLink variant="secondary" href="/app/biblioteca">
              {t("ui.backToLibrary")}
            </ButtonLink>
          </>
        }
      />

      <div className="exercise-detail-grid">
        <div className="feature-card exercise-media">
          <div className="exercise-media-header">
            <h3>{t("exerciseDetail.mediaSectionTitle")}</h3>
            {hasMedia ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsMediaViewerOpen(true)}
                aria-label={t("exerciseDetail.openMedia")}
              >
                {t("exerciseDetail.openMedia")}
              </Button>
            ) : null}
          </div>
          <div className="exercise-media-preview">
            {hasMedia ? (
              media?.kind === "video" && !mediaPreviewError ? (
                <video
                  className="exercise-media-img"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={media.poster}
                  onError={() => setMediaPreviewError(true)}
                >
                  <source src={media.url} />
                </video>
              ) : media?.kind === "image" && !mediaPreviewError ? (
                <img
                  src={media.url}
                  alt={`${t("library.mediaAlt")} ${exercise.name}`}
                  className="exercise-media-img"
                  onError={() => setMediaPreviewError(true)}
                />
              ) : (
                <div className="exercise-media-fallback">
                  <p className="muted">{t("exerciseDetail.mediaPreviewFallback")}</p>
                </div>
              )
            ) : (
              <div className="exercise-media-fallback">
                <p className="muted">{t("library.mediaPlaceholder")}</p>
              </div>
            )}
          </div>
        </div>
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
        media={media}
        title={t("exerciseDetail.mediaViewerTitle")}
        description={t("exerciseDetail.mediaViewerDescription")}
        closeLabel={t("ui.close")}
        mediaAlt={`${t("library.mediaAlt")} ${exercise.name}`}
        fallbackTitle={t("exerciseDetail.mediaViewerFallbackTitle")}
        fallbackDescription={t("exerciseDetail.mediaViewerFallbackDescription")}
      />
    </section>
  );
}
