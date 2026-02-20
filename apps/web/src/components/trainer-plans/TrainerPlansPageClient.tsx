"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import TrainerGymRequiredState from "@/components/trainer/TrainerGymRequiredState";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanListItem } from "@/lib/types";
import { requestJson } from "@/lib/api/serviceResult";
import { fetchExercisesList, type Exercise } from "@/services/exercises";
import { createTrainerPlan, listCurrentGymTrainerPlans } from "@/services/trainer/plans";

type TabId = "fitsculpt" | "myPlans";
type LoadState = "loading" | "ready";
type Slot = { weekIndex: number; dayOfWeek: number };
type LoadTarget = "endurance" | "hypertrophy" | "strength" | "maxStrength" | "power" | "plyometrics";
type LoadType = "classic" | "pyramid" | "dropSet";
type LoadSet = { setNumber: number; reps: string; restSeconds: string; notes: string };
type DraftExercise = {
  id: string;
  exerciseId?: string;
  name: string;
  libraryBacked: boolean;
  loadTarget?: LoadTarget;
  loadType?: LoadType;
  sets: LoadSet[];
};
type WorkoutDraft = { title: string; notes: string; exercises: DraftExercise[] };
type TrainerPlanListItemWithOwnership = TrainingPlanListItem & {
  userId?: string;
  ownerId?: string;
  isOwner?: boolean;
  isOwnedByTrainer?: boolean;
  canDelete?: boolean;
  source?: string;
};

type PlanOwnership = "trainer" | "fitsculpt" | "unknown";

const DEFAULT_WEEKS = 4;
const DAYS_IN_WEEK = 7;
const SCHEDULE_GRID_MIN_HEIGHT = 320;
const SCHEDULE_GRID_MAX_HEIGHT = "min(48vh, 420px)";

function createEmptySet(setNumber: number): LoadSet {
  return { setNumber, reps: "", restSeconds: "", notes: "" };
}

function normalizeSets(sets: LoadSet[]): LoadSet[] {
  if (sets.length === 0) return [createEmptySet(1)];
  return sets.map((set, index) => ({ ...set, setNumber: index + 1 }));
}

function isEndpointUnavailable(status?: number): boolean {
  return status === 404 || status === 405;
}

function slotKey(slot: Slot): string {
  return `${slot.weekIndex}-${slot.dayOfWeek}`;
}

function parseSlot(key: string): Slot {
  const [weekIndex, dayOfWeek] = key.split("-").map(Number);
  return { weekIndex, dayOfWeek };
}

function canDeleteTrainerPlan(plan: TrainingPlanListItem): boolean {
  return getPlanOwnership(plan) === "trainer";
}

function getPlanOwnership(plan: TrainingPlanListItem): PlanOwnership {
  const candidate = plan as TrainerPlanListItemWithOwnership;

  if (candidate.canDelete === true) return "trainer";
  if (candidate.isOwner === true || candidate.isOwnedByTrainer === true) return "trainer";

  const normalizedSource = typeof candidate.source === "string" ? candidate.source.toLowerCase().trim() : "";

  if (normalizedSource === "trainer" || normalizedSource === "owned") return "trainer";
  if (normalizedSource === "fitsculpt" || normalizedSource === "system" || normalizedSource === "global" || normalizedSource === "public") {
    return "fitsculpt";
  }

  if (candidate.canDelete === false) return "fitsculpt";

  return "unknown";
}

