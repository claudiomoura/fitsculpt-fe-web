"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import TrainerGymRequiredState from "@/components/trainer/TrainerGymRequiredState";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";
import ExerciseLibrarySelector from "@/components/exercises/ExerciseLibrarySelector";
import { useLanguage } from "@/context/LanguageProvider";
import { useToast } from "@/design-system/components/Toast";
import { extractTrainerClients, type TrainerClient } from "@/lib/trainerClients";
import type { TrainingPlanDetail, TrainingPlanExercise, TrainingPlanListItem } from "@/lib/types";
import {
  addExerciseToPlanDay,
  createTrainerPlan,
  deleteTrainerPlan,
  getTrainerPlanDetail,
  listCurrentGymTrainerPlans,
  saveTrainerPlan,
  updatePlanDayExercise,
} from "@/services/trainer/plans";

type DayExerciseDraft = {
  exerciseId: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
};

type DayExerciseSelection = Record<number, DayExerciseDraft[]>;

const EMPTY_EXERCISES: DayExerciseDraft[] = [];

function dayLabel(dayIndex: number) {
  const week = Math.floor(dayIndex / 7) + 1;
  const day = (dayIndex % 7) + 1;
  return `Semana ${week} · Día ${day}`;
}

function parseRepsRange(reps: string | null | undefined) {
  const raw = typeof reps === "string" ? reps.trim() : "";
  const [minRaw, maxRaw] = raw.split("-").map((part) => Number(part));
  const min = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : 8;
  const max = Number.isFinite(maxRaw) && maxRaw >= min ? maxRaw : 12;
  return { min, max };
}

function toDayExerciseDraft(exercise: TrainingPlanExercise): DayExerciseDraft {
  const reps = parseRepsRange(exercise.reps);
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    sets: typeof exercise.sets === "number" && exercise.sets > 0 ? exercise.sets : 3,
    repsMin: reps.min,
    repsMax: reps.max,
    restSeconds: typeof exercise.rest === "number" && exercise.rest >= 0 ? exercise.rest : 60,
  };
}

function normalizeDaysShape(daysCount: number, current: DayExerciseSelection): DayExerciseSelection {
  const next: DayExerciseSelection = {};
  for (let dayIndex = 0; dayIndex < daysCount; dayIndex += 1) {
    next[dayIndex] = current[dayIndex] ?? [];
  }
  return next;
}

