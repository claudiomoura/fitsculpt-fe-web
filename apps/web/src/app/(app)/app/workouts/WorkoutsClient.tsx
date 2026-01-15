"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";

type Workout = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  durationMin: number | null;
  notes: string | null;
};

export default function WorkoutsClient() {
  const c = copy.es.workouts;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMin, setDurationMin] = useState<number>(45);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<
    "date_desc" | "date_asc" | "duration_desc" | "duration_asc"
  >("date_desc");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const loadWorkouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workouts", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("FETCH_FAILED");
      }
      const data = (await response.json()) as Array<{
        id: string;
        name: string;
        notes?: string | null;
        scheduledAt?: string | null;
        durationMin?: number | null;
      }>;
      const mapped = data.map((item) => ({
        id: item.id,
        name: item.name,
        notes: item.notes ?? null,
        durationMin: item.durationMin ?? null,
        date: item.scheduledAt ? item.scheduledAt.slice(0, 10) : "",
      }));
      setWorkouts(mapped);
    } catch {
      setError("No pudimos cargar tus entrenamientos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

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
      setError("No pudimos guardar el entrenamiento.");
      return;
    }

    await loadWorkouts();
    resetForm();
  }

  function startEdit(w: Workout) {
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
    const response = await fetch(`/api/workouts/${editingWorkout.id}`, {
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
      setError("No pudimos actualizar el entrenamiento.");
      return;
    }

    await loadWorkouts();
    resetForm();
  }

  async function remove(id: string) {
    const ok = window.confirm(c.confirmDelete);
    if (!ok) return;

    const response = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No pudimos eliminar el entrenamiento.");
      return;
    }
    await loadWorkouts();
    if (editingId === id) {
      resetForm();
    }
  }

  const isEditing = Boolean(editingId);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>
          {isEditing ? c.editWorkout : c.newWorkout}
        </h2>

        <form
          onSubmit={isEditing ? submitEdit : submitNew}
          style={{ display: "grid", gap: 12, marginTop: 12 }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            {c.name}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: tren superior, HIIT, carrera..."
              required
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.date}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {c.duration}
              <input
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            {c.notes}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: carga, series, sensaciones..."
              rows={3}
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit">{isEditing ? c.save : c.add}</button>

            {isEditing && (
              <button type="button" onClick={resetForm}>
                {c.cancel}
              </button>
            )}

            {error ? (
              <span style={{ marginLeft: "auto", color: "#b42318" }}>{error}</span>
            ) : null}
          </div>
        </form>
      </div>

      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{c.list}</h2>
          <span style={{ opacity: 0.7 }}>
            ({visibleWorkouts.length} de {workouts.length})
          </span>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.searchPlaceholder}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.from}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {c.to}
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              {c.sort}
              <select value={sort} onChange={(e) => setSort(e.target.value as never)}>
                <option value="date_desc">{c.sortNewest}</option>
                <option value="date_asc">{c.sortOldest}</option>
                <option value="duration_desc">{c.sortDurationDesc}</option>
                <option value="duration_asc">{c.sortDurationAsc}</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFromDate("");
                setToDate("");
                setSort("date_desc");
              }}
            >
              {c.clearFilters}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ marginTop: 12, opacity: 0.7 }}>Cargando entrenamientos...</p>
        ) : workouts.length === 0 ? (
          <p style={{ marginTop: 12, opacity: 0.7 }}>
            {c.empty}
          </p>
        ) : (
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
                  border: "1px solid #ededed",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{w.name}</strong>
                  <span style={{ opacity: 0.7 }}>
                    {w.date || "Sin fecha"} , {w.durationMin ?? 0} min
                  </span>
                </div>

                {w.notes ? <p style={{ margin: 0, opacity: 0.85 }}>{w.notes}</p> : null}

                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button type="button" onClick={() => startEdit(w)}>
                    {c.edit}
                  </button>
                  <button type="button" onClick={() => remove(w.id)}>
                    {c.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