export default function TrainerPlansPageClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [activeTab, setActiveTab] = useState<TabId>("fitsculpt");
  const [listState, setListState] = useState<LoadState>("loading");
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([]);
  const [listError, setListError] = useState(false);
  const [listDisabled, setListDisabled] = useState(false);

  const [createDisabled, setCreateDisabled] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [planTitle, setPlanTitle] = useState("");
  const [weeks, setWeeks] = useState(DEFAULT_WEEKS);
  const [editorTab, setEditorTab] = useState<"schedule" | "list">("schedule");
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [focusedSlot, setFocusedSlot] = useState<Slot>({ weekIndex: 0, dayOfWeek: 0 });
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [workoutsBySlot, setWorkoutsBySlot] = useState<Record<string, WorkoutDraft>>({});

  const [workoutEditorOpen, setWorkoutEditorOpen] = useState(false);
  const [exerciseEditorOpen, setExerciseEditorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<DraftExercise | null>(null);

  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchingExercises, setSearchingExercises] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingPlanListItem | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const selectedSlotKey = selectedSlot ? slotKey(selectedSlot) : null;
  const selectedWorkout = selectedSlotKey ? workoutsBySlot[selectedSlotKey] : null;

  const loadPlans = useCallback(async () => {
    setListState("loading");
    setListError(false);

    const result = await listCurrentGymTrainerPlans({ limit: 100 });
    if (!result.ok) {
      setPlans([]);
      const unavailable = isEndpointUnavailable(result.status);
      setListDisabled(unavailable);
      setCreateDisabled(unavailable);
      setListError(true);
      setListState("ready");
      return;
    }

    setPlans(result.data.items);
    setListDisabled(false);
    setListState("ready");
  }, []);

  useEffect(() => {
    if (!canAccessTrainerArea) return;
    void loadPlans();
  }, [canAccessTrainerArea, loadPlans]);

  useEffect(() => {
    if (!createModalOpen) return;

    const controller = new AbortController();
    async function loadExercises() {
      setSearchingExercises(true);
      setSearchError(false);
      try {
        const response = await fetchExercisesList({ page: 1, limit: 150 }, controller.signal);
        setAvailableExercises(response.items);
      } catch {
        if (!controller.signal.aborted) {
          setAvailableExercises([]);
          setSearchError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingExercises(false);
        }
      }
    }

    void loadExercises();
    return () => controller.abort();
  }, [createModalOpen]);

  const trainerOwnedPlans = useMemo(() => plans.filter((plan) => getPlanOwnership(plan) === "trainer"), [plans]);
  const fitsculptPlans = useMemo(() => plans.filter((plan) => getPlanOwnership(plan) !== "trainer"), [plans]);
  const undeterminedOwnershipCount = useMemo(() => plans.filter((plan) => getPlanOwnership(plan) === "unknown").length, [plans]);

  const sortedWorkoutEntries = useMemo(() => {
    return Object.entries(workoutsBySlot)
      .map(([key, workout]) => ({ key, slot: parseSlot(key), workout }))
      .sort((a, b) => {
        if (a.slot.weekIndex !== b.slot.weekIndex) return a.slot.weekIndex - b.slot.weekIndex;
        return a.slot.dayOfWeek - b.slot.dayOfWeek;
      });
  }, [workoutsBySlot]);

  const filteredExercises = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return availableExercises.slice(0, 12);
    return availableExercises.filter((exercise) => exercise.name.toLowerCase().includes(normalized)).slice(0, 12);
  }, [availableExercises, searchTerm]);

  const openSlotEditor = useCallback((slot: Slot) => {
    const key = slotKey(slot);
    setSelectedSlot(slot);
    setFocusedSlot(slot);
    setSelectedSlots((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });

    setWorkoutsBySlot((current) => {
      if (current[key]) return current;
      return { ...current, [key]: { title: "", notes: "", exercises: [] } };
    });
    setWorkoutEditorOpen(true);
  }, []);

  const toggleSlot = useCallback((slot: Slot) => {
    const key = slotKey(slot);
    setSelectedSlot(slot);
    setFocusedSlot(slot);
    setSelectedSlots((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    setWorkoutsBySlot((current) => {
      if (current[key]) return current;
      return { ...current, [key]: { title: "", notes: "", exercises: [] } };
    });
  }, []);

  const onGridKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, slot: Slot) => {
    const key = event.key;
    const directions: Record<string, [number, number]> = {
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
    };

    if (key === "Enter" || key === " ") {
      event.preventDefault();
      toggleSlot(slot);
      return;
    }

    if (!(key in directions)) return;

    event.preventDefault();
    const [weekOffset, dayOffset] = directions[key];
    const nextWeek = Math.max(0, Math.min(weeks - 1, slot.weekIndex + weekOffset));
    const nextDay = Math.max(0, Math.min(DAYS_IN_WEEK - 1, slot.dayOfWeek + dayOffset));
    const selector = `[data-slot="${nextWeek}-${nextDay}"]`;
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button) {
      button.focus();
      setFocusedSlot({ weekIndex: nextWeek, dayOfWeek: nextDay });
    }
  }, [toggleSlot, weeks]);

  const onSaveWorkoutMeta = useCallback((title: string, notes: string) => {
    if (!selectedSlot) return;
    const key = slotKey(selectedSlot);
    setWorkoutsBySlot((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? { title: "", notes: "", exercises: [] }),
        title,
        notes,
      },
    }));
  }, [selectedSlot]);

  const onSaveExercise = useCallback((exercise: DraftExercise) => {
    if (!selectedSlot) return;
    const key = slotKey(selectedSlot);
    setWorkoutsBySlot((current) => {
      const workout = current[key] ?? { title: "", notes: "", exercises: [] };
      const existingIndex = workout.exercises.findIndex((entry) => entry.id === exercise.id);
      const exercises = [...workout.exercises];
      if (existingIndex >= 0) exercises[existingIndex] = exercise;
      else exercises.push(exercise);
      return { ...current, [key]: { ...workout, exercises } };
    });
    setExerciseEditorOpen(false);
    setEditingExercise(null);
  }, [selectedSlot]);

  const onSubmitPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!planTitle.trim() || creating) return;

    setCreating(true);
    setCreateError(null);

    const plannedDays = Math.max(1, Math.min(7, selectedSlots.size || 1));
    const result = await createTrainerPlan({
      title: planTitle.trim(),
      daysPerWeek: plannedDays,
    });

    if (!result.ok) {
      if (isEndpointUnavailable(result.status)) setCreateDisabled(true);
      setCreateError(result.message ?? t("trainer.plans.createError"));
      setCreating(false);
      return;
    }

    notify({
      title: t("trainer.plans.createSuccessTitle"),
      description: t("trainer.plans.createSuccessDescription"),
      variant: "success",
    });

    setCreateModalOpen(false);
    setPlanTitle("");
    setSelectedSlots(new Set());
    setSelectedSlot(null);
    setWorkoutsBySlot({});
    setWeeks(DEFAULT_WEEKS);
    setEditorTab("schedule");
    await loadPlans();
    setCreating(false);
  };

  const onDeletePlan = useCallback(async (plan: TrainingPlanListItem) => {
    if (deletingPlanId) return;

    setDeletingPlanId(plan.id);
    const result = await requestJson<unknown>(`/api/trainer/plans/${plan.id}`, { method: "DELETE" });
    setDeletingPlanId(null);

    if (!result.ok) {
      const isKnownDeleteError = result.status === 403 || result.status === 404 || result.status === 405;
      notify({
        title: t("trainer.plans.actions.delete"),
        description: isKnownDeleteError ? t("trainer.plans.actions.deleteDenied") : t("trainer.plans.deleteError"),
        variant: "danger",
      });
      return;
    }

    notify({
      title: t("trainer.plans.actions.delete"),
      description: t("trainer.plans.deleteSuccess"),
      variant: "success",
    });
    await loadPlans();
  }, [deletingPlanId, loadPlans, notify, t]);

  if (accessLoading || gymLoading) return <LoadingState ariaLabel={t("trainer.loading")} lines={3} />;
  if (canAccessAdminNoGymPanel) return <TrainerAdminNoGymPanel />;

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") return <TrainerGymRequiredState />;
    if (gymError) return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <Card>
        <CardHeader>
          <CardTitle>{t("trainer.plans.createTitle")}</CardTitle>
          <CardDescription>{t("trainer.plans.schedulerDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="form-stack">
          {createDisabled ? <p className="muted">{t("trainer.plans.createDisabled")}</p> : null}
          <Button onClick={() => setCreateModalOpen(true)} disabled={createDisabled}>{t("trainer.plans.create")}</Button>
          {createError ? <p className="muted" role="alert">{createError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trainer.plans.listTitle")}</CardTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant={activeTab === "fitsculpt" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("fitsculpt")}>{t("trainer.plans.tabs.fitsculpt")}</Button>
            <Button variant={activeTab === "myPlans" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("myPlans")}>{t("trainer.plans.tabs.myPlans")}</Button>
          </div>
        </CardHeader>
        <CardContent className="form-stack" aria-live="polite">
          {listState === "loading" ? <PlansSkeleton /> : null}
          {listState === "ready" && listError
            ? (listDisabled
              ? <EmptyState title={t("trainer.plans.listDisabledTitle")} description={t("trainer.plans.listDisabledDescription")} wrapInCard icon="info" />
              : <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadPlans()} wrapInCard />)
            : null}

          {listState === "ready" && !listError ? (
            <PlansList
              items={activeTab === "fitsculpt" ? fitsculptPlans : trainerOwnedPlans}
              emptyLabel={activeTab === "fitsculpt" ? t("trainer.plans.emptyPublic") : t("trainer.plans.empty")}
              showFallback={activeTab === "myPlans"}
              unknownOwnershipCount={activeTab === "myPlans" ? undeterminedOwnershipCount : 0}
              editDisabled={listDisabled}
              canRequestDelete={activeTab === "myPlans"}
              deletingPlanId={deletingPlanId}
              onRequestDelete={(plan) => setDeleteTarget(plan)}
            />
          ) : null}
        </CardContent>
      </Card>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deletingPlanId && setDeleteTarget(null)}
        title={t("trainer.plans.deleteConfirmTitle")}
        description={t("trainer.plans.deleteConfirmDescription", { name: deleteTarget?.title ?? "" })}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingPlanId)}>{t("ui.cancel")}</Button>
          <Button
            variant="danger"
            loading={Boolean(deletingPlanId)}
            disabled={!deleteTarget || Boolean(deletingPlanId)}
            onClick={async () => {
              if (!deleteTarget) return;
              await onDeletePlan(deleteTarget);
              setDeleteTarget(null);
            }}
          >
            {t("trainer.plans.actions.delete")}
          </Button>
        </div>
      </Modal>

      <Modal
        open={createModalOpen}
        onClose={() => !creating && setCreateModalOpen(false)}
        title={t("trainer.plans.createDraftTitle")}
        description={t("trainer.plans.schedulerDescription")}
      >
        <form
          className="form-stack"
          onSubmit={(event) => void onSubmitPlan(event)}
          style={{ maxHeight: "min(78vh, 760px)", display: "grid", gridTemplateRows: "minmax(0, 1fr) auto", overflow: "hidden" }}
        >
          <div className="form-stack" style={{ minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
            <label className="form-stack" style={{ gap: 8 }}>
              <span className="muted">{t("trainer.plans.titleLabel")}</span>
              <input required value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} disabled={creating || createDisabled} />
            </label>

            <label className="form-stack" style={{ gap: 8 }}>
              <span className="muted">{t("trainer.plans.weeksLabel")}</span>
              <input type="number" min={1} max={12} value={weeks} onChange={(event) => setWeeks(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} />
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="sm" variant={editorTab === "schedule" ? "primary" : "secondary"} onClick={() => setEditorTab("schedule")}>{t("trainer.plans.workoutsSchedule")}</Button>
              <Button size="sm" variant={editorTab === "list" ? "primary" : "secondary"} onClick={() => setEditorTab("list")}>{t("trainer.plans.workoutsList")}</Button>
            </div>

            <div style={{ minHeight: SCHEDULE_GRID_MIN_HEIGHT }}>
              {editorTab === "schedule" ? (
                <WorkoutScheduleGrid
                  weeks={weeks}
                  selectedSlots={selectedSlots}
                  focusedSlot={focusedSlot}
                  onSelect={toggleSlot}
                  onOpenEditor={openSlotEditor}
                  onKeyDown={onGridKeyDown}
                />
              ) : (
                <WorkoutsList entries={sortedWorkoutEntries} onOpen={(slot) => openSlotEditor(slot)} />
              )}
            </div>

            {selectedSlot ? (
              <Button variant="secondary" onClick={() => setWorkoutEditorOpen(true)}>{t("trainer.plans.openDayEditor")}</Button>
            ) : null}

            {selectedSlots.size > 0 ? <p className="muted">{t("trainer.plans.scheduleMappedToDays", { count: selectedSlots.size })}</p> : null}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, position: "sticky", bottom: 0, background: "var(--bg-card)", paddingTop: 8 }}>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)} disabled={creating}>{t("ui.cancel")}</Button>
            <Button type="submit" loading={creating} disabled={createDisabled || !planTitle.trim()}>{t("trainer.plans.create")}</Button>
          </div>
        </form>
      </Modal>

      <WorkoutDayEditor
        key={selectedSlotKey ?? "no-slot"}
        open={workoutEditorOpen}
        slot={selectedSlot}
        workout={selectedWorkout}
        onClose={() => setWorkoutEditorOpen(false)}
        onSave={onSaveWorkoutMeta}
        onAddExercise={() => {
          setEditingExercise({ id: crypto.randomUUID(), name: "", libraryBacked: false, sets: [createEmptySet(1)] });
          setExerciseEditorOpen(true);
        }}
        onEditExercise={(exercise) => {
          setEditingExercise(exercise);
          setExerciseEditorOpen(true);
        }}
      />

      <ExerciseEditor
        key={editingExercise?.id ?? "no-exercise"}
        open={exerciseEditorOpen}
        exercise={editingExercise}
        searchingExercises={searchingExercises}
        searchError={searchError}
        searchTerm={searchTerm}
        exercises={filteredExercises}
        onSearch={setSearchTerm}
        onClose={() => {
          setExerciseEditorOpen(false);
          setEditingExercise(null);
        }}
        onSave={onSaveExercise}
      />
    </div>
  );
}

