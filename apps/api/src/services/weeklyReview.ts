import type { TrackingSnapshot } from "../tracking/schemas.js";
import type { WeeklyReviewRequest, WeeklyReviewResponse } from "../schemas/weeklyReview.js";

type DateRange = {
  start: string;
  end: string;
};

function parseIsoDate(input: string): Date {
  return new Date(`${input}T00:00:00.000Z`);
}

function toIsoDate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function resolveRange(input: WeeklyReviewRequest): DateRange {
  if (input.startDate && input.endDate) {
    return { start: input.startDate, end: input.endDate };
  }

  const endDate = input.endDate ? parseIsoDate(input.endDate) : new Date();
  const normalizedEnd = parseIsoDate(toIsoDate(endDate));
  const defaultStart = new Date(normalizedEnd);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 6);

  return {
    start: input.startDate ?? toIsoDate(defaultStart),
    end: input.endDate ?? toIsoDate(normalizedEnd),
  };
}

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const raw = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(raw * 10) / 10;
}

export function buildWeeklyReview(tracking: TrackingSnapshot, input: WeeklyReviewRequest): WeeklyReviewResponse {
  const range = resolveRange(input);
  const checkins = tracking.checkins.filter((entry) => inRange(entry.date, range));
  const workoutLog = tracking.workoutLog.filter((entry) => inRange(entry.date, range));
  const foodLog = tracking.foodLog.filter((entry) => inRange(entry.date, range));

  const energyValues = checkins.map((entry) => entry.energy);
  const hungerValues = checkins.map((entry) => entry.hunger);

  const summary: WeeklyReviewResponse["summary"] = {
    rangeStart: range.start,
    rangeEnd: range.end,
    days: Math.floor((parseIsoDate(range.end).getTime() - parseIsoDate(range.start).getTime()) / 86_400_000) + 1,
    checkinsCount: checkins.length,
    workoutsCount: workoutLog.length,
    nutritionLogsCount: foodLog.length,
    averageEnergy: average(energyValues),
    averageHunger: average(hungerValues),
  };

  const recommendations: WeeklyReviewResponse["recommendations"] = [];

  if (summary.workoutsCount >= 3) {
    recommendations.push({
      id: "keep-momentum",
      title: "Mantén el ritmo actual",
      why: "Completaste al menos 3 entrenamientos esta semana, buena consistencia.",
    });
  } else {
    recommendations.push({
      id: "add-workout",
      title: "Añade 1 sesión corta",
      why: "Con una sesión extra de 20-30 min mejoras la adherencia semanal.",
    });
  }

  if (summary.nutritionLogsCount < 5) {
    recommendations.push({
      id: "meal-consistency",
      title: "Registra más comidas",
      why: "Registrar comidas en más días ayuda a detectar patrones de energía y hambre.",
    });
  }

  if (summary.checkinsCount === 0) {
    recommendations.push({
      id: "checkin-reminder",
      title: "Haz un check-in semanal",
      why: "Un check-in permite ajustar objetivos con datos recientes y medibles.",
    });
  }

  if (
    summary.averageEnergy !== null &&
    summary.averageHunger !== null &&
    summary.averageEnergy <= 2.5 &&
    summary.averageHunger >= 3.5
  ) {
    recommendations.push({
      id: "balance-recovery",
      title: "Prioriza recuperación y saciedad",
      why: "Energía baja y hambre alta suelen mejorar con descanso y comidas más completas.",
    });
  }

  return {
    summary,
    recommendations: recommendations.slice(0, 3),
  };
}
