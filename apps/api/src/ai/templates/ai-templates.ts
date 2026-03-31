import { z } from "zod";
import type { ExerciseCatalogItem } from "../trainingPlanExerciseResolution.js";
import { normalizeExerciseName } from "../../utils/normalizeExerciseName.js";

/**
 * AI Template Builders
 * 
 * Deterministic/fallback templates for when AI is not used or fails.
 * Easy to modify preset workout/nutrition plans.
 */

// ============================================================================
// Types (inlined - would come from schemas)
// ============================================================================

const aiTrainingPlanResponseSchema = z.object({
  title: z.string(),
  startDate: z.string().nullable(),
  notes: z.string().nullable(),
  days: z.array(z.any()),
});

// ============================================================================
// Training Template Builder
// ============================================================================

/**
 * Build deterministic training plan template
 * Used as fallback when AI fails or for quick generation
 */
export function buildTrainingTemplate(
  params: {
    focus: string;
    level: string;
    daysPerWeek: number;
    timeAvailableMinutes: number;
    [key: string]: any;
  },
  exerciseCatalog: ExerciseCatalogItem[],
): z.infer<typeof aiTrainingPlanResponseSchema> | null {
  // Only generate for specific conditions
  if (
    params.focus !== "ppl" ||
    params.level !== "intermediate" ||
    params.daysPerWeek < 3
  ) {
    return null;
  }

  const daysPerWeek = Math.min(params.daysPerWeek, 7);
  const catalogByName = new Map(
    exerciseCatalog.map((exercise) => [
      normalizeExerciseName(exercise.name),
      exercise.id,
    ]),
  );
  const missingExercises = new Set<string>();

  const ex = (
    name: string,
    sets: number,
    reps: string,
    tempo = "2-0-1",
    rest = 90,
    notes = "Técnica limpia, controla la bajada.",
  ) => {
    const exerciseId = catalogByName.get(normalizeExerciseName(name)) ?? null;
    if (!exerciseId) missingExercises.add(name);
    return { exerciseId: exerciseId ?? "", name, sets, reps, tempo, rest, notes };
  };

  // Push Day
  const pushDay = {
    date: null,
    label: "Día 1",
    focus: "Push",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex("Press banca", 4, "6-10", "2-0-1", 120, "Escápulas atrás, pausa suave abajo."),
      ex("Press militar", 3, "8-10", "2-0-1", 90, "Glúteos y core firmes."),
      ex("Fondos", 3, "8-12", "2-0-1", 90, "Rango controlado."),
      ex("Elevaciones laterales", 3, "12-15", "2-0-2", 60, "Codos suaves."),
      ex("Extensión tríceps", 3, "10-12", "2-0-2", 60, "Bloquea sin dolor."),
    ],
  };

  // Pull Day
  const pullDay = {
    date: null,
    label: "Día 2",
    focus: "Pull",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex("Remo con barra", 4, "6-10", "2-0-1", 120, "Espalda neutra."),
      ex("Dominadas", 3, "6-10", "2-1-1", 120, "Controla la bajada."),
      ex("Remo en polea", 3, "10-12", "2-1-1", 90, "Pecho arriba."),
      ex("Curl bíceps", 3, "10-12", "2-0-2", 75, "Sin balanceo."),
      ex("Face pull", 3, "12-15", "2-1-2", 60, "Tira a la cara."),
    ],
  };

  // Legs Day
  const legsDay = {
    date: null,
    label: "Día 3",
    focus: "Legs",
    duration: params.timeAvailableMinutes,
    exercises: [
      ex("Sentadilla", 4, "6-10", "3-0-1", 150, "Profundidad segura."),
      ex("Peso muerto rumano", 3, "8-10", "3-1-1", 120, "Cadera atrás."),
      ex("Hip thrust", 3, "10-12", "2-1-1", 120, "Pausa arriba."),
      ex("Prensa", 3, "10-12", "2-0-2", 120, "Controla recorrido."),
      ex("Elevaciones de gemelo", 3, "12-15", "2-1-2", 60, "Rango completo."),
    ],
  };

  // Generate based on days per week
  const baseDays = [pushDay, pullDay, legsDay];
  
  if (missingExercises.size > 0) {
    console.warn("Missing exercises in template:", Array.from(missingExercises));
  }

  return {
    title: "Rutina Push/Pull/Legs intermedio",
    days: baseDays.slice(0, daysPerWeek),
    notes: `Plan base PPL para ${daysPerWeek} días/semana. Ajusta cargas según progreso.`,
    startDate: null,
  };
}

// ============================================================================
// Nutrition Template Builder
// ============================================================================

/**
 * Build deterministic nutrition plan template
 */
export function buildNutritionTemplate(
  params: {
    mealsPerDay: number;
    goal: string;
    calories: number;
    [key: string]: any;
  }
): { title: string; startDate: null; dailyCalories: number; proteinG: number; fatG: number; carbsG: number; days: any[] } | null {
  if (params.mealsPerDay !== 3 || params.goal !== "cut") {
    return null;
  }

  const proteinG = Math.round((params.calories * 0.3) / 4);
  const fatG = Math.round((params.calories * 0.25) / 9);
  const carbsG = Math.round((params.calories * 0.45) / 4);

  return {
    title: "Plan semanal de nutrición",
    startDate: null,
    dailyCalories: params.calories,
    proteinG,
    fatG,
    carbsG,
    days: [
      {
        dayLabel: "Lunes",
        meals: [
          { type: "breakfast", title: "Yogur griego con avena", macros: { calories: 420, protein: 25, carbs: 45, fats: 12 } },
          { type: "lunch", title: "Pollo con arroz", macros: { calories: 680, protein: 45, carbs: 70, fats: 18 } },
          { type: "dinner", title: "Salmón con verduras", macros: { calories: 620, protein: 38, carbs: 55, fats: 22 } },
        ],
      },
    ],
  };
}

// ============================================================================
// Tip Template Builder
// ============================================================================

/**
 * Build deterministic tip template
 */
export function buildTipTemplate() {
  return {
    title: "Consejo diario",
    message: "Recuerda que la constancia gana a la intensidad. ¡Haz algo hoy!",
  };
}