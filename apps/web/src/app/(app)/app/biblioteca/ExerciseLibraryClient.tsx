"use client";

import { useMemo, useState } from "react";

const EXERCISES = [
  {
    name: "Sentadilla",
    muscles: ["Piernas", "Glúteos"],
    equipment: "Barra",
    notes: "Mantén la espalda neutra y controla la profundidad.",
  },
  {
    name: "Press banca",
    muscles: ["Pecho", "Tríceps"],
    equipment: "Barra",
    notes: "Alinea los hombros y baja con control.",
  },
  {
    name: "Peso muerto rumano",
    muscles: ["Femoral", "Glúteos"],
    equipment: "Barra",
    notes: "Cadera atrás y rodillas levemente flexionadas.",
  },
  {
    name: "Remo con barra",
    muscles: ["Espalda", "Bíceps"],
    equipment: "Barra",
    notes: "Tronco inclinado y abdomen activo.",
  },
  {
    name: "Press militar",
    muscles: ["Hombros", "Tríceps"],
    equipment: "Barra o mancuernas",
    notes: "Contrae el core para evitar arqueo.",
  },
  {
    name: "Hip thrust",
    muscles: ["Glúteos"],
    equipment: "Banco",
    notes: "Extiende cadera y pausa arriba.",
  },
  {
    name: "Dominadas",
    muscles: ["Espalda", "Bíceps"],
    equipment: "Barra fija",
    notes: "Controla el descenso y evita balanceos.",
  },
  {
    name: "Fondos",
    muscles: ["Pecho", "Tríceps"],
    equipment: "Paralelas",
    notes: "Inclina el torso para enfatizar el pecho.",
  },
];

export default function ExerciseLibraryClient() {
  const [query, setQuery] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("all");

  const equipmentOptions = useMemo(() => {
    const options = Array.from(new Set(EXERCISES.map((ex) => ex.equipment)));
    return ["all", ...options];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((exercise) => {
      const matchesQuery =
        !q ||
        exercise.name.toLowerCase().includes(q) ||
        exercise.muscles.some((muscle) => muscle.toLowerCase().includes(q));
      const matchesEquipment =
        equipmentFilter === "all" || exercise.equipment === equipmentFilter;
      return matchesQuery && matchesEquipment;
    });
  }, [query, equipmentFilter]);

  return (
    <section className="card">
      <div className="form-stack">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ejercicio o músculo"
        />
        <label className="form-stack">
          Equipamiento
          <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)}>
            {equipmentOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "Todos" : option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="list-grid" style={{ marginTop: 16 }}>
        {filtered.map((exercise) => (
          <div key={exercise.name} className="feature-card">
            <h3>{exercise.name}</h3>
            <div className="badge-list">
              {exercise.muscles.map((muscle) => (
                <span key={muscle} className="badge">{muscle}</span>
              ))}
            </div>
            <p className="muted">Equipamiento: {exercise.equipment}</p>
            <p className="muted">{exercise.notes}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
