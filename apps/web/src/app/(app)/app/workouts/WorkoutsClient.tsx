"use client";

import { useEffect, useMemo, useState } from "react";

type Workout = {
  id: string;
  name: string;
  date: string;        // YYYY-MM-DD
  durationMin: number; // minutos
  notes: string;
};

const STORAGE_KEY = "fs_workouts_v1";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function safeParse(json: string | null): Workout[] {
  if (!json) return [];
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data as Workout[];
  } catch {
    return [];
  }
}

export default function WorkoutsClient() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMin, setDurationMin] = useState<number>(45);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
const [sort, setSort] = useState<"date_desc" | "date_asc" | "duration_desc" | "duration_asc">("date_desc");
const [fromDate, setFromDate] = useState<string>("");
const [toDate, setToDate] = useState<string>("");


  const [editingId, setEditingId] = useState<string | null>(null);

  // Load
  useEffect(() => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkouts(stored);
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  }, [workouts]);

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
    if (sort === "duration_desc") return b.durationMin - a.durationMin;
    if (sort === "duration_asc") return a.durationMin - b.durationMin;
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

  function submitNew(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    const w: Workout = {
      id: uid(),
      name: trimmed,
      date,
      durationMin: Number(durationMin) || 0,
      notes: notes.trim(),
    };

    setWorkouts((prev) => [w, ...prev]);
    resetForm();
  }

  function startEdit(w: Workout) {
    setEditingId(w.id);
    setName(w.name);
    setDate(w.date);
    setDurationMin(w.durationMin);
    setNotes(w.notes);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWorkout) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === editingWorkout.id
          ? {
              ...w,
              name: trimmed,
              date,
              durationMin: Number(durationMin) || 0,
              notes: notes.trim(),
            }
          : w
      )
    );

    resetForm();
  }

  function remove(id: string) {
    const ok = window.confirm("Apagar este workout?");
    if (!ok) return;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    if (editingId === id) resetForm();
  }

  function clearAll() {
    const ok = window.confirm("Apagar todos os workouts?");
    if (!ok) return;
    setWorkouts([]);
    resetForm();
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
          {isEditing ? "Editar workout" : "Novo workout"}
        </h2>

        <form
          onSubmit={isEditing ? submitEdit : submitNew}
          style={{ display: "grid", gap: 12, marginTop: 12 }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            Nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Upper body, HIIT, Corrida..."
              required
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Data
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              Duração (min)
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
            Notas
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: carga, séries, sensação..."
              rows={3}
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit">{isEditing ? "Guardar" : "Adicionar"}</button>

            {isEditing && (
              <button type="button" onClick={resetForm}>
                Cancelar
              </button>
            )}

            <div style={{ marginLeft: "auto" }}>
              <button type="button" onClick={clearAll}>
                Limpar tudo
              </button>
            </div>
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
          <h2 style={{ margin: 0, fontSize: 16 }}>Lista</h2>
          <span style={{ opacity: 0.7 }}>
  ({visibleWorkouts.length} de {workouts.length})
</span>

        </div>

<div style={{ display: "grid", gap: 10, marginTop: 12 }}>
  <input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Pesquisar por nome ou notas..."
  />

  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
    <label style={{ display: "grid", gap: 6 }}>
      De
      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
    </label>

    <label style={{ display: "grid", gap: 6 }}>
      Até
      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
    </label>

    <label style={{ display: "grid", gap: 6 }}>
      Ordenar
      <select value={sort} onChange={(e) => setSort(e.target.value as never)}>
        <option value="date_desc">Data (mais recente)</option>
        <option value="date_asc">Data (mais antiga)</option>
        <option value="duration_desc">Duração (maior)</option>
        <option value="duration_asc">Duração (menor)</option>
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
      Limpar filtros
    </button>
  </div>
</div>


        {workouts.length === 0 ? (
          <p style={{ marginTop: 12, opacity: 0.7 }}>
            Ainda não tens workouts. Cria o primeiro acima.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 10 }}>
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
                    {w.date} , {w.durationMin} min
                  </span>
                </div>

                {w.notes ? <p style={{ margin: 0, opacity: 0.85 }}>{w.notes}</p> : null}

                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button type="button" onClick={() => startEdit(w)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => remove(w.id)}>
                    Apagar
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
