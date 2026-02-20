"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { addExerciseRecent } from "@/lib/exerciseRecents";
import { useExerciseFavorites } from "@/lib/exerciseFavorites";
import type { Exercise, TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
import { extractGymMembership } from "@/lib/gymMembership";
import { isTrainingPlanVisibleForGym } from "@/lib/trainingPlanVisibility";
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

function isNotNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

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
  const [targetPlans, setTargetPlans] = useState<TrainingPlanDetail[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planRetryKey, setPlanRetryKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const [viewerGymId, setViewerGymId] = useState<string | null>(null);
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
    type MediaItem = { kind: "image" | "video"; url: string; poster?: string };
    if (!exercise) return [] as MediaItem[];

    const source: Array<MediaItem | null> = [
      exercise.mediaUrl ? { kind: "video", url: exercise.mediaUrl, poster: exercise.posterUrl ?? exercise.imageUrl ?? undefined } : null,
      exercise.videoUrl ? { kind: "video", url: exercise.videoUrl, poster: exercise.posterUrl ?? exercise.imageUrl ?? undefined } : null,
      exercise.imageUrl ? { kind: "image", url: exercise.imageUrl } : null,
      exercise.posterUrl ? { kind: "image", url: exercise.posterUrl } : null,
    ];
    const filtered = source.filter((item): item is MediaItem => item !== null);

    const unique: MediaItem[] = [];
    const seen = new Set<string>();
    for (const item of filtered) {
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
    const loadViewerGym = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const profile = (await response.json()) as unknown;
        if (!active) return;
        setViewerGymId(extractGymMembership(profile).gymId);
      } catch {
        if (!active) return;
        setViewerGymId(null);
      }
    };

    void loadViewerGym();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadTargetPlan = async () => {
      setPlansLoading(true);
      setPlansError(null);
      setTargetPlans([]);

      try {
        if (athleteUserId) {
          const assignmentResponse = await fetch(`/api/trainer/clients/${athleteUserId}/assigned-plan`, {
            cache: "no-store",
            credentials: "include",
          });
          if (!assignmentResponse.ok) throw new Error("ASSIGNMENT_ERROR");
          const assignmentData = (await assignmentResponse.json()) as { assignedPlan?: { id?: string } | null };
          const assignedPlanId = assignmentData.assignedPlan?.id;
          if (!assignedPlanId) {
            if (!active) return;
            setPlansLoading(false);
            return;
          }
          const detailResponse = await fetch(`/api/training-plans/${assignedPlanId}`, {
            cache: "no-store",
            credentials: "include",
          });
          if (!detailResponse.ok) throw new Error("PLAN_DETAIL_ERROR");
          const detail = (await detailResponse.json()) as TrainingPlanDetail;
          if (!active) return;
          setTargetPlans(isTrainingPlanVisibleForGym(detail, viewerGymId) ? [detail] : []);
          setPlansLoading(false);
          return;
        }

        const listResponse = await fetch("/api/training-plans?limit=20", { cache: "no-store", credentials: "include" });
        if (!listResponse.ok) throw new Error("PLAN_LIST_ERROR");
        const listData = (await listResponse.json()) as { items?: TrainingPlanListItem[] };
        const planIds = (listData.items ?? []).map((item) => item.id).filter(Boolean);

        if (planIds.length === 0) {
          if (!active) return;
          setPlansLoading(false);
          return;
        }

        const details = await Promise.all(
          planIds.map(async (planId) => {
            const detailResponse = await fetch(`/api/training-plans/${planId}`, { cache: "no-store", credentials: "include" });
            if (!detailResponse.ok) return null;
            return (await detailResponse.json()) as TrainingPlanDetail;
          })
        );

        if (!active) return;
        setTargetPlans(details.filter(isNotNull).filter((plan) => isTrainingPlanVisibleForGym(plan, viewerGymId)));
        setPlansLoading(false);
      } catch (_err) {
        if (!active) return;
        setPlansError(t("library.addToPlansLoadError"));
        setPlansLoading(false);
      }
    };
    void loadTargetPlan();
    return () => {
      active = false;
    };
  }, [athleteUserId, planRetryKey, t, viewerGymId]);

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
  const addLabel = t("library.addToPlansConfirm");
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

  const addExerciseToPlans = async (planIds: string[]) => {
    if (!exercise.id || planIds.length === 0 || addingExercise) return;
    setAddingExercise(true);
    setAddExerciseError(null);
    try {
      const plansById = new Map(targetPlans.map((plan) => [plan.id, plan]));
      const selectedPlans = planIds
        .map((planId) => plansById.get(planId))
        .filter(isNotNull);

      if (selectedPlans.length === 0) {
        setAddingExercise(false);
        setAddExerciseError(t("library.addToPlansSubmitError"));
        return;
      }

      const responses = await Promise.all(
        selectedPlans.map(async (plan) => {
          const dayId = plan.days?.[0]?.id;
          if (!dayId) return false;

          const response = await fetch(`/api/training-plans/${plan.id}/days/${dayId}/exercises`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            cache: "no-store",
            body: JSON.stringify({ exerciseId: exercise.id, ...(athleteUserId ? { athleteUserId } : {}) }),
          });

          return response.ok;
        })
      );

      setAddingExercise(false);
      if (responses.some((ok) => !ok)) {
        setAddExerciseError(t("library.addToPlansSubmitError"));
        return;
      }

      notify({
        title: t("library.addToPlansSuccessTitle"),
        description: t("library.addToPlansSuccessDescription")
          .replace("{exercise}", exercise.name)
          .replace("{count}", String(selectedPlans.length)),
        variant: "success",
      });
      setPickerOpen(false);
    } catch (_err) {
      setAddingExercise(false);
      setAddExerciseError(t("library.addToPlansSubmitError"));
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
              {addLabel}
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
        plans={targetPlans.map((plan) => ({ id: plan.id, title: plan.title, daysCount: plan.days.length }))}
        loadingPlans={plansLoading}
        loadError={plansError}
        isSubmitting={addingExercise}
        submitError={addExerciseError}
        canSubmit={targetPlans.some((plan) => (plan.days?.length ?? 0) > 0)}
        allowMultiSelect
        onConfirm={addExerciseToPlans}
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
