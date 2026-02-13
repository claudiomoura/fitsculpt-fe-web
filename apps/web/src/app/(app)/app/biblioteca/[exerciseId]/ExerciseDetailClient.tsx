"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { addExerciseRecent } from "@/lib/exerciseRecents";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import type { Exercise } from "@/lib/types";
import { Button } from "@/components/ui/Button";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const { favorites, toggleFavorite } = useExerciseFavorites();
  const { notify } = useToast();
  const fromPlan = searchParams.get("from") === "plan";
  const returnToParam = searchParams.get("returnTo");
  const safeReturnTo = returnToParam && returnToParam.startsWith("/app/") ? returnToParam : null;
  const backHref = fromPlan ? safeReturnTo ?? "/app/entrenamiento" : "/app/biblioteca";
  const backLabel = fromPlan ? t("ui.backToPlan") : t("ui.backToLibrary");
  const muscleGroups = useMemo(
    () => (exercise ? getMuscleGroups(exercise) : { primary: [], secondary: [] }),
    [exercise]
  );
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
  const primary = muscleGroups.primary;
  const secondary = muscleGroups.secondary;
  const equipmentLabel = exercise?.equipment ?? null;
  const hasDescription = Boolean(exercise?.description);
  const hasTechnique = Boolean(exercise?.technique);
  const hasTips = Boolean(exercise?.tips);
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
  const mediaKey = `${exercise?.id ?? "exercise"}-${media?.kind ?? "none"}-${media?.url ?? "none"}`;

  useEffect(() => {
    if (exercise) {
      addExerciseRecent(exercise);
    }
  }, [exercise]);

  if (error) {
    return (
      <ExerciseDetailErrorState
        title={errorTitle ?? t("exerciseDetail.errorTitle")}
        description={error ?? t("library.loadError")}
        actionLabel={backLabel}
        actionHref={backHref}
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
        actionLabel={backLabel}
        actionHref={backHref}
      />
    );
  }

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

  const handleBackNavigation = () => {
    if (fromPlan) {
      router.push(backHref);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backHref);
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
            <Button variant="secondary" onClick={handleBackNavigation}>
              {backLabel}
            </Button>
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

      <div className="exercise-detail-grid">
        <div className="feature-card exercise-media">
          <div className="exercise-media-header">
            <h3>{t("exerciseDetail.mediaSectionTitle")}</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsMediaViewerOpen(true)}
              aria-label={`${t("exerciseDetail.openMedia")} ${exercise.name}`}
              disabled={!hasMedia}
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
              disabled={!hasMedia}
            >
              <ExerciseMediaPreview
                key={mediaKey}
                media={media}
                mediaAlt={`${t("library.mediaAlt")} ${exercise.name}`}
                fallbackLabel={t("exerciseDetail.mediaPreviewFallback")}
              />
            </button>
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

function ExerciseMediaPreview({
  media,
  mediaAlt,
  fallbackLabel,
}: {
  media: { kind: "image" | "video"; url: string; poster?: string } | null;
  mediaAlt: string;
  fallbackLabel: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!media || hasError) {
    return (
      <div className="exercise-media-fallback" role="status" aria-live="polite">
        <p className="muted">{fallbackLabel}</p>
      </div>
    );
  }

  if (media.kind === "video") {
    return (
      <video
        className="exercise-media-img"
        autoPlay
        loop
        muted
        playsInline
        poster={media.poster}
        onError={() => setHasError(true)}
      >
        <source src={media.url} />
      </video>
    );
  }

  return (
    <img
      src={media.url}
      alt={mediaAlt}
      className="exercise-media-img"
      onError={() => setHasError(true)}
    />
  );
}
