"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import TrainerGymRequiredState from "@/components/trainer/TrainerGymRequiredState";
import TrainerPlansTabs from "@/components/trainer/plans/TrainerPlansTabs";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";
import {
  createTrainerPlan,
  deleteTrainerPlan,
  deleteTrainerPlanDay,
  getTrainerPlanDetail,
  getTrainerPlanEditCapabilities,
  listCurrentGymTrainerPlans,
} from "@/services/trainer/plans";

type LoadState = "loading" | "ready";
type PlansTabId = "fitsculptPlans" | "myPlans";

type DetailState = {
  loading: boolean;
  error: boolean;
  item: TrainingPlanDetail | null;
};

type CreateStep = "basics" | "schedule";
type LoadTarget = "endurance" | "hypertrophy" | "strength" | "maxStrength" | "power" | "plyometrics";
type LoadType = "classic" | "pyramid" | "dropSet";

type WorkoutSetDraft = {
  setNumber: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
};

type WorkoutDayDraft = {
  workoutName: string;
  loadTarget: LoadTarget;
  loadType: LoadType;
  sets: WorkoutSetDraft[];
};

function isEndpointUnavailable(status?: number): boolean {
  return status === 404 || status === 405;
}

function createWeekSchedule(weeks: number): boolean[][] {
  return Array.from({ length: weeks }, () => Array.from({ length: 7 }, () => false));
}

function dayDraft(): WorkoutDayDraft {
  return {
    workoutName: "",
    loadTarget: "hypertrophy",
    loadType: "classic",
    sets: [{ setNumber: 1, repsMin: 8, repsMax: 12, restSeconds: 60 }],
  };
}