export default function TrainerPlansPageClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [plans, setPlans] = useState<TrainingPlanListItem[]>([]);
  const [members, setMembers] = useState<TrainerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState(false);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weeks, setWeeks] = useState(4);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [dayExercises, setDayExercises] = useState<DayExerciseSelection>({});

  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanLoading, setEditingPlanLoading] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  const daysCount = Math.max(1, weeks * 7);

  useEffect(() => {
    setDayExercises((prev) => normalizeDaysShape(daysCount, prev));
    setSelectedDayIndex((prev) => Math.min(prev, daysCount - 1));
  }, [daysCount]);

  const selectedDayExerciseList = useMemo(
    () => dayExercises[selectedDayIndex] ?? EMPTY_EXERCISES,
    [dayExercises, selectedDayIndex],
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setPermissionsError(false);

    try {
      const [plansResult, membersRes] = await Promise.all([
        listCurrentGymTrainerPlans({ limit: 100 }),
        fetch("/api/trainer/clients", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (!plansResult.ok) {
        setPlans([]);
        setPermissionsError(plansResult.status === 401 || plansResult.status === 403);
      } else {
        setPlans(plansResult.data.items);
      }

      if (membersRes.ok) {
        const membersPayload = (await membersRes.json()) as unknown;
        setMembers(extractTrainerClients(membersPayload));
      } else {
        setMembers([]);
      }

      if (!plansResult.ok) {
        setError(
          plansResult.status === 401 || plansResult.status === 403
            ? "No se pudieron validar los permisos de entrenador ahora mismo."
            : t("trainer.error"),
        );
      }
    } catch {
      setError(t("trainer.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccessTrainerArea) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccessTrainerArea]);

  const resetBuilder = () => {
    setTitle("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setWeeks(4);
    setSelectedDayIndex(0);
    setDayExercises({});
    setEditingPlanId(null);
  };

  const updateExerciseInDay = (dayIndex: number, exerciseId: string, updater: (current: DayExerciseDraft) => DayExerciseDraft) => {
    setDayExercises((prev) => ({
      ...prev,
      [dayIndex]: (prev[dayIndex] ?? []).map((exercise) =>
        exercise.exerciseId === exerciseId ? updater(exercise) : exercise,
      ),
    }));
  };

  const startEditingPlan = async (planId: string) => {
    if (!planId || editingPlanLoading || saving) return;
    setEditingPlanLoading(true);
    setError(null);
    try {
      const result = await getTrainerPlanDetail(planId);
      if (!result.ok) {
        throw new Error("LOAD_PLAN_ERROR");
      }

      const payload = result.data;
      setEditingPlanId(payload.id);
      setTitle(payload.title ?? "");
      setStartDate(payload.startDate ? new Date(payload.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      const nextDaysCount = Math.max(1, payload.daysCount ?? 7);
      setWeeks(Math.max(1, Math.min(12, Math.ceil(nextDaysCount / 7))));

      const nextDayExercises: DayExerciseSelection = {};
      for (let dayIndex = 0; dayIndex < nextDaysCount; dayIndex += 1) {
        nextDayExercises[dayIndex] = [];
      }

      (payload.days ?? []).forEach((day, index) => {
        const dayIndex = index;
        nextDayExercises[dayIndex] = (day.exercises ?? []).map(toDayExerciseDraft);
      });

      setDayExercises(nextDayExercises);
      setSelectedDayIndex(0);
      setAssignmentMessage(null);
    } catch {
      setError("No se pudo cargar el plan para editarlo.");
    } finally {
      setEditingPlanLoading(false);
    }
  };

  const applyCurrentDayToAllDays = () => {
    const source = dayExercises[selectedDayIndex] ?? [];
    setDayExercises((prev) => {
      const next: DayExerciseSelection = { ...prev };
      for (let dayIndex = 0; dayIndex < daysCount; dayIndex += 1) {
        next[dayIndex] = source.map((exercise) => ({ ...exercise }));
      }
      return next;
    });
  };

  const clearCurrentDay = () => {
    setDayExercises((prev) => ({ ...prev, [selectedDayIndex]: [] }));
  };

  const createPayloadDays = () => {
    return Array.from({ length: daysCount }).map((_, dayIndex) => {
      const exercises = (dayExercises[dayIndex] ?? []).map((exercise) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets: Math.max(1, exercise.sets),
        reps: `${Math.max(1, exercise.repsMin)}-${Math.max(exercise.repsMin, exercise.repsMax)}`,
        rest: Math.max(0, exercise.restSeconds),
      }));

      return {
        dayIndex,
        label: dayLabel(dayIndex),
        exercises,
      };
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    setError(null);
    setAssignmentMessage(null);

    try {
      const payloadDays = createPayloadDays();
      const payload = {
        title: title.trim(),
        startDate,
        daysPerWeek: Math.min(7, Math.max(1, Math.round(daysCount / weeks))),
        daysCount,
        days: payloadDays,
      };

      if (!editingPlanId) {
        const createResult = await createTrainerPlan(payload);
        if (!createResult.ok) {
          throw new Error("CREATE_ERROR");
        }
      } else {
        const saveResult = await saveTrainerPlan(editingPlanId, {
          title: payload.title,
          startDate: payload.startDate,
          daysCount: payload.daysCount,
        });

        if (!saveResult.ok) {
          throw new Error("UPDATE_ERROR");
        }

        const refreshed = await getTrainerPlanDetail(editingPlanId);
        if (!refreshed.ok) {
          throw new Error("UPDATE_ERROR");
        }

        const daysByIndex = new Map<number, string>();
        (refreshed.data.days ?? []).forEach((day, index) => {
          daysByIndex.set(index, day.id);
        });

        for (const day of payloadDays) {
          const dayId = daysByIndex.get(day.dayIndex);
          if (!dayId) continue;

          for (const exercise of day.exercises) {
            const addResult = await addExerciseToPlanDay({
              planId: editingPlanId,
              dayId,
              exerciseId: exercise.exerciseId,
            });

            if (!addResult.ok) continue;

            const exerciseDetail = await getTrainerPlanDetail(editingPlanId);
            if (!exerciseDetail.ok) continue;

            const targetDay = (exerciseDetail.data.days ?? []).find((item) => item.id === dayId);
            const createdExercise = (targetDay?.exercises ?? []).find((item) => item.name === exercise.name);
            if (!createdExercise) continue;

            await updatePlanDayExercise({
              planId: editingPlanId,
              dayId,
              exerciseId: createdExercise.id,
              sets: exercise.sets,
              reps: exercise.reps,
              rest: exercise.rest,
            });
          }
        }
      }

      resetBuilder();
      await loadData();
      notify({
        title: t("common.success"),
        description: editingPlanId ? "Plan actualizado correctamente." : "Plan creado correctamente.",
        variant: "success",
      });
    } catch {
      setError(t("trainer.error"));
    } finally {
      setSaving(false);
    }
  };

  const onDeletePlan = async (planId: string) => {
    if (deletingPlanId) return;
    setDeletingPlanId(planId);
    setError(null);

    try {
      const result = await deleteTrainerPlan(planId);
      if (!result.ok) {
        throw new Error("DELETE_ERROR");
      }
      await loadData();
      if (editingPlanId === planId) {
        resetBuilder();
      }
    } catch {
      setError("No se pudo eliminar el plan.");
    } finally {
      setDeletingPlanId(null);
    }
  };

  const assignPlan = async () => {
    if (!selectedPlanId || !selectedMemberId || assigning) return;
    setAssigning(true);
    setAssignmentMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/trainer/clients/${selectedMemberId}/assigned-plan`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainingPlanId: selectedPlanId }),
        },
      );

      if (!response.ok) throw new Error("ASSIGN_ERROR");

      const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
      const selectedMember = members.find((member) => member.id === selectedMemberId);
      setAssignmentMessage(
        `Plan "${selectedPlan?.title ?? ""}" asignado a ${selectedMember?.name ?? selectedMember?.email ?? "miembro"}.`,
      );
      setSelectedPlanId("");
      setSelectedMemberId("");
    } catch {
      setError(t("trainer.error"));
    } finally {
      setAssigning(false);
    }
  };

  if (accessLoading || gymLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (canAccessAdminNoGymPanel) {
    return <TrainerAdminNoGymPanel />;
  }

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") {
      return <TrainerGymRequiredState />;
    }

    if (gymError) {
      return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <section className="section-stack" data-testid="trainer-plans-page">
      <h1 className="section-title">Planes del gimnasio</h1>

      <form className="card form-stack" onSubmit={onSubmit}>
        <h2 style={{ margin: 0 }}>{editingPlanId ? "Editar plan de entrenamiento" : "Crear plan de entrenamiento"}</h2>
        <p className="muted" style={{ margin: 0 }}>
          Define semanas y configura ejercicios por día con series, repeticiones y descanso.
        </p>

        <label className="form-stack" style={{ gap: 6 }}>
          <span>Título</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(120px, 1fr))", gap: 10 }}>
          <label className="form-stack" style={{ gap: 6 }}>
            <span>Inicio</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="form-stack" style={{ gap: 6 }}>
            <span>Semanas</span>
            <input
              type="number"
              min={1}
              max={12}
              value={weeks}
              onChange={(event) => setWeeks(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
            />
          </label>
        </div>

        <div className="card" style={{ border: "1px solid var(--surface-border-default)", padding: 12 }}>
          <div className="inline-actions-sm" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <strong>Planificación diaria</strong>
            <span className="muted">{daysCount} días totales</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginTop: 10 }}>
            {Array.from({ length: daysCount }).map((_, dayIndex) => {
              const isActive = dayIndex === selectedDayIndex;
              const exerciseCount = (dayExercises[dayIndex] ?? []).length;
              return (
                <button
                  key={dayIndex}
                  type="button"
                  className={`btn ${isActive ? "" : "secondary"}`}
                  style={{ height: 44, justifyContent: "space-between", paddingInline: 10 }}
                  onClick={() => setSelectedDayIndex(dayIndex)}
                >
                  <span>D{dayIndex + 1}</span>
                  <span className="badge">{exerciseCount}</span>
                </button>
              );
            })}
          </div>

          <div className="card" style={{ marginTop: 12, border: "1px solid var(--surface-border-default)", padding: 12 }}>
            <div className="inline-actions-sm" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <strong>{dayLabel(selectedDayIndex)}</strong>
              <div className="inline-actions-sm">
                <button type="button" className="btn secondary" onClick={clearCurrentDay}>Limpiar día</button>
                <button type="button" className="btn secondary" onClick={applyCurrentDayToAllDays}>Aplicar a todos</button>
              </div>
            </div>

            <ExerciseLibrarySelector
              disabled={saving}
              selectedExercises={selectedDayExerciseList}
              onSelect={(exercise) => {
                setDayExercises((prev) => {
                  const current = prev[selectedDayIndex] ?? [];
                  if (current.some((item) => item.exerciseId === exercise.exerciseId)) return prev;
                  return {
                    ...prev,
                    [selectedDayIndex]: [
                      ...current,
                      {
                        ...exercise,
                        sets: 3,
                        repsMin: 8,
                        repsMax: 12,
                        restSeconds: 60,
                      },
                    ],
                  };
                });
              }}
            />

            {selectedDayExerciseList.length > 0 ? (
              <ul className="form-stack" style={{ margin: "10px 0 0", listStyle: "none", paddingInlineStart: 0, gap: 8 }}>
                {selectedDayExerciseList.map((exercise) => (
                  <li key={exercise.exerciseId} className="card form-stack" style={{ gap: 8, padding: 10 }}>
                    <div className="inline-actions-sm" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{exercise.name}</strong>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => {
                          setDayExercises((prev) => ({
                            ...prev,
                            [selectedDayIndex]: (prev[selectedDayIndex] ?? []).filter((item) => item.exerciseId !== exercise.exerciseId),
                          }));
                        }}
                      >
                        {`${t("ui.remove")}: ${exercise.name}`}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(90px, 1fr))", gap: 8 }}>
                      <label className="form-stack" style={{ gap: 4 }}>
                        <span className="muted">Series</span>
                        <input
                          type="number"
                          min={1}
                          value={exercise.sets}
                          onChange={(event) => updateExerciseInDay(selectedDayIndex, exercise.exerciseId, (current) => ({
                            ...current,
                            sets: Math.max(1, Number(event.target.value) || 1),
                          }))}
                        />
                      </label>
                      <label className="form-stack" style={{ gap: 4 }}>
                        <span className="muted">Reps mín</span>
                        <input
                          type="number"
                          min={1}
                          value={exercise.repsMin}
                          onChange={(event) => updateExerciseInDay(selectedDayIndex, exercise.exerciseId, (current) => ({
                            ...current,
                            repsMin: Math.max(1, Number(event.target.value) || 1),
                          }))}
                        />
                      </label>
                      <label className="form-stack" style={{ gap: 4 }}>
                        <span className="muted">Reps máx</span>
                        <input
                          type="number"
                          min={1}
                          value={exercise.repsMax}
                          onChange={(event) => updateExerciseInDay(selectedDayIndex, exercise.exerciseId, (current) => ({
                            ...current,
                            repsMax: Math.max(1, Number(event.target.value) || 1),
                          }))}
                        />
                      </label>
                      <label className="form-stack" style={{ gap: 4 }}>
                        <span className="muted">Descanso (seg)</span>
                        <input
                          type="number"
                          min={0}
                          value={exercise.restSeconds}
                          onChange={(event) => updateExerciseInDay(selectedDayIndex, exercise.exerciseId, (current) => ({
                            ...current,
                            restSeconds: Math.max(0, Number(event.target.value) || 0),
                          }))}
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: "10px 0 0" }}>Aún no hay ejercicios seleccionados para este día.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn"
          disabled={saving || !title.trim()}
        >
          {saving ? t("ui.loading") : editingPlanId ? "Guardar cambios" : "Crear plan de entrenamiento"}
        </button>
        {editingPlanId ? (
          <button type="button" className="btn secondary" onClick={resetBuilder} disabled={saving}>
            Cancelar edición
          </button>
        ) : null}
      </form>

      <section className="card form-stack">
        <h2 style={{ margin: 0 }}>Planes del gimnasio</h2>
        {loading ? <p className="muted">{t("common.loading")}</p> : null}
        {error ? <p className="muted">{error}</p> : null}
        {permissionsError ? (
          <p className="muted">
            Verifica que tu usuario tenga membresía activa como TRAINER/ADMIN en un gimnasio.
          </p>
        ) : null}
        {!loading && !error && plans.length === 0 ? (
          <p className="muted">No hay planes de entrenamiento todavía.</p>
        ) : null}
        {!loading && !error && plans.length > 0 ? (
          <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
            {plans.map((plan) => (
              <li key={plan.id}>
                <strong>{plan.title}</strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {plan.daysCount ?? 0} días · {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : "Sin fecha"}
                </p>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => void startEditingPlan(plan.id)}
                    disabled={editingPlanLoading || saving}
                  >
                    {editingPlanId === plan.id && editingPlanLoading ? t("ui.loading") : "Editar"}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => void onDeletePlan(plan.id)}
                    disabled={deletingPlanId === plan.id}
                  >
                    {deletingPlanId === plan.id ? t("ui.loading") : t("ui.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card form-stack">
        <h2 style={{ margin: 0 }}>Asignar plan a miembro</h2>
        <p className="muted" style={{ margin: 0 }}>
          Selecciona un miembro del gimnasio y el plan a asignar.
        </p>

        <label className="form-stack" style={{ gap: 6 }}>
          <span>Miembro</span>
          <select
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
            disabled={assigning || members.length === 0}
          >
            <option value="">Selecciona un miembro</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || member.email || member.id}
              </option>
            ))}
          </select>
        </label>

        <label className="form-stack" style={{ gap: 6 }}>
          <span>Plan</span>
          <select
            value={selectedPlanId}
            onChange={(event) => setSelectedPlanId(event.target.value)}
            disabled={assigning || plans.length === 0}
          >
            <option value="">Selecciona un plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn"
          disabled={assigning || !selectedPlanId || !selectedMemberId}
          onClick={() => void assignPlan()}
        >
          {assigning ? t("ui.loading") : "Asignar plan"}
        </button>

        {members.length === 0 ? (
          <p className="muted">Aún no hay miembros disponibles para asignar.</p>
        ) : null}
        {plans.length === 0 ? (
          <p className="muted">Primero crea un plan para poder asignarlo.</p>
        ) : null}
        {assignmentMessage ? (
          <p className="muted">{assignmentMessage}</p>
        ) : null}
      </section>
    </section>
  );
}
