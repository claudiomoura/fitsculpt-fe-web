"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Workout, WorkoutExercise } from "@/lib/types";

type WorkoutListItem = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  durationMin: number | null;
  notes: string | null;
};

type ExerciseOption = {
  id: string;
  name: string;
};

type WorkoutExerciseForm = {
  exerciseId?: string;
  name: string;
  sets?: string;
  reps?: string;
  restSeconds?: number;
  notes?: string;
};

export default function WorkoutsClient() {
  const { t, locale } = useLanguage();
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMin, setDurationMin] = useState<number>(45);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [sort, setSort] = useState<
    "date_desc" | "date_asc" | "duration_desc" | "duration_asc"
  >("date_desc");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([]);
  const [exerciseDrafts, setExerciseDrafts] = useState<WorkoutExerciseForm[]>([]);

  const loadWorkouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workouts", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("FETCH_FAILED");
      }
      const data = (await response.json()) as Workout[];
      const mapped = data.map((item) => ({
        id: item.id,
        name: item.name,
        notes: item.notes ?? null,
        durationMin: item.durationMin ?? null,
        date: item.scheduledAt ? item.scheduledAt.slice(0, 10) : "",
      }));
      setWorkouts(mapped);
    } catch (_err) {
      setError(t("workouts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

  useEffect(() => {
    const controller = new AbortController();
    const loadExercises = async () => {
      try {
        const params = new URLSearchParams({ limit: "200" });
        const response = await fetch(`/api/exercises?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { items?: ExerciseOption[] };
        setExerciseOptions(data.items ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    };
    void loadExercises();
    return () => controller.abort();
  }, []);

  const editingWorkout = useMemo(
    () => workouts.find((w) => w.id === editingId) || null,
    [workouts, editingId]
  );

  const visibleWorkouts = useMemo(() => {
    const q = query.trim().toLowerCase();

    const items = workouts.filter((w) => {
      const matchesQuery =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.notes || "").toLowerCase().includes(q);

      const matchesFrom = !fromDate || w.date >= fromDate;
      const matchesTo = !toDate || w.date <= toDate;

      return matchesQuery && matchesFrom && matchesTo;
    });

    items.sort((a, b) => {
      if (sort === "date_desc") return b.date.localeCompare(a.date);
      if (sort === "date_asc") return a.date.localeCompare(b.date);
      const durationA = a.durationMin ?? 0;
      const durationB = b.durationMin ?? 0;
      if (sort === "duration_desc") return durationB - durationA;
      if (sort === "duration_asc") return durationA - durationB;
      return 0;
    });

    return items;
  }, [workouts, query, fromDate, toDate, sort]);

  const calendarDays = useMemo(() => {
    const base = new Date(Date.UTC(2023, 0, 2));
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(base);
      date.setUTCDate(base.getUTCDate() + index);
      return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
    });
  }, [locale]);

  const { calendarWorkouts, undatedWorkouts } = useMemo(() => {
    const calendarWorkouts = Array.from({ length: 7 }).map(() => [] as WorkoutListItem[]);
    const undatedWorkouts: WorkoutListItem[] = [];

    visibleWorkouts.forEach((workout) => {
      if (!workout.date) {
        undatedWorkouts.push(workout);
        return;
      }
      const date = new Date(`${workout.date}T00:00:00`);
      const dayIndex = (date.getDay() + 6) % 7;
      calendarWorkouts[dayIndex].push(workout);
    });

    return { calendarWorkouts, undatedWorkouts };
  }, [visibleWorkouts]);

  function resetForm() {
    setName("");
    setDate(new Date().toISOString().slice(0, 10));
    setDurationMin(45);
    setNotes("");
    setEditingId(null);
    setExerciseDrafts([]);
  }

  const buildExercisePayload = () =>
    exerciseDrafts
      .filter((exercise) => exercise.name.trim())
      .map((exercise, index) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name.trim(),
        sets: exercise.sets?.trim() || undefined,
        reps: exercise.reps?.trim() || undefined,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes?.trim() || undefined,
        order: index,
      }));

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    const notesValue = notes.trim();
    const response = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmed,
        notes: notesValue ? notesValue : undefined,
        scheduledAt: date ? new Date(date).toISOString() : undefined,
        durationMin: Number(durationMin) || 0,
        exercises: buildExercisePayload(),
      }),
    });

    if (!response.ok) {
      setError(t("workouts.saveError"));
      return;
    }

    await loadWorkouts();
    resetForm();
  }

  async function startEdit(w: WorkoutListItem) {
    setEditingId(w.id);
    setName(w.name);
    setDate(w.date || new Date().toISOString().slice(0, 10));
    setDurationMin(w.durationMin ?? 0);
    setNotes(w.notes ?? "");
    try {
      const response = await fetch(`/api/workouts/${w.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as Workout;
      const exercises = Array.isArray(data.exercises)
        ? data.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId ?? undefined,
            name: exercise.name ?? "",
            sets: typeof exercise.sets === "string" ? exercise.sets : exercise.sets?.toString(),
            reps: typeof exercise.reps === "string" ? exercise.reps : exercise.reps?.toString(),
            restSeconds:
              typeof exercise.restSeconds === "number"
                ? exercise.restSeconds
                : exercise.restSeconds
                  ? Number(exercise.restSeconds)
                  : undefined,
            notes: exercise.notes ?? undefined,
          }))
        : [];
      setExerciseDrafts(exercises);
    } catch (_err) {
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWorkout) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const notesValue = notes.trim();
    const response = await fetch(`/api/workouts/${editingWorkout.id}` as string, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmed,
        notes: notesValue ? notesValue : undefined,
        scheduledAt: date ? new Date(date).toISOString() : undefined,
        durationMin: Number(durationMin) || 0,
        exercises: buildExercisePayload(),
      }),
    });

    if (!response.ok) {
      setError(t("workouts.updateError"));
      return;
    }

    await loadWorkouts();
    resetForm();
  }

  async function remove(id: string) {
    const ok = window.confirm(t("workouts.confirmDelete"));
    if (!ok) return;

    const response = await fetch(`/api/workouts/${id}` as string, { method: "DELETE" });
    if (!response.ok) {
      setError(t("workouts.deleteError"));
      return;
    }
    await loadWorkouts();
    if (editingId === id) {
      resetForm();
    }
  }

  const addExerciseDraft = () => {
    setExerciseDrafts((prev) => [...prev, { name: "", sets: "", reps: "" }]);
  };

  const updateExerciseDraft = (
    index: number,
    field: keyof WorkoutExerciseForm,
    value: string | number
  ) => {
    setExerciseDrafts((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      if (field === "restSeconds") {
        current.restSeconds = value ? Number(value) : undefined;
      } else {
        current[field] = value as string;
      }
      next[index] = current;
      return next;
    });
  };

  const removeExerciseDraft = (index: number) => {
    setExerciseDrafts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const isEditing = Boolean(editingId);

  return (
    <div className="page">
      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>
          {isEditing ? t("workouts.editWorkout") : t("workouts.newWorkout")}
        </h2>

        <form
          onSubmit={isEditing ? submitEdit : submitNew}
          className="form-stack"
          style={{ marginTop: 12 }}
        >
          <label className="form-stack">
            {t("workouts.name")}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: tren superior, HIIT, carrera..."
              required
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {t("workouts.date")}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label className="form-stack">
              {t("workouts.duration")}
              <input
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <label className="form-stack">
            {t("workouts.notes")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: carga, series, sensaciones..."
              rows={3}
            />
          </label>

          <div className="form-stack">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <strong>{t("workouts.exercisesTitle")}</strong>
              <button type="button" className="btn secondary" onClick={addExerciseDraft}>
                {t("workouts.addExercise")}
              </button>
            </div>
            {exerciseDrafts.length === 0 ? (
              <p className="muted">{t("workouts.exercisesEmpty")}</p>
            ) : (
              <div className="form-stack">
                {exerciseDrafts.map((exercise, index) => (
                  <div key={`${exercise.name}-${index}`} className="card" style={{ padding: 12 }}>
                    <div className="form-stack">
                      <label className="form-stack">
                        {t("workouts.exerciseLabel")}
                        <select
                          value={exercise.exerciseId ?? ""}
                          onChange={(event) => {
                            const selectedId = event.target.value;
                            const selected = exerciseOptions.find((item) => item.id === selectedId);
                            updateExerciseDraft(index, "exerciseId", selectedId);
                            updateExerciseDraft(index, "name", selected?.name ?? "");
                          }}
                        >
                          <option value="">{t("workouts.exerciseSelect")}</option>
                          {exerciseOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-stack">
                        {t("workouts.exerciseName")}
                        <input
                          value={exercise.name}
                          onChange={(event) => updateExerciseDraft(index, "name", event.target.value)}
                          placeholder={t("workouts.exerciseNamePlaceholder")}
                        />
                      </label>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                        <label className="form-stack">
                          {t("workouts.exerciseSets")}
                          <input
                            value={exercise.sets ?? ""}
                            onChange={(event) => updateExerciseDraft(index, "sets", event.target.value)}
                            placeholder="3"
                          />
                        </label>
                        <label className="form-stack">
                          {t("workouts.exerciseReps")}
                          <input
                            value={exercise.reps ?? ""}
                            onChange={(event) => updateExerciseDraft(index, "reps", event.target.value)}
                            placeholder="8-12"
                          />
                        </label>
                        <label className="form-stack">
                          {t("workouts.exerciseRest")}
                          <input
                            type="number"
                            min={0}
                            value={exercise.restSeconds ?? ""}
                            onChange={(event) => updateExerciseDraft(index, "restSeconds", event.target.value)}
                            placeholder="60"
                          />
                        </label>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => removeExerciseDraft(index)}
                        >
                          {t("workouts.removeExercise")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="btn">{isEditing ? t("workouts.save") : t("workouts.add")}</button>

            {isEditing && (
              <button type="button" className="btn secondary" onClick={resetForm}>
                {t("workouts.cancel")}
              </button>
            )}

            {error ? (
              <span style={{ marginLeft: "auto", color: "#b42318" }}>{error}</span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("workouts.list")}</h2>
            <span className="muted">
              ({visibleWorkouts.length} de {workouts.length})
            </span>
          </div>
          <div className="segmented-control">
            <button
              type="button"
              className={`btn secondary ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              {t("workouts.viewList")}
            </button>
            <button
              type="button"
              className={`btn secondary ${viewMode === "calendar" ? "is-active" : ""}`}
              onClick={() => setViewMode("calendar")}
            >
              {t("workouts.viewCalendar")}
            </button>
          </div>
        </div>

        <div className="form-stack" style={{ marginTop: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("workouts.searchPlaceholder")}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <label className="form-stack">
              {t("workouts.from")}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label className="form-stack">
              {t("workouts.to")}
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>

            <label className="form-stack">
              {t("workouts.sort")}
              <select value={sort} onChange={(e) => setSort(e.target.value as never)}>
                <option value="date_desc">{t("workouts.sortNewest")}</option>
                <option value="date_asc">{t("workouts.sortOldest")}</option>
                <option value="duration_desc">{t("workouts.sortDurationDesc")}</option>
                <option value="duration_asc">{t("workouts.sortDurationAsc")}</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setQuery("");
                setFromDate("");
                setToDate("");
                setSort("date_desc");
              }}
            >
              {t("workouts.clearFilters")}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ marginTop: 12 }} className="muted">{t("workouts.loading")}</p>
        ) : workouts.length === 0 ? (
          <p style={{ marginTop: 12 }} className="muted">
            {t("workouts.empty")}
          </p>
        ) : viewMode === "list" ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "12px 0 0",
              display: "grid",
              gap: 10,
            }}
          >
            {visibleWorkouts.map((w) => (
              <li
                key={w.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{w.name}</strong>
                  <span className="muted">
                    {w.date || t("workouts.noDate")} , {w.durationMin ?? 0} min
                  </span>
                </div>

                {w.notes ? <p style={{ margin: 0 }} className="muted">{w.notes}</p> : null}

                <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                  <Link className="btn secondary" href={`/app/entrenamientos/${w.id}`}>
                    {t("workouts.viewDetail")}
                  </Link>
                  <button type="button" className="btn secondary" onClick={() => startEdit(w)}>
                    {t("workouts.edit")}
                  </button>
                  <button type="button" className="btn secondary" onClick={() => remove(w.id)}>
                    {t("workouts.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : visibleWorkouts.length === 0 ? (
          <p style={{ marginTop: 12 }} className="muted">
            {t("workouts.calendarEmpty")}
          </p>
        ) : (
          <>
            <div className="calendar-grid" style={{ marginTop: 16 }}>
              {calendarDays.map((dayLabel, index) => (
                <div key={dayLabel} className="calendar-day">
                  <strong>{dayLabel}</strong>
                  {calendarWorkouts[index].length === 0 ? (
                    <span className="muted">{t("workouts.calendarDayEmpty")}</span>
                  ) : (
                    calendarWorkouts[index].map((workout) => (
                      <div key={workout.id} className="calendar-card">
                        <strong>{workout.name}</strong>
                        <span className="muted">{workout.durationMin ?? 0} min</span>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Link className="btn secondary" href={`/app/entrenamientos/${workout.id}`}>
                            {t("workouts.viewDetail")}
                          </Link>
                          <button type="button" className="btn secondary" onClick={() => startEdit(workout)}>
                            {t("workouts.edit")}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
            {undatedWorkouts.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 8 }}>{t("workouts.noDate")}</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {undatedWorkouts.map((workout) => (
                    <div key={workout.id} className="feature-card">
                      <strong>{workout.name}</strong>
                      <span className="muted">{workout.durationMin ?? 0} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