export default function TrainerPlansPageClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [activeTab, setActiveTab] = useState<PlansTabId>("myPlans");
  const [listState, setListState] = useState<LoadState>("loading");
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([]);
  const [listError, setListError] = useState(false);
  const [listDisabled, setListDisabled] = useState(false);

  const [title, setTitle] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [createDisabled, setCreateDisabled] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [createStep, setCreateStep] = useState<CreateStep>("basics");
  const [scheduleWeeks, setScheduleWeeks] = useState(4);
  const [scheduleGrid, setScheduleGrid] = useState<boolean[][]>(createWeekSchedule(4));
  const [selectedScheduleCell, setSelectedScheduleCell] = useState<string | null>(null);
  const [dayDrafts, setDayDrafts] = useState<Record<string, WorkoutDayDraft>>({});

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>({ loading: false, error: false, item: null });
  const [deletePlanTarget, setDeletePlanTarget] = useState<TrainingPlanListItem | null>(null);
  const [deleteDayTarget, setDeleteDayTarget] = useState<{ id: string; label: string } | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deletingDayId, setDeletingDayId] = useState<string | null>(null);
  const [canDeletePlanById, setCanDeletePlanById] = useState<Record<string, boolean>>({});
  const [canDeleteSelectedPlanDay, setCanDeleteSelectedPlanDay] = useState(false);

  const loadPlans = useCallback(async () => {
    setListState("loading");
    setListError(false);

    const result = await listCurrentGymTrainerPlans({ limit: 100 });
    if (!result.ok) {
      setPlans([]);
      const unavailable = isEndpointUnavailable(result.status);
      setListDisabled(unavailable);
      if (unavailable) setCreateDisabled(true);
      setListError(true);
      setListState("ready");
      return;
    }

    setListDisabled(false);
    setPlans(result.data.items);
    setListState("ready");
  }, []);

  const loadPlanDetail = useCallback(async (planId: string) => {
    setSelectedPlanId(planId);
    setDetail({ loading: true, error: false, item: null });

    const result = await getTrainerPlanDetail(planId);
    if (!result.ok) {
      setDetail({ loading: false, error: true, item: null });
      return;
    }

    setDetail({ loading: false, error: false, item: result.data });
  }, []);

  useEffect(() => {
    if (!canAccessTrainerArea) return;
    const timer = window.setTimeout(() => {
      void loadPlans();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canAccessTrainerArea, loadPlans]);

  useEffect(() => {
    if (plans.length === 0) {
      setCanDeletePlanById({});
      return;
    }

    let cancelled = false;
    async function loadDeleteCapabilities() {
      const entries = await Promise.all(plans.map(async (plan) => {
        const caps = await getTrainerPlanEditCapabilities(plan.id);
        return [plan.id, caps.canDeletePlan] as const;
      }));

      if (cancelled) return;
      setCanDeletePlanById(Object.fromEntries(entries));
    }

    void loadDeleteCapabilities();
    return () => {
      cancelled = true;
    };
  }, [plans]);

  useEffect(() => {
    if (!detail.item?.id || !detail.item.days?.[0]?.id) {
      setCanDeleteSelectedPlanDay(false);
      return;
    }

    let cancelled = false;
    async function loadDetailCapabilities() {
      const caps = await getTrainerPlanEditCapabilities(detail.item!.id, detail.item!.days[0].id);
      if (cancelled) return;
      setCanDeleteSelectedPlanDay(caps.canDeleteDay);
    }
    void loadDetailCapabilities();
    return () => {
      cancelled = true;
    };
  }, [detail.item]);

  const toggleScheduleDay = (weekIndex: number, dayIndex: number) => {
    setScheduleGrid((prev) => prev.map((week, rowIndex) => {
      if (rowIndex !== weekIndex) return week;
      return week.map((isActive, colIndex) => (colIndex === dayIndex ? !isActive : isActive));
    }));
    const cellKey = `${weekIndex + 1}-${dayIndex + 1}`;
    setSelectedScheduleCell(cellKey);
    setDayDrafts((prev) => (prev[cellKey] ? prev : { ...prev, [cellKey]: dayDraft() }));
  };

  const selectedDayDraft = useMemo(() => (selectedScheduleCell ? dayDrafts[selectedScheduleCell] : null), [dayDrafts, selectedScheduleCell]);

  const updateSelectedDayDraft = (updater: (prev: WorkoutDayDraft) => WorkoutDayDraft) => {
    if (!selectedScheduleCell) return;
    setDayDrafts((prev) => ({ ...prev, [selectedScheduleCell]: updater(prev[selectedScheduleCell] ?? dayDraft()) }));
  };

  const setScheduleWeeksAndGrid = (nextWeeks: number) => {
    const safeWeeks = Math.max(1, Math.min(12, nextWeeks));
    setScheduleWeeks(safeWeeks);
    setScheduleGrid((prev) => {
      const next = createWeekSchedule(safeWeeks);
      for (let weekIndex = 0; weekIndex < safeWeeks; weekIndex += 1) {
        for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
          next[weekIndex][dayIndex] = prev[weekIndex]?.[dayIndex] ?? false;
        }
      }
      return next;
    });
  };

  const resetCreateWizard = () => {
    setTitle("");
    setDaysPerWeek(3);
    setCreateStep("basics");
    setScheduleWeeks(4);
    setScheduleGrid(createWeekSchedule(4));
    setSelectedScheduleCell(null);
    setDayDrafts({});
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || creating) return;

    setCreating(true);
    setCreateError(false);
    setCreateErrorMessage(null);

    try {
      const result = await createTrainerPlan({
        title: title.trim(),
        daysPerWeek: Math.max(1, Math.min(14, daysPerWeek)),
      });

      if (!result.ok) {
        if (isEndpointUnavailable(result.status)) setCreateDisabled(true);
        setCreateError(true);
        setCreateErrorMessage(result.message ?? t("trainer.plans.createError"));
        return;
      }

      resetCreateWizard();
      setCreateModalOpen(false);
      notify({
        title: t("trainer.plans.createSuccessTitle"),
        description: t("trainer.plans.createSuccessDescription"),
        variant: "success",
      });
      await loadPlans();
      await loadPlanDetail(result.data.id);
    } catch {
      setCreateError(true);
      setCreateErrorMessage(t("trainer.plans.createError"));
    } finally {
      setCreating(false);
    }
  };

  const onDeletePlan = async () => {
    if (!deletePlanTarget || deletingPlanId) return;
    setDeletingPlanId(deletePlanTarget.id);
    const result = await deleteTrainerPlan(deletePlanTarget.id);
    setDeletingPlanId(null);

    if (!result.ok) {
      const unsupported = result.status === 404 || result.status === 405 || result.status === 501;
      notify({
        title: t("trainer.plans.actions.delete"),
        description: unsupported ? t("trainer.plans.actions.deleteUnsupported") : t("trainer.plans.deleteError"),
        variant: "error",
      });
      return;
    }

    setDeletePlanTarget(null);
    setPlans((prev) => prev.filter((entry) => entry.id !== deletePlanTarget.id));
    if (selectedPlanId === deletePlanTarget.id) {
      setSelectedPlanId(null);
      setDetail({ loading: false, error: false, item: null });
    }
    notify({ title: t("trainer.plans.actions.delete"), description: t("trainer.plans.deleteSuccess"), variant: "success" });
  };

  const onDeleteDay = async () => {
    if (!detail.item?.id || !deleteDayTarget || deletingDayId) return;
    setDeletingDayId(deleteDayTarget.id);
    const result = await deleteTrainerPlanDay(detail.item.id, deleteDayTarget.id);
    setDeletingDayId(null);

    if (!result.ok) {
      const unsupported = result.status === 404 || result.status === 405 || result.status === 501;
      notify({
        title: t("trainer.planDetail.deleteDay"),
        description: unsupported ? t("trainer.plans.actions.deleteUnsupported") : t("trainer.plans.deleteDayError"),
        variant: "error",
      });
      return;
    }

    setDeleteDayTarget(null);
    setDetail((prev) => (prev.item ? {
      ...prev,
      item: { ...prev.item, days: prev.item.days.filter((d) => d.id !== result.data.dayId) },
    } : prev));
    notify({ title: t("trainer.planDetail.deleteDay"), description: t("trainer.plans.deleteDaySuccess"), variant: "success" });
  };

  if (accessLoading || gymLoading) return <LoadingState ariaLabel={t("trainer.loading")} lines={3} />;
  if (canAccessAdminNoGymPanel) return <TrainerAdminNoGymPanel />;

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") return <TrainerGymRequiredState />;
    if (gymError) return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  const myPlansEmptyFromGym = membership.gymId == null;

  return (
    <div className="form-stack">
      <Card>
        <CardHeader>
          <CardTitle>{t("trainer.plans.createTitle")}</CardTitle>
          <CardDescription>{t("trainer.plans.createFlowDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="form-stack" style={{ gap: 10 }}>
          {createDisabled ? <p className="muted">{t("trainer.plans.createDisabled")}</p> : null}
          <div>
            <Button onClick={() => setCreateModalOpen(true)} disabled={createDisabled}>{t("trainer.plans.create")}</Button>
          </div>
          {createError ? <p className="muted" role="alert">{createErrorMessage ?? t("trainer.plans.createError")}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trainer.plans.tabs.title")}</CardTitle>
        </CardHeader>
        <CardContent className="form-stack" style={{ gap: 12 }}>
          <TrainerPlansTabs selectedTab={activeTab} onChange={setActiveTab} />

          {activeTab === "fitsculptPlans" ? (
            <section id="trainer-plans-panel-fitsculpt" role="tabpanel" aria-labelledby="trainer-plans-tab-fitsculpt">
              <Card className="form-stack" style={{ position: "relative", overflow: "hidden" }}>
                <CardHeader>
                  <CardTitle>{t("trainer.plans.tabs.fitsculptPlans")}</CardTitle>
                  <CardDescription>{t("trainer.plans.fitsculpt.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    title={t("trainer.plans.fitsculpt.emptyTitle")}
                    description={t("trainer.plans.fitsculpt.emptyDescription")}
                    wrapInCard
                    icon="info"
                  />
                </CardContent>
                <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35))", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: 12, right: 12 }}><Badge variant="warning">{t("trainer.plans.lockedBadge")}</Badge></div>
              </Card>
            </section>
          ) : (
            <section id="trainer-plans-panel-my" role="tabpanel" aria-labelledby="trainer-plans-tab-my" className="form-stack">
              {myPlansEmptyFromGym ? (
                <Card>
                  <CardContent>
                    <EmptyState
                      title={t("trainer.plans.myPlans.noGymTitle")}
                      description={t("trainer.plans.myPlans.noGymDescription")}
                      wrapInCard
                      icon="info"
                      actions={[{ label: t("trainer.plans.myPlans.goToGym"), href: "/app/gym" }]}
                    />
                  </CardContent>
                </Card>
              ) : null}

              {listState === "loading" ? <LoadingState ariaLabel={t("trainer.plans.loading")} lines={3} /> : null}
              {listState === "ready" && listError
                ? (listDisabled
                  ? <EmptyState title={t("trainer.plans.listDisabledTitle")} description={t("trainer.plans.listDisabledDescription")} wrapInCard icon="info" />
                  : <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadPlans()} wrapInCard />)
                : null}
              {listState === "ready" && !listError && plans.length === 0 ? <EmptyState title={t("trainer.plans.empty")} wrapInCard icon="info" /> : null}

              {listState === "ready" && !listError && plans.length > 0 ? (
                <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 0, listStyle: "none" }}>
                  {plans.map((plan) => (
                    <li key={plan.id}>
                      <Card>
                        <CardContent style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <div className="form-stack" style={{ gap: 4 }}>
                            <strong>{plan.title}</strong>
                            <span className="muted">{t("trainer.plans.daysCount", { count: plan.daysCount })}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Button variant="secondary" onClick={() => void loadPlanDetail(plan.id)}>{t("trainer.plans.selectPlan")}</Button>
                            <Button
                              variant="ghost"
                              disabled={!canDeletePlanById[plan.id]}
                              onClick={() => setDeletePlanTarget(plan)}
                              title={!canDeletePlanById[plan.id] ? t("trainer.plans.actions.deleteUnsupported") : undefined}
                            >
                              {t("trainer.plans.actions.delete")}
                            </Button>
                            <ButtonLink href={`/app/entrenamiento/editar?planId=${plan.id}&day=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`} variant="secondary">
                              {t("trainer.plans.editDay")}
                            </ButtonLink>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trainer.plans.dayBuilderTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="form-stack">
          {!selectedPlanId ? <p className="muted">{t("trainer.plans.dayBuilderEmpty")}</p> : null}
          {selectedPlanId && detail.loading ? <LoadingState ariaLabel={t("trainer.plans.loading")} lines={2} /> : null}
          {selectedPlanId && detail.error ? <ErrorState title={t("trainer.plans.error")} retryLabel={t("ui.retry")} onRetry={() => void loadPlanDetail(selectedPlanId)} wrapInCard /> : null}
          {detail.item ? (
            <>
              <div className="feature-card form-stack">
                <strong>{detail.item.title}</strong>
                <p className="muted" style={{ margin: 0 }}>{t("training.daysPerWeek")}: {detail.item.daysPerWeek} · {t("trainer.plans.daysCount", { count: detail.item.days?.length ?? 0 })}</p>
                <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.dayEditorHint")}</p>
              </div>

              <div className="form-stack">
                {(detail.item.days ?? []).map((day) => (
                  <article key={day.id} className="feature-card form-stack">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <strong>{day.label}</strong>
                      <Link className="btn secondary" href={`/app/entrenamiento/editar?planId=${detail.item?.id ?? ""}&day=${encodeURIComponent(day.date.slice(0, 10))}`}>{t("trainer.plans.editDay")}</Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canDeleteSelectedPlanDay}
                        onClick={() => setDeleteDayTarget({ id: day.id, label: day.label })}
                        title={!canDeleteSelectedPlanDay ? t("trainer.planDetail.notAvailableInEnvironment") : undefined}
                      >
                        {t("trainer.planDetail.deleteDay")}
                      </Button>
                    </div>
                    {day.exercises.length === 0 ? <p className="muted">{t("trainer.plans.dayExercisesEmpty")}</p> : (
                      <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                        {day.exercises.map((exercise) => <li key={exercise.id}>{exercise.name}</li>)}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Modal
        open={Boolean(deletePlanTarget)}
        onClose={() => !deletingPlanId && setDeletePlanTarget(null)}
        title={t("trainer.plans.deleteConfirmTitle")}
        description={t("trainer.plans.deleteConfirmDescription")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeletePlanTarget(null)} disabled={Boolean(deletingPlanId)}>{t("ui.cancel")}</Button>
          <Button variant="danger" onClick={() => void onDeletePlan()} loading={Boolean(deletingPlanId)} disabled={!deletePlanTarget || Boolean(deletingPlanId)}>{t("trainer.plans.actions.delete")}</Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteDayTarget)}
        onClose={() => !deletingDayId && setDeleteDayTarget(null)}
        title={t("trainer.plans.deleteDayConfirmTitle")}
        description={t("trainer.plans.deleteDayConfirmDescription")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteDayTarget(null)} disabled={Boolean(deletingDayId)}>{t("ui.cancel")}</Button>
          <Button variant="danger" onClick={() => void onDeleteDay()} loading={Boolean(deletingDayId)} disabled={!deleteDayTarget || Boolean(deletingDayId)}>{t("trainer.plans.actions.delete")}</Button>
        </div>
      </Modal>

      <Modal
        open={createModalOpen}
        onClose={() => {
          if (!creating) {
            resetCreateWizard();
            setCreateModalOpen(false);
          }
        }}
        title={t(createStep === "basics" ? "trainer.plans.wizard.basicsTitle" : "trainer.plans.wizard.scheduleTitle")}
        description={t(createStep === "basics" ? "trainer.plans.wizard.basicsDescription" : "trainer.plans.wizard.scheduleDescription")}
      >
        <form className="form-stack" onSubmit={(event) => void onCreate(event)}>
          {createError ? <p className="muted" role="alert">{createErrorMessage ?? t("trainer.plans.createError")}</p> : null}

          {createStep === "basics" ? (
            <>
              <Input label={t("trainer.plans.titleLabel")} required value={title} disabled={createDisabled || creating} onChange={(event) => setTitle(event.target.value)} />
              <Input
                type="number"
                min={1}
                max={14}
                label={t("trainer.plans.daysLabel")}
                value={daysPerWeek}
                disabled={createDisabled || creating}
                onChange={(event) => {
                  const nextValue = Math.max(1, Math.min(14, Number(event.target.value) || 1));
                  setDaysPerWeek(nextValue);
                  setScheduleWeeksAndGrid(nextValue);
                }}
              />
              <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.wizard.goToScheduleHint")}</p>
            </>
          ) : (
            <>
              <div className="form-stack" style={{ gap: 8 }}>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={scheduleWeeks}
                  onChange={(event) => setScheduleWeeksAndGrid(Number(event.target.value) || 1)}
                  label={t("trainer.plans.wizard.weeksLabel")}
                />
                <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.wizard.weekRange", { start: 1, end: scheduleWeeks })}</p>
              </div>

              <div className="form-stack" style={{ gap: 6 }}>
                {scheduleGrid.map((week, weekIndex) => (
                  <div key={`week-${weekIndex + 1}`} style={{ display: "grid", gridTemplateColumns: "80px repeat(7, minmax(44px, 1fr))", gap: 6, alignItems: "center" }}>
                    <span className="muted">{t("trainer.plans.wizard.weekLabel", { week: weekIndex + 1 })}</span>
                    {week.map((enabled, dayIndex) => {
                      const cellKey = `${weekIndex + 1}-${dayIndex + 1}`;
                      const isSelected = selectedScheduleCell === cellKey;
                      return (
                        <Button
                          key={cellKey}
                          type="button"
                          size="sm"
                          variant={enabled ? "primary" : "secondary"}
                          aria-pressed={enabled}
                          onClick={() => toggleScheduleDay(weekIndex, dayIndex)}
                          style={{ minHeight: 40, borderWidth: isSelected ? 2 : 1 }}
                        >
                          {t("trainer.plans.wizard.dayShort", { day: dayIndex + 1 })}
                        </Button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.wizard.localOnlyHint")}</p>

              {selectedDayDraft ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("trainer.plans.wizard.workoutEditorTitle")}</CardTitle>
                    <CardDescription>{t("trainer.plans.wizard.workoutEditorDescription", { day: selectedScheduleCell ?? "" })}</CardDescription>
                  </CardHeader>
                  <CardContent className="form-stack">
                    <Input
                      label={t("trainer.plans.wizard.workoutNameLabel")}
                      value={selectedDayDraft.workoutName}
                      onChange={(event) => updateSelectedDayDraft((prev) => ({ ...prev, workoutName: event.target.value }))}
                    />

                    <div className="form-stack" style={{ gap: 8 }}>
                      <span className="muted">{t("trainer.plans.wizard.exerciseSectionTitle")}</span>
                      <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.wizard.exerciseUnavailable")}</p>
                    </div>

                    <label className="form-stack" style={{ gap: 6 }}>
                      <span className="muted">{t("trainer.plans.wizard.loadTargetLabel")}</span>
                      <select
                        value={selectedDayDraft.loadTarget}
                        onChange={(event) => updateSelectedDayDraft((prev) => ({ ...prev, loadTarget: event.target.value as LoadTarget }))}
                      >
                        <option value="endurance">{t("trainer.plans.wizard.loadTarget.endurance")}</option>
                        <option value="hypertrophy">{t("trainer.plans.wizard.loadTarget.hypertrophy")}</option>
                        <option value="strength">{t("trainer.plans.wizard.loadTarget.strength")}</option>
                        <option value="maxStrength">{t("trainer.plans.wizard.loadTarget.maxStrength")}</option>
                        <option value="power">{t("trainer.plans.wizard.loadTarget.power")}</option>
                        <option value="plyometrics">{t("trainer.plans.wizard.loadTarget.plyometrics")}</option>
                      </select>
                    </label>

                    <label className="form-stack" style={{ gap: 6 }}>
                      <span className="muted">{t("trainer.plans.wizard.loadTypeLabel")}</span>
                      <select
                        value={selectedDayDraft.loadType}
                        onChange={(event) => updateSelectedDayDraft((prev) => ({ ...prev, loadType: event.target.value as LoadType }))}
                      >
                        <option value="classic">{t("trainer.plans.wizard.loadType.classic")}</option>
                        <option value="pyramid">{t("trainer.plans.wizard.loadType.pyramid")}</option>
                        <option value="dropSet">{t("trainer.plans.wizard.loadType.dropSet")}</option>
                      </select>
                    </label>

                    <div className="form-stack" style={{ gap: 8 }}>
                      <strong>{t("trainer.plans.wizard.setEditorTitle")}</strong>
                      {selectedDayDraft.sets.map((setItem, setIndex) => (
                        <div key={`set-${setIndex + 1}`} style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(90px, 1fr))", gap: 8 }}>
                          <Input
                            type="number"
                            label={t("trainer.plans.wizard.setNumberLabel")}
                            value={setItem.setNumber}
                            min={1}
                            onChange={(event) => updateSelectedDayDraft((prev) => {
                              const nextSets = [...prev.sets];
                              nextSets[setIndex] = { ...nextSets[setIndex], setNumber: Math.max(1, Number(event.target.value) || 1) };
                              return { ...prev, sets: nextSets };
                            })}
                          />
                          <Input
                            type="number"
                            label={t("trainer.plans.wizard.repsMinLabel")}
                            value={setItem.repsMin}
                            min={1}
                            onChange={(event) => updateSelectedDayDraft((prev) => {
                              const nextSets = [...prev.sets];
                              nextSets[setIndex] = { ...nextSets[setIndex], repsMin: Math.max(1, Number(event.target.value) || 1) };
                              return { ...prev, sets: nextSets };
                            })}
                          />
                          <Input
                            type="number"
                            label={t("trainer.plans.wizard.repsMaxLabel")}
                            value={setItem.repsMax}
                            min={1}
                            onChange={(event) => updateSelectedDayDraft((prev) => {
                              const nextSets = [...prev.sets];
                              nextSets[setIndex] = { ...nextSets[setIndex], repsMax: Math.max(1, Number(event.target.value) || 1) };
                              return { ...prev, sets: nextSets };
                            })}
                          />
                          <Input
                            type="number"
                            label={t("trainer.plans.wizard.restSecondsLabel")}
                            value={setItem.restSeconds}
                            min={0}
                            onChange={(event) => updateSelectedDayDraft((prev) => {
                              const nextSets = [...prev.sets];
                              nextSets[setIndex] = { ...nextSets[setIndex], restSeconds: Math.max(0, Number(event.target.value) || 0) };
                              return { ...prev, sets: nextSets };
                            })}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => updateSelectedDayDraft((prev) => ({
                          ...prev,
                          sets: [...prev.sets, { setNumber: prev.sets.length + 1, repsMin: 8, repsMax: 12, restSeconds: 60 }],
                        }))}
                      >
                        {t("trainer.plans.wizard.addSet")}
                      </Button>
                      <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.wizard.savedLocallyHint")}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="muted">{t("trainer.plans.wizard.selectDayForEditor")}</p>
              )}
            </>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {createStep === "schedule" ? (
              <Button type="button" variant="ghost" onClick={() => setCreateStep("basics")} disabled={creating}>{t("trainer.plans.wizard.backToBasics")}</Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => {
              resetCreateWizard();
              setCreateModalOpen(false);
            }} disabled={creating}>
              {t("ui.cancel")}
            </Button>
            {createStep === "basics" ? (
              <Button type="button" onClick={() => setCreateStep("schedule")} disabled={createDisabled || creating || !title.trim()}>{t("trainer.plans.wizard.continue")}</Button>
            ) : (
              <Button type="submit" disabled={createDisabled || creating || !title.trim()} loading={creating}>{t("trainer.plans.create")}</Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
