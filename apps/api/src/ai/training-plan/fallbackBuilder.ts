import type { ExerciseCatalogItem } from "../trainingPlanExerciseResolution.js";
import { pickExercisesForFocus } from "../../exercises/deterministicExercisePicker.js";

type TrainingLevel = "beginner" | "intermediate" | "advanced";
type TrainingGoal = "cut" | "maintain" | "bulk";

export type DeterministicFallbackInput = {
  daysPerWeek: number;
  level: TrainingLevel;
  goal: TrainingGoal;
  startDate: Date;
};

const dayFocusOrder = [
  "Pierna + Core",
  "Empuje (Pecho/Hombro/Tríceps)",
  "Tirón (Espalda/Bíceps)",
  "Pierna posterior + Glúteo",
  "Torso mixto",
  "Condicionamiento + Core",
  "Full body técnico",
];

const noCatalogExercisePool: Record<string, string[]> = {
  "Pierna + Core": ["Sentadilla goblet", "Zancadas caminando", "Plancha frontal"],
  "Empuje (Pecho/Hombro/Tríceps)": ["Flexiones", "Press militar con mancuernas", "Fondos en banco"],
  "Tirón (Espalda/Bíceps)": ["Remo con banda", "Curl de bíceps con mancuernas", "Face pull con banda"],
  "Pierna posterior + Glúteo": ["Peso muerto rumano con mancuernas", "Hip thrust", "Puente de glúteos"],
  "Torso mixto": ["Press inclinado con mancuernas", "Remo con mancuerna", "Elevaciones laterales"],
  "Condicionamiento + Core": ["Burpees", "Mountain climbers", "Plancha lateral"],
  "Full body técnico": ["Sentadilla", "Flexiones", "Remo con banda"],
};

function toIsoDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(start: Date, days: number) {
  const next = new Date(start);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveSetRange(level: TrainingLevel) {
  if (level === "advanced") return 4;
  if (level === "intermediate") return 3;
  return 3;
}

function resolveReps(goal: TrainingGoal) {
  if (goal === "bulk") return "6-10";
  if (goal === "cut") return "10-15";
  return "8-12";
}

function resolveRestSeconds(goal: TrainingGoal) {
  if (goal === "bulk") return 120;
  if (goal === "cut") return 60;
  return 90;
}

function resolveExerciseCount(level: TrainingLevel) {
  if (level === "advanced") return 5;
  if (level === "intermediate") return 4;
  return 3;
}

export function buildDeterministicTrainingFallbackPlan(input: DeterministicFallbackInput, catalog: ExerciseCatalogItem[]) {
  const days = Array.from({ length: input.daysPerWeek }).map((_, index) => {
    const focus = dayFocusOrder[index % dayFocusOrder.length]!;
    const selected =
      catalog.length > 0
        ? pickExercisesForFocus(catalog, focus, resolveExerciseCount(input.level)).map((exercise) => ({
            exerciseId: exercise.id,
            name: exercise.name,
          }))
        : (noCatalogExercisePool[focus] ?? noCatalogExercisePool["Full body técnico"]).map((name) => ({
            exerciseId: null,
            name,
          }));

    return {
      date: toIsoDateString(addDays(input.startDate, index * 2)),
      label: `Día ${index + 1}`,
      focus,
      duration: input.level === "advanced" ? 70 : input.level === "intermediate" ? 60 : 50,
      exercises: selected.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets: resolveSetRange(input.level),
        reps: resolveReps(input.goal),
        tempo: "2-0-2",
        rest: resolveRestSeconds(input.goal),
        notes: "Prioriza técnica y rango completo.",
      })),
    };
  });

  return {
    title: "Plan de entrenamiento (fallback biblioteca)",
    notes: "Generado automáticamente desde biblioteca local por fallo temporal de IA.",
    startDate: toIsoDateString(input.startDate),
    days,
  };
}
