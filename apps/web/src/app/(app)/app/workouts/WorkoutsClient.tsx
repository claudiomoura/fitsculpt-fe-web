"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Workout } from "@/lib/types";

type WorkoutListItem = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  durationMin: number | null;
  notes: string | null;
};

type SessionLog = {
  id: string;
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  loadKg: number;
  rpe: number;
};

const SESSION_STORAGE_KEY = "fs_session_logs_v1";

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

  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionExercise, setSessionExercise] = useState("");
  const [sessionSets, setSessionSets] = useState(3);
  const [sessionReps, setSessionReps] = useState(10);
  const [sessionLoad, setSessionLoad] = useState(20);
  const [sessionRpe, setSessionRpe] = useState(7);

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
    } catch {
      setError(t("workouts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as SessionLog[];
      setSessionLogs(parsed ?? []);
    } catch {
      setSessionLogs([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionLogs));
  }, [sessionLogs]);

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

  const sessionsByDate = useMemo(() => {
    return sessionLogs.reduce<Record<string, SessionLog[]>>((acc, entry) => {
      acc[entry.date] = acc[entry.date] ? [...acc[entry.date], entry] : [entry];
      return acc;
    }, {});
  }, [sessionLogs]);

  const progressionByExercise = useMemo(() => {
    const byExercise: Record<string, SessionLog[]> = {};
    sessionLogs.forEach((entry) => {
      if (!byExercise[entry.exercise]) byExercise[entry.exercise] = [];
      byExercise[entry.exercise].push(entry);
    });

    return Object.entries(byExercise).map(([exercise, logs]) => {
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      const delta = prev ? latest.loadKg - prev.loadKg : 0;
      return {
        exercise,
        latest,
        delta,
      };
    });
  }, [sessionLogs]);

  function resetForm() {
    setName("");
    setDate(new Date().toISOString().slice(0, 10));
    setDurationMin(45);
    setNotes("");
    setEditingId(null);
  }

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
      }),
    });

    if (!response.ok) {
      setError(t("workouts.saveError"));
      return;
    }

    await loadWorkouts();
    resetForm();
  }

  function startEdit(w: WorkoutListItem) {
    setEditingId(w.id);
    setName(w.name);
    setDate(w.date || new Date().toISOString().slice(0, 10));
    setDurationMin(w.durationMin ?? 0);
    setNotes(w.notes ?? "");
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

  function addSessionEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionExercise.trim()) return;

    const entry: SessionLog = {
      id: `${sessionDate}-${Date.now()}`,
      date: sessionDate,
      exercise: sessionExercise.trim(),
      sets: Number(sessionSets),
      reps: Number(sessionReps),
      loadKg: Number(sessionLoad),
      rpe: Number(sessionRpe),
    };
    setSessionLogs((prev) => [entry, ...prev]);
    setSessionExercise("");
  }

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
                  <Link className="btn secondary" href={`/app/entrenamiento/${w.id}`}>
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
                          <Link className="btn secondary" href={`/app/entrenamiento/${workout.id}`}>
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

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("workouts.sessionTitle")}</h2>
            <p className="section-subtitle">{t("workouts.sessionSubtitle")}</p>
          </div>
        </div>
        <form onSubmit={addSessionEntry} className="form-stack">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {t("workouts.sessionDate")}
              <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </label>
            <label className="form-stack">
              {t("workouts.sessionExercise")}
              <input
                value={sessionExercise}
                onChange={(e) => setSessionExercise(e.target.value)}
                placeholder={t("workouts.sessionExercisePlaceholder")}
              />
            </label>
            <label className="form-stack">
              {t("workouts.sessionSets")}
              <input type="number" min={1} value={sessionSets} onChange={(e) => setSessionSets(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {t("workouts.sessionReps")}
              <input type="number" min={1} value={sessionReps} onChange={(e) => setSessionReps(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {t("workouts.sessionLoad")}
              <input type="number" min={0} value={sessionLoad} onChange={(e) => setSessionLoad(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {t("workouts.sessionRpe")}
              <input type="number" min={1} max={10} value={sessionRpe} onChange={(e) => setSessionRpe(Number(e.target.value))} />
            </label>
          </div>
          <button type="submit" className="btn" style={{ width: "fit-content" }}>{t("workouts.sessionAdd")}</button>
        </form>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {Object.keys(sessionsByDate).length === 0 ? (
            <p className="muted">{t("workouts.sessionEmpty")}</p>
          ) : (
            Object.entries(sessionsByDate).map(([day, entries]) => (
              <div key={day} className="feature-card">
                <strong>{day}</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      {entry.exercise}: {entry.sets}x{entry.reps} · {entry.loadKg}kg · RPE {entry.rpe}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("workouts.progressTitle")}</h2>
        <div className="list-grid" style={{ marginTop: 16 }}>
          {progressionByExercise.length === 0 ? (
            <p className="muted">{t("workouts.progressEmpty")}</p>
          ) : (
            progressionByExercise.map(({ exercise, latest, delta }) => (
              <div key={exercise} className="feature-card">
                <strong>{exercise}</strong>
                <div className="muted">{t("workouts.progressLatest")}: {latest.sets}x{latest.reps} · {latest.loadKg}kg</div>
                <div style={{ marginTop: 6 }}>
                  {(delta === 0 ? t("workouts.progressDeltaSame") : delta > 0 ? `+${delta} kg` : `${delta} kg`)} {t("workouts.progressDeltaSuffix")}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
