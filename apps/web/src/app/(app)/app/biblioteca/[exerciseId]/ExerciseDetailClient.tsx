"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { addExerciseRecent } from "@/lib/exerciseRecents";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import type { Exercise } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
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
  errorTitle?: string | null;
};

type MuscleGroups = {
  primary: string[];
  secondary: string[];
};

type ExerciseOverviewItem = {
  label: string;
  value: string;
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
  errorTitle,
}: ExerciseDetailClientProps) {
  const { t } = useLanguage();
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [mediaPreviewError, setMediaPreviewError] = useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const { favorites, toggleFavorite } = useExerciseFavorites();
  const { notify } = useToast();
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
        title={errorTitle ?? t("exerciseDetail.errorTitle")}
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
  const equipmentLabel = exercise.equipment ?? null;
  const hasDescription = Boolean(exercise.description);
  const hasTechnique = Boolean(exercise.technique);
  const hasTips = Boolean(exercise.tips);
  const hasMedia = Boolean(media);
  const hasPrimaryMuscles = primary.length > 0;
  const hasSecondaryMuscles = secondary.length > 0;
  const badgeItems = useMemo(
    () => [
      {
        label: t("library.primaryLabel"),
        value: primary[0] ?? null,
      },
      ...secondary.map((muscle) => ({
        label: t("library.secondaryLabel"),
        value: muscle,
        variant: "muted" as const,
      })),
    ],
    [primary, secondary, t]
  );
  const overviewItems = useMemo<ExerciseOverviewItem[]>(() => {
    const items: ExerciseOverviewItem[] = [];
    if (equipmentLabel) {
      items.push({
        label: t("library.equipmentLabel"),
        value: equipmentLabel,
      });
    }
    if (hasPrimaryMuscles) {
      items.push({
        label: t("exerciseDetail.primaryMuscles"),
        value: primary.join(", "),
      });
    }
    if (hasSecondaryMuscles) {
      items.push({
        label: t("exerciseDetail.secondaryMuscles"),
        value: secondary.join(", "),
      });
    }
    return items;
  }, [equipmentLabel, hasPrimaryMuscles, hasSecondaryMuscles, primary, secondary, t]);
  const isFavorite = Boolean(exercise?.id && favorites.includes(exercise.id));
  const favoriteLabel = isFavorite ? t("library.favoriteRemove") : t("library.favoriteAdd");
  const handleFavoriteToggle = () => {
    if (!exercise?.id || isFavoritePending) return;
    setIsFavoritePending(true);
    toggleFavorite(exercise.id);
    notify({
      title: isFavorite ? t("library.favoriteRemovedToastTitle") : t("library.favoriteAddedToastTitle"),
      description: t("library.favoriteToastDescription"),
      variant: "success",
    });
    window.setTimeout(() => setIsFavoritePending(false), 400);
  };

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
              loading={isFavoritePending}
              disabled={!exercise.id}
              onClick={handleFavoriteToggle}
            >
              {favoriteLabel}
            </Button>
            <ButtonLink variant="secondary" href="/app/biblioteca">
              {t("ui.backToLibrary")}
            </ButtonLink>
          </>
        }
      />

      {overviewItems.length > 0 ? (
        <div className="exercise-detail-overview">
          <h2 className="section-title">{t("exerciseDetail.summaryTitle")}</h2>
          <div className="info-grid mt-16">
            {overviewItems.map((item) => (
              <div key={item.label} className="info-item">
                <p className="info-label">{item.label}</p>
                <p className="info-value">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasMedia ? (
        <div className="exercise-detail-grid">
          <div className="feature-card exercise-media">
            <div className="exercise-media-header">
              <h3>{t("exerciseDetail.mediaSectionTitle")}</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsMediaViewerOpen(true)}
                aria-label={`${t("exerciseDetail.openMedia")} ${exercise.name}`}
              >
                {t("exerciseDetail.openMedia")}
              </Button>
            </div>
            <div className="exercise-media-preview">
              <button
                type="button"
                className="exercise-media-preview-button"
                onClick={() => setIsMediaViewerOpen(true)}
                aria-label={`${t("exerciseDetail.openMedia")} ${exercise.name}`}
              >
                {media?.kind === "video" && !mediaPreviewError ? (
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
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ExerciseDetailSections
        description={hasDescription ? exercise.description : null}
        technique={hasTechnique ? exercise.technique : null}
        tips={hasTips ? exercise.tips : null}
        primaryMuscles={primary}
        secondaryMuscles={secondary}
        labels={{
          tabsLabel: t("exerciseDetail.tabsLabel"),
          detailsEmptyTitle: t("exerciseDetail.detailsEmptyTitle"),
          detailsEmptyDescription: t("exerciseDetail.detailsEmptyDescription"),
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
        open={isMediaViewerOpen && hasMedia}
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