function PlansSkeleton() {
  return (
    <div className="form-stack">
      <Skeleton height={20} />
      <Skeleton height={20} />
      <Skeleton height={20} />
    </div>
  );
}

function PlansList({
  items,
  emptyLabel,
  showFallback,
  unknownOwnershipCount,
  editDisabled,
  canRequestDelete,
  deletingPlanId,
  onRequestDelete,
}: {
  items: TrainingPlanListItem[];
  emptyLabel: string;
  showFallback?: boolean;
  unknownOwnershipCount?: number;
  editDisabled?: boolean;
  canRequestDelete?: boolean;
  deletingPlanId?: string | null;
  onRequestDelete: (plan: TrainingPlanListItem) => void;
}) {
  const { t } = useLanguage();

  if (items.length === 0) {
    if (showFallback) {
      return <EmptyState title={t("trainer.plans.comingSoon")} description={emptyLabel} wrapInCard icon="info" />;
    }
    return <EmptyState title={emptyLabel} wrapInCard icon="info" />;
  }

  return (
    <div className="form-stack">
      {showFallback ? <Badge variant="muted">{t("trainer.plans.filterUnavailable")}</Badge> : null}
      {Boolean(unknownOwnershipCount) ? <p className="muted">{t("trainer.plans.ownershipUnknown", { count: unknownOwnershipCount ?? 0 })}</p> : null}
      <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
        {items.map((plan) => (
          <li key={plan.id}>
            <article className="feature-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="form-stack" style={{ gap: 8 }}>
                <strong>{plan.title}</strong>
                <Badge variant="info">{t("trainer.plans.daysCount", { count: plan.daysCount })}</Badge>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ButtonLink
                  size="sm"
                  variant="secondary"
                  href={`/app/trainer/plans/${plan.id}`}
                  disabled={editDisabled}
                  title={editDisabled ? t("trainer.plans.actionsUnavailable") : undefined}
                >
                  {t("trainer.plans.actions.edit")}
                </ButtonLink>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deletingPlanId === plan.id || !canRequestDelete || !canDeleteTrainerPlan(plan)}
                  loading={deletingPlanId === plan.id}
                  title={!canRequestDelete || !canDeleteTrainerPlan(plan) ? t("trainer.plans.actions.deleteUnsupported") : undefined}
                  onClick={() => onRequestDelete(plan)}
                >
                  {t("trainer.plans.actions.delete")}
                </Button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkoutScheduleGrid({
  weeks,
  selectedSlots,
  focusedSlot,
  onSelect,
  onOpenEditor,
  onKeyDown,
}: {
  weeks: number;
  selectedSlots: Set<string>;
  focusedSlot: Slot;
  onSelect: (slot: Slot) => void;
  onOpenEditor: (slot: Slot) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, slot: Slot) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="form-stack">
      <div
        role="grid"
        aria-label={t("trainer.plans.workoutsSchedule")}
        className="form-stack"
        style={{
          gap: 6,
          maxHeight: SCHEDULE_GRID_MAX_HEIGHT,
          minHeight: SCHEDULE_GRID_MIN_HEIGHT,
          overflowY: "auto",
          overflowX: "auto",
          paddingRight: 4,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "72px repeat(7, 68px)", gap: 6, alignItems: "center", position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1 }}>
          <span className="muted" style={{ fontSize: 12, textAlign: "center" }}>{t("trainer.plans.weekShort")}</span>
          {Array.from({ length: DAYS_IN_WEEK }).map((__, dayOfWeek) => (
            <span key={`header-${dayOfWeek}`} className="muted" style={{ textAlign: "center", fontSize: 12, whiteSpace: "nowrap" }}>
              {t("trainer.plans.dayLabel", { day: dayOfWeek + 1 })}
            </span>
          ))}
        </div>
        {Array.from({ length: weeks }).map((_, weekIndex) => (
          <div key={weekIndex} style={{ display: "grid", gridTemplateColumns: "72px repeat(7, 68px)", gap: 6, alignItems: "center" }}>
            <span className="muted" style={{ fontSize: 12, textAlign: "center" }}>{t("trainer.plans.weekShortLabel", { week: weekIndex + 1 })}</span>
            {Array.from({ length: DAYS_IN_WEEK }).map((__, dayOfWeek) => {
              const slot = { weekIndex, dayOfWeek };
              const key = slotKey(slot);
              const selected = selectedSlots.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  data-slot={key}
                  aria-pressed={selected}
                  onKeyDown={(event) => onKeyDown(event, slot)}
                  onClick={() => onSelect(slot)}
                  onDoubleClick={() => onOpenEditor(slot)}
                  className="btn secondary"
                  style={{
                    width: 68,
                    height: 56,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    borderColor: selected ? "var(--accent)" : undefined,
                    outline: focusedSlot.weekIndex === weekIndex && focusedSlot.dayOfWeek === dayOfWeek ? "2px solid var(--accent)" : "none",
                    opacity: selected ? 1 : 0.85,
                  }}
                >
                  <span style={{ display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t("trainer.plans.weekDayLabel", { week: weekIndex + 1, day: dayOfWeek + 1 })}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.calendarHint")}</p>
    </div>
  );
}

function WorkoutsList({ entries, onOpen }: { entries: Array<{ key: string; slot: Slot; workout: WorkoutDraft }>; onOpen: (slot: Slot) => void }) {
  const { t } = useLanguage();

  if (entries.length === 0) {
    return <EmptyState title={t("trainer.plans.workoutsListEmpty")} wrapInCard icon="info" />;
  }

  return (
    <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
      {entries.map((entry) => (
        <li key={entry.key}>
          <button type="button" className="btn secondary" style={{ width: "100%", justifyContent: "space-between", display: "flex" }} onClick={() => onOpen(entry.slot)}>
            <span>{t("trainer.plans.weekDayLabel", { week: entry.slot.weekIndex + 1, day: entry.slot.dayOfWeek + 1 })}</span>
            <span>{entry.workout.title || t("trainer.plans.untitledWorkout")}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function WorkoutDayEditor({
  open,
  slot,
  workout,
  onClose,
  onSave,
  onAddExercise,
  onEditExercise,
}: {
  open: boolean;
  slot: Slot | null;
  workout: WorkoutDraft | null;
  onClose: () => void;
  onSave: (title: string, notes: string) => void;
  onAddExercise: () => void;
  onEditExercise: (exercise: DraftExercise) => void;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(workout?.title ?? "");
  const [notes, setNotes] = useState(workout?.notes ?? "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("trainer.plans.dayEditorTitle")}
      description={slot ? t("trainer.plans.weekDayLabel", { week: slot.weekIndex + 1, day: slot.dayOfWeek + 1 }) : undefined}
    >
      <div className="form-stack">
        <label className="form-stack" style={{ gap: 8 }}>
          <span className="muted">{t("trainer.plans.workoutName")}</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="form-stack" style={{ gap: 8 }}>
          <span className="muted">{t("trainer.plans.notesOptional")}</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
        </label>

        <div className="form-stack">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{t("trainer.plans.dayExercisesTitle")}</strong>
            <Button size="sm" onClick={onAddExercise}>+</Button>
          </div>
          {!workout || workout.exercises.length === 0 ? <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p> : (
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {workout.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <button type="button" className="btn secondary" onClick={() => onEditExercise(exercise)}>{exercise.name || t("trainer.plans.customExercise")}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>{t("ui.cancel")}</Button>
          <Button onClick={() => { onSave(title, notes); onClose(); }}>{t("ui.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ExerciseEditor({
  open,
  exercise,
  searchingExercises,
  searchError,
  searchTerm,
  exercises,
  onSearch,
  onClose,
  onSave,
}: {
  open: boolean;
  exercise: DraftExercise | null;
  searchingExercises: boolean;
  searchError: boolean;
  searchTerm: string;
  exercises: Exercise[];
  onSearch: (value: string) => void;
  onClose: () => void;
  onSave: (exercise: DraftExercise) => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<DraftExercise | null>(exercise ? { ...exercise, sets: normalizeSets(exercise.sets) } : null);
  const [step, setStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setDraft(exercise ? { ...exercise, sets: normalizeSets(exercise.sets) } : null);
  }, [exercise]);


  if (!draft) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("trainer.plans.exerciseEditorTitle")}
      description={t("trainer.plans.loadWizardUiOnly")}
      className="form-stack trainer-plans-exercise-editor-modal"
    >
      <div className="form-stack" style={{ maxHeight: "min(80vh, 760px)", display: "grid", gridTemplateRows: "minmax(0, 1fr) auto", overflow: "hidden" }}>
        <div className="form-stack" style={{ minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
        <label className="form-stack" style={{ gap: 8 }}>
          <span className="muted">{t("trainer.plans.searchExercises")}</span>
          <input value={searchTerm} onChange={(event) => onSearch(event.target.value)} placeholder={t("trainer.plans.searchExercisesPlaceholder")} />
        </label>

        {searchingExercises ? <p className="muted">{t("trainer.plans.searchingExercises")}</p> : null}
        {searchError ? <p className="muted">{t("trainer.plans.selectorUnavailable")}</p> : null}

        {!searchingExercises && !searchError ? (
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {exercises.map((item) => (
              <li key={item.id}>
                <button type="button" className="btn secondary" onClick={() => setDraft({ ...draft, exerciseId: item.id, name: item.name, libraryBacked: true })}>{item.name}</button>
              </li>
            ))}
          </ul>
        ) : null}
        {!searchingExercises && !searchError && exercises.length === 0 ? <p className="muted">{t("trainer.plans.searchExercisesEmpty")}</p> : null}

        <label className="form-stack" style={{ gap: 8 }}>
          <span className="muted">{t("trainer.plans.customExercise")}</span>
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value, libraryBacked: false, exerciseId: undefined })} />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button size="sm" variant={step === 0 ? "primary" : "secondary"} onClick={() => setStep(0)}>{t("trainer.plans.loadTarget")}</Button>
          <Button size="sm" variant={step === 1 ? "primary" : "secondary"} onClick={() => setStep(1)}>{t("trainer.plans.loadType")}</Button>
          <Button size="sm" variant={step === 2 ? "primary" : "secondary"} onClick={() => setStep(2)}>{t("trainer.plans.loadSets")}</Button>
        </div>

        {step === 0 ? <LoadTargetStep draft={draft} onChange={(loadTarget) => setDraft({ ...draft, loadTarget })} /> : null}
        {step === 1 ? <LoadTypeStep draft={draft} onChange={(loadType) => setDraft({ ...draft, loadType })} /> : null}
        {step === 2 ? <LoadSetsStep draft={draft} onChange={(sets) => setDraft({ ...draft, sets })} /> : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, position: "sticky", bottom: 0, background: "var(--bg-card)", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>{t("ui.cancel")}</Button>
          <Button onClick={() => onSave(draft)} disabled={!draft.name.trim()}>{t("ui.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function LoadTargetStep({ draft, onChange }: { draft: DraftExercise; onChange: (value: LoadTarget) => void }) {
  const { t } = useLanguage();
  const options: LoadTarget[] = ["endurance", "hypertrophy", "strength", "maxStrength", "power", "plyometrics"];

  return (
    <div className="form-stack">
      {options.map((option) => (
        <button key={option} type="button" className="btn secondary" style={{ justifyContent: "space-between", display: "flex" }} onClick={() => onChange(option)}>
          <span>{t(`trainer.plans.targets.${option}`)}</span>
          {draft.loadTarget === option ? <Badge variant="success">✓</Badge> : null}
        </button>
      ))}
    </div>
  );
}

function LoadTypeStep({ draft, onChange }: { draft: DraftExercise; onChange: (value: LoadType) => void }) {
  const { t } = useLanguage();
  const options: LoadType[] = ["classic", "pyramid", "dropSet"];

  return (
    <div className="form-stack">
      {options.map((option) => (
        <button key={option} type="button" className="btn secondary" style={{ justifyContent: "space-between", display: "flex" }} onClick={() => onChange(option)}>
          <span>{t(`trainer.plans.loadTypes.${option}`)}</span>
          {draft.loadType === option ? <Badge variant="success">✓</Badge> : null}
        </button>
      ))}
    </div>
  );
}

function LoadSetsStep({ draft, onChange }: { draft: DraftExercise; onChange: (value: LoadSet[]) => void }) {
  const { t } = useLanguage();
  const setsRef = useRef<HTMLDivElement | null>(null);
  const previousSetsLengthRef = useRef(draft.sets.length);

  const normalizeSetNumbers = useCallback((sets: LoadSet[]) => {
    return sets.map((set, index) => ({ ...set, setNumber: index + 1 }));
  }, []);

  useEffect(() => {
    const previousLength = previousSetsLengthRef.current;
    previousSetsLengthRef.current = draft.sets.length;
    if (draft.sets.length <= previousLength) return;

    const lastSet = setsRef.current?.lastElementChild;
    if (lastSet instanceof HTMLElement) {
      lastSet.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [draft.sets.length]);

  return (
    <div className="form-stack">
      <div className="form-stack" ref={setsRef} style={{ maxHeight: "min(42vh, 360px)", overflowY: "auto", paddingRight: 4 }}>
      {draft.sets.map((set, index) => (
        <div key={`${set.setNumber}-${index}`} className="feature-card form-stack">
          <strong>{t("trainer.plans.setLabel", { set: set.setNumber })}</strong>
          <label className="form-stack" style={{ gap: 6 }}>
            <span className="muted">{t("trainer.plans.reps")}</span>
            <input value={set.reps} onChange={(event) => onChange(draft.sets.map((entry, entryIndex) => entryIndex === index ? { ...entry, reps: event.target.value } : entry))} />
          </label>
          <label className="form-stack" style={{ gap: 6 }}>
            <span className="muted">{t("trainer.plans.restSeconds")}</span>
            <input value={set.restSeconds} onChange={(event) => onChange(draft.sets.map((entry, entryIndex) => entryIndex === index ? { ...entry, restSeconds: event.target.value } : entry))} />
          </label>
          <label className="form-stack" style={{ gap: 6 }}>
            <span className="muted">{t("trainer.plans.intensityNotes")}</span>
            <input value={set.notes} onChange={(event) => onChange(draft.sets.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} />
          </label>
          <Button
            variant="secondary"
            onClick={() => onChange(normalizeSetNumbers(draft.sets.filter((_, entryIndex) => entryIndex !== index)))}
            disabled={draft.sets.length <= 1}
          >
            {t("trainer.plans.removeSet")}
          </Button>
        </div>
      ))}
      </div>

      <Button variant="secondary" onClick={() => onChange([...draft.sets, createEmptySet(draft.sets.length + 1)])}>{t("trainer.plans.addSet")}</Button>
      {draft.sets.length <= 1 ? <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.removeSetDisabledHint")}</p> : null}
      <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.loadWizardUiOnly")}</p>
    </div>
  );
}
