"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { addExerciseRecent } from "@/lib/exerciseRecents";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import type { Exercise, TrainingPlanDetail } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import AddExerciseDayPickerModal from "@/components/training-plan/AddExerciseDayPickerModal";
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
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [targetPlan, setTargetPlan] = useState<TrainingPlanDetail | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planRetryKey, setPlanRetryKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const { favorites, toggleFavorite } = useExerciseFavorites();
  const { notify } = useToast();
  const athleteUserId = searchParams.get("athleteUserId")?.trim() || "";
  const fromPlan = searchParams.get("from") === "plan";
  const returnToParam = searchParams.get("returnTo");
  const safeReturnTo = returnToParam && returnToParam.startsWith("/app/") ? returnToParam : null;
  const backHref = fromPlan ? safeReturnTo ?? "/app/entrenamiento" : "/app/biblioteca";
  const backLabel = fromPlan ? t("ui.backToPlan") : t("ui.backToLibrary");
  const muscleGroups = useMemo(
    () => (exercise ? getMuscleGroups(exercise) : { primary: [], secondary: [] }),
    [exercise]
  );
  const mediaItems = useMemo(() => {
    if (!exercise) return [] as Array<{ kind: "image" | "video"; url: string; poster?: string }>;

    const source = [
      exercise.mediaUrl ? { kind: "video" as const, url: exercise.mediaUrl, poster: exercise.posterUrl ?? exercise.imageUrl ?? undefined } : null,
      exercise.videoUrl ? { kind: "video" as const, url: exercise.videoUrl, poster: exercise.posterUrl ?? exercise.imageUrl ?? undefined } : null,
      exercise.imageUrl ? { kind: "image" as const, url: exercise.imageUrl } : null,
      exercise.posterUrl ? { kind: "image" as const, url: exercise.posterUrl } : null,
    ].filter((item): item is { kind: "image" | "video"; url: string; poster?: string } => Boolean(item));

    const unique: Array<{ kind: "image" | "video"; url: string; poster?: string }> = [];
    const seen = new Set<string>();
    for (const item of source) {
      const key = `${item.kind}:${item.url}`;
      if (!item.url || seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    return unique;
  }, [exercise]);
  const media = mediaItems[activeMediaIndex] ?? null;
  const primary = muscleGroups.primary;
  const secondary = muscleGroups.secondary;
  const equipmentLabel = exercise?.equipment ?? null;
  const hasDescription = Boolean(exercise?.description);
  const hasTechnique = Boolean(exercise?.technique);
  const hasTips = Boolean(exercise?.tips);
  const hasMedia = mediaItems.length > 0;
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
  const mediaKey = `${exercise?.id ?? "exercise"}-${activeMediaIndex}-${media?.kind ?? "none"}-${media?.url ?? "none"}`;

  useEffect(() => {
    if (exercise) {
      addExerciseRecent(exercise);
    }
  }, [exercise]);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [exercise?.id]);

  useEffect(() => {
    if (activeMediaIndex < mediaItems.length) return;
    setActiveMediaIndex(0);
  }, [activeMediaIndex, mediaItems.length]);

  useEffect(() => {
    let active = true;
    const loadTargetPlan = async () => {
      setPlanLoading(true);
      setPlanError(null);
      setTargetPlan(null);

      try {
        if (athleteUserId) {
          const assignmentResponse = await fetch(`/api/trainer/members/${athleteUserId}/training-plan-assignment`, {
            cache: "no-store",
            credentials: "include",
          });
          if (!assignmentResponse.ok) throw new Error("ASSIGNMENT_ERROR");
          const assignmentData = (await assignmentResponse.json()) as { assignedPlan?: { id?: string } | null };
          const assignedPlanId = assignmentData.assignedPlan?.id;
          if (!assignedPlanId) {
            if (!active) return;
            setPlanLoading(false);
            return;
          }
          const detailResponse = await fetch(`/api/training-plans/${assignedPlanId}`, {
            cache: "no-store",
            credentials: "include",
          });
          if (!detailResponse.ok) throw new Error("PLAN_DETAIL_ERROR");
          const detail = (await detailResponse.json()) as TrainingPlanDetail;
          if (!active) return;
          setTargetPlan(detail);
          setPlanLoading(false);
          return;
        }

        const listResponse = await fetch("/api/training-plans?limit=1", { cache: "no-store", credentials: "include" });
        if (!listResponse.ok) throw new Error("PLAN_LIST_ERROR");
        const listData = (await listResponse.json()) as { items?: Array<{ id: string }> };
        const ownPlanId = listData.items?.[0]?.id;
        if (!ownPlanId) {
          if (!active) return;
          setPlanLoading(false);
          return;
        }
        const detailResponse = await fetch(`/api/training-plans/${ownPlanId}`, { cache: "no-store", credentials: "include" });
        if (!detailResponse.ok) throw new Error("PLAN_DETAIL_ERROR");
        const detail = (await detailResponse.json()) as TrainingPlanDetail;
        if (!active) return;
        setTargetPlan(detail);
        setPlanLoading(false);
      } catch {
        if (!active) return;
        setPlanError(t("library.addToPlanLoadError"));
        setPlanLoading(false);
      }
    };
    void loadTargetPlan();
    return () => {
      active = false;
    };
  }, [athleteUserId, planRetryKey, t]);

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
  const addLabel = t("library.addActionLabel");
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

  const addExerciseToPlanDay = async (dayId: string) => {
    if (!exercise.id || !targetPlan?.id || !dayId || addingExercise) return;
    setAddingExercise(true);
    setAddExerciseError(null);
    try {
      const response = await fetch(`/api/training-plans/${targetPlan.id}/days/${dayId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ exerciseId: exercise.id, ...(athleteUserId ? { athleteUserId } : {}) }),
      });
      setAddingExercise(false);
      if (!response.ok) {
        setAddExerciseError(t("library.addToPlanSubmitError"));
        return;
      }
      notify({
        title: t("library.addToPlanSuccessTitle"),
        description: t("library.addToPlanSuccessDescription").replace("{exercise}", exercise.name),
        variant: "success",
      });
      setPickerOpen(false);
    } catch {
      setAddingExercise(false);
      setAddExerciseError(t("library.addToPlanSubmitError"));
    }
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
            <Button variant="secondary" size="sm" aria-label={addLabel} onClick={() => setPickerOpen(true)}>
              +
            </Button>
          </>
        }
      />

      {overviewItems.length > 0 ? (
        <div className="exercise-detail-overview">
          <h2 className="section-title">{t("exerciseDetail.summaryTitle")}</h2>
          <div className="info-grid mt-16">
            {overviewItems.map((item, index) => (
              <div key={`${item.label}-${index}`} className="info-item">
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
          {mediaItems.length > 1 ? (
            <div className="inline-actions mt-12">
              <Button variant="ghost" size="sm" onClick={() => setActiveMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)}>
                {t("exerciseDetail.previousMedia")}
              </Button>
              <Badge variant="muted">{activeMediaIndex + 1}/{mediaItems.length}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setActiveMediaIndex((prev) => (prev + 1) % mediaItems.length)}>
                {t("exerciseDetail.nextMedia")}
              </Button>
            </div>
          ) : null}
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
        mediaItems={mediaItems}
        title={t("exerciseDetail.mediaViewerTitle")}
        description={t("exerciseDetail.mediaViewerDescription")}
        closeLabel={t("ui.close")}
        mediaAlt={`${t("library.mediaAlt")} ${exercise.name}`}
        fallbackTitle={t("exerciseDetail.mediaViewerFallbackTitle")}
        fallbackDescription={t("exerciseDetail.mediaViewerFallbackDescription")}
        previousLabel={t("exerciseDetail.previousMedia")}
        nextLabel={t("exerciseDetail.nextMedia")}
      />

      <AddExerciseDayPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setAddExerciseError(null);
        }}
        exerciseName={exercise.name}
        days={(targetPlan?.days ?? []).map((day) => ({ id: day.id, label: day.label, focus: day.focus }))}
        loadingPlan={planLoading}
        loadError={planError}
        isSubmitting={addingExercise}
        submitError={addExerciseError}
        canSubmit={Boolean(targetPlan?.id)}
        onConfirm={addExerciseToPlanDay}
        onRetryLoad={() => setPlanRetryKey((prev) => prev + 1)}
        emptyCtaHref={athleteUserId ? `/app/trainer/clients/${athleteUserId}` : "/app/entrenamiento"}
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
