import type { TrackingSnapshot } from "../tracking/schemas.js";
import type {
  WeeklyReviewDecision,
  WeeklyReviewRecommendation,
  WeeklyReviewRecommendationId,
  WeeklyReviewRequest,
  WeeklyReviewResponse,
} from "../schemas/weeklyReview.js";

type DateRange = {
  start: string;
  end: string;
};

type CheckinLike = TrackingSnapshot["checkins"][number];

type WeeklyReviewContext = {
  now?: Date;
  goal?: string | null;
  trainingPlan?: {
    title?: string | null;
    daysPerWeek?: number | null;
  } | null;
  nutritionPlan?: {
    title?: string | null;
    dailyCalories?: number | null;
  } | null;
  decisions?: Partial<Record<WeeklyReviewRecommendationId, WeeklyReviewDecision>>;
};

type NormalizedCheckin = CheckinLike & {
  date: string;
};

type WindowSummary = {
  checkinsCount: number;
  workoutsCount: number;
  mealLoggingDays: number;
  nutritionLogsCount: number;
  averageEnergy: number | null;
  averageHunger: number | null;
  averageWeightKg: number | null;
  averageWaistCm: number | null;
};

function parseIsoDate(input: string): Date {
  return new Date(`${input}T00:00:00.000Z`);
}

function toIsoDate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function shiftDays(value: string, delta: number): string {
  const next = parseIsoDate(value);
  next.setUTCDate(next.getUTCDate() + delta);
  return toIsoDate(next);
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 1);
}

function clampPercent(value: number): number {
  return Math.min(10, Math.max(0, round(value, 1)));
}

function resolveDefaultRange(now = new Date()): DateRange {
  const today = parseIsoDate(toIsoDate(now));
  const dayOfWeek = today.getUTCDay();
  const currentWeekMondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentWeekStart = new Date(today);
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + currentWeekMondayOffset);

  const end = new Date(currentWeekStart);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);

  return { start: toIsoDate(start), end: toIsoDate(end) };
}

function resolveRange(input: WeeklyReviewRequest, now = new Date()): DateRange {
  if (input.startDate && input.endDate) {
    return { start: input.startDate, end: input.endDate };
  }
  return resolveDefaultRange(now);
}

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

function normalizeDailyCheckins(checkins: TrackingSnapshot["checkins"]): NormalizedCheckin[] {
  const byDay = new Map<string, CheckinLike[]>();

  checkins
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .forEach((entry) => {
      const current = byDay.get(entry.date) ?? [];
      current.push(entry);
      byDay.set(entry.date, current);
    });

  return Array.from(byDay.entries())
    .map(([date, entries]) => {
      const latest = entries[entries.length - 1];
      const energy = average(entries.map((entry) => entry.energy).filter((value) => value >= 1 && value <= 5));
      const hunger = average(entries.map((entry) => entry.hunger).filter((value) => value >= 1 && value <= 5));
      const weightCandidates = entries.map((entry) => entry.weightKg).filter((value) => value > 0);
      const waistCandidates = entries.map((entry) => entry.waistCm).filter((value) => value > 0);
      const weight = average(weightCandidates);
      const waist = waistCandidates.length > 0 ? waistCandidates[waistCandidates.length - 1] : 0;

      return {
        ...latest,
        date,
        energy: energy ?? latest.energy,
        hunger: hunger ?? latest.hunger,
        weightKg: weight ?? latest.weightKg,
        waistCm: waist || latest.waistCm,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function summarizeWindow(tracking: TrackingSnapshot, range: DateRange): WindowSummary {
  const checkins = normalizeDailyCheckins(tracking.checkins).filter((entry) => inRange(entry.date, range));
  const workouts = tracking.workoutLog.filter((entry) => inRange(entry.date, range));
  const mealLog = tracking.mealLog.filter((entry) => inRange(entry.date, range));
  const foodLog = tracking.foodLog.filter((entry) => inRange(entry.date, range));
  const mealLoggingDays = new Set([...mealLog.map((entry) => entry.date), ...foodLog.map((entry) => entry.date)]).size;

  return {
    checkinsCount: checkins.length,
    workoutsCount: workouts.length,
    mealLoggingDays,
    nutritionLogsCount: mealLog.length + foodLog.length,
    averageEnergy: average(checkins.map((entry) => entry.energy).filter((value) => value >= 1 && value <= 5)),
    averageHunger: average(checkins.map((entry) => entry.hunger).filter((value) => value >= 1 && value <= 5)),
    averageWeightKg: average(checkins.map((entry) => entry.weightKg).filter((value) => value > 0)),
    averageWaistCm: average(checkins.map((entry) => entry.waistCm).filter((value) => value > 0)),
  };
}

function buildRecommendation(input: Omit<WeeklyReviewRecommendation, "decision"> & { decision?: WeeklyReviewDecision }): WeeklyReviewRecommendation {
  return {
    ...input,
    decision: input.decision ?? "pending",
  };
}

function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous <= 0) return null;
  return round(((current - previous) / previous) * 100, 2);
}

function metric(label: string, value: string) {
  return { label, value };
}

function buildTrainingRecommendation(
  current: WindowSummary,
  previous: WindowSummary,
  targetSessions: number,
  decisions: WeeklyReviewContext["decisions"],
): WeeklyReviewRecommendation | null {
  if (targetSessions <= 0) {
    return buildRecommendation({
      id: "habit-foundation",
      type: "habit",
      title: "Define una base semanal simple",
      recommendation: "Antes de ajustar el plan, fija 2-3 sesiones objetivo para tener una referencia clara.",
      why: "Sin una meta semanal definida no conviene mover la exigencia del plan.",
      reasoning: [
        "No encontramos un objetivo claro de sesiones en tu plan activo.",
        "Primero conviene fijar una base estable y despues ajustar volumen.",
      ],
      direction: "focus",
      adjustmentPct: null,
      metrics: [metric("Objetivo", "No definido"), metric("Sesiones hechas", String(current.workoutsCount))],
      safetyNotes: ["Sin objetivo semanal no se sugieren cambios de carga."],
      decision: decisions?.["habit-foundation"],
    });
  }

  const adherencePct = round((current.workoutsCount / targetSessions) * 100, 0);
  const positiveSignals = (current.averageEnergy ?? 0) >= 3.5 && (current.averageHunger ?? 0) <= 3.5;

  if (adherencePct < 50) {
    return buildRecommendation({
      id: "training-deload",
      type: "training",
      title: "Bajar exigencia para recuperar consistencia",
      recommendation: "Sugerimos simplificar la semana y reducir el volumen un 10%.",
      why: `Completaste ${current.workoutsCount}/${targetSessions} sesiones, por debajo del 50% de adherencia.`,
      reasoning: [
        "Cuando la adherencia cae, el primer ajuste profesional es hacer el plan mas sostenible.",
        "Reducir un 10% baja friccion sin cambiar toda la estructura.",
      ],
      direction: "decrease",
      adjustmentPct: 10,
      metrics: [metric("Adherencia", `${adherencePct}%`), metric("Objetivo", `${targetSessions} sesiones`)],
      safetyNotes: ["El ajuste esta limitado al 10%.", "Se prioriza consistencia antes que intensidad."],
      decision: decisions?.["training-deload"],
    });
  }

  if (adherencePct > 80 && positiveSignals && previous.workoutsCount > 0) {
    return buildRecommendation({
      id: "training-progress",
      type: "training",
      title: "Progresar con un aumento moderado",
      recommendation: "Puedes subir el volumen un 5% esta semana para seguir avanzando sin salirte de una zona segura.",
      why: `Completaste ${current.workoutsCount}/${targetSessions} sesiones con buenas senales de energia y recuperacion.`,
      reasoning: [
        "La adherencia esta por encima del 80%.",
        "La semana previa no fue de cero sesiones, asi que el progreso es seguro.",
      ],
      direction: "increase",
      adjustmentPct: 5,
      metrics: [metric("Adherencia", `${adherencePct}%`), metric("Energia", `${current.averageEnergy ?? "-"}/5`)],
      safetyNotes: ["Nunca se propone mas del 10%.", "No se aumenta tras una semana previa en cero."],
      decision: decisions?.["training-progress"],
    });
  }

  return null;
}

function buildNutritionRecommendation(
  current: WindowSummary,
  previous: WindowSummary,
  goal: string | null | undefined,
  dailyCalories: number | null | undefined,
  decisions: WeeklyReviewContext["decisions"],
): WeeklyReviewRecommendation | null {
  if (current.mealLoggingDays < 3) {
    return null;
  }

  const weightChangePct = percentChange(current.averageWeightKg, previous.averageWeightKg);
  const weightChangeKg =
    current.averageWeightKg !== null && previous.averageWeightKg !== null
      ? round(current.averageWeightKg - previous.averageWeightKg, 2)
      : null;
  const waistChangeCm =
    current.averageWaistCm !== null && previous.averageWaistCm !== null
      ? round(current.averageWaistCm - previous.averageWaistCm, 1)
      : null;

  const rapidLoss = weightChangePct !== null && weightChangePct <= -1;
  const lowEnergy = (current.averageEnergy ?? 5) <= 2.5;
  const highHunger = (current.averageHunger ?? 1) >= 3.5;

  if (rapidLoss && lowEnergy && highHunger) {
    const adjustmentPct = clampPercent(5);
    const kcalText = dailyCalories && dailyCalories > 0 ? ` (~${Math.round(dailyCalories * (adjustmentPct / 100))} kcal)` : "";

    return buildRecommendation({
      id: "nutrition-recovery",
      type: "nutrition",
      title: "Aliviar el deficit para proteger energia",
      recommendation: `Sugerimos subir calorias un ${adjustmentPct}%${kcalText} o hacer el deficit menos agresivo.`,
      why: "El peso cae rapido y a la vez aparecen senales de energia baja y hambre alta.",
      reasoning: [
        `Cambio de peso semanal: ${weightChangeKg ?? "-"} kg (${weightChangePct ?? "-"}%).`,
        "La combinacion de perdida rapida, poca energia y mucha hambre suele indicar un deficit demasiado duro.",
      ],
      direction: "increase",
      adjustmentPct,
      metrics: [metric("Peso", `${weightChangeKg ?? "-"} kg`), metric("Energia", `${current.averageEnergy ?? "-"}/5`), metric("Hambre", `${current.averageHunger ?? "-"}/5`)],
      safetyNotes: ["El ajuste propuesto esta clampado a un maximo del 10%.", "No se sugieren cambios extremos ni medicos."],
      decision: decisions?.["nutrition-recovery"],
    });
  }

  if ((goal === "cut" || goal === "maintain" || !goal) && weightChangePct !== null && Math.abs(weightChangePct) <= 0.25 && waistChangeCm !== null && waistChangeCm <= -0.5) {
    return buildRecommendation({
      id: "nutrition-maintain",
      type: "nutrition",
      title: "Mantener rumbo: probable recomposicion",
      recommendation: "No recomendamos tocar calorias esta semana. Mantener el plan parece la mejor decision.",
      why: "El peso esta estable mientras la cintura sigue bajando.",
      reasoning: [
        "Ese patron es compatible con recomposicion corporal.",
        "Cambiar calorias ahora podria interrumpir una tendencia que ya esta funcionando.",
      ],
      direction: "maintain",
      adjustmentPct: 0,
      metrics: [metric("Peso", `${weightChangeKg ?? "-"} kg`), metric("Cintura", `${waistChangeCm} cm`)],
      safetyNotes: ["Se prioriza mantener el rumbo cuando los datos sugieren recomposicion."],
      decision: decisions?.["nutrition-maintain"],
    });
  }

  return null;
}

function buildHabitRecommendation(
  current: WindowSummary,
  targetSessions: number,
  decisions: WeeklyReviewContext["decisions"],
  alreadyUsedIds: Set<WeeklyReviewRecommendationId>,
): WeeklyReviewRecommendation | null {
  if (current.mealLoggingDays < 3 && !alreadyUsedIds.has("habit-meal-logging")) {
    return buildRecommendation({
      id: "habit-meal-logging",
      type: "habit",
      title: "Mejora el registro antes de tocar calorias",
      recommendation: "Tu prioridad esta semana es registrar al menos 3 dias de comida.",
      why: "Con menos de 3 dias de logging no hay base suficiente para ajustar nutricion con seguridad.",
      reasoning: [
        "Sin suficiente registro, el motor no puede distinguir una semana irregular de una tendencia real.",
        "Primero se mejora la calidad del dato; despues se ajusta el plan.",
      ],
      direction: "focus",
      adjustmentPct: null,
      metrics: [metric("Dias logueados", `${current.mealLoggingDays}/7`)],
      safetyNotes: ["No se modifican calorias sin una base minima de datos."],
      decision: decisions?.["habit-meal-logging"],
    });
  }

  if (targetSessions > 0 && current.workoutsCount === 0 && !alreadyUsedIds.has("habit-training-consistency")) {
    return buildRecommendation({
      id: "habit-training-consistency",
      type: "habit",
      title: "Volver a entrar en ritmo con una meta pequena",
      recommendation: "En lugar de apretar el plan, busca completar 2 sesiones simples esta semana.",
      why: "Cuando la base es muy baja, un objetivo pequeno y concreto mejora la adherencia mas que subir exigencia.",
      reasoning: [
        `Sesiones completadas esta semana: ${current.workoutsCount}.`,
        "El siguiente paso profesional es reconstruir el habito antes de progresar carga o volumen.",
      ],
      direction: "focus",
      adjustmentPct: null,
      metrics: [metric("Sesiones hechas", String(current.workoutsCount)), metric("Objetivo", `${targetSessions}`)],
      safetyNotes: ["No se aumenta el entrenamiento cuando la semana previa fue cero."],
      decision: decisions?.["habit-training-consistency"],
    });
  }

  if (current.checkinsCount < 2 && !alreadyUsedIds.has("habit-foundation")) {
    return buildRecommendation({
      id: "habit-foundation",
      type: "habit",
      title: "Refuerza tu base de seguimiento",
      recommendation: "Haz al menos 2 check-ins con peso, energia y hambre para que el motor pueda afinar mejor.",
      why: "Sin base suficiente de seguimiento conviene priorizar habitos de registro antes que mover el plan.",
      reasoning: [
        "Los check-ins semanales son la base para comparar tendencia contra la semana anterior.",
        "Mas datos permiten recomendaciones mas finas y menos ruido.",
      ],
      direction: "focus",
      adjustmentPct: null,
      metrics: [metric("Check-ins", `${current.checkinsCount}/7`)],
      safetyNotes: ["Sin datos suficientes se priorizan habitos, no cambios de plan."],
      decision: decisions?.["habit-foundation"],
    });
  }

  return null;
}

export function buildWeeklyReview(
  tracking: TrackingSnapshot,
  input: WeeklyReviewRequest,
  context: WeeklyReviewContext = {},
): WeeklyReviewResponse {
  const range = resolveRange(input, context.now);
  const previousRange = {
    start: shiftDays(range.start, -7),
    end: shiftDays(range.end, -7),
  };

  const current = summarizeWindow(tracking, range);
  const previous = summarizeWindow(tracking, previousRange);
  const targetSessions = Math.max(0, Math.min(7, Math.round(context.trainingPlan?.daysPerWeek ?? 0)));
  const trainingAdherencePct = targetSessions > 0 ? round((current.workoutsCount / targetSessions) * 100, 0) : 0;

  const recommendations: WeeklyReviewRecommendation[] = [];

  const training = buildTrainingRecommendation(current, previous, targetSessions, context.decisions);
  if (training) recommendations.push(training);

  const nutrition = buildNutritionRecommendation(
    current,
    previous,
    context.goal,
    context.nutritionPlan?.dailyCalories,
    context.decisions,
  );
  if (nutrition) recommendations.push(nutrition);

  const usedIds = new Set(recommendations.map((entry) => entry.id));
  const habit = buildHabitRecommendation(current, targetSessions, context.decisions, usedIds);
  if (habit) recommendations.push(habit);

  return {
    summary: {
      weekKey: range.start,
      rangeStart: range.start,
      rangeEnd: range.end,
      previousRangeStart: previousRange.start,
      previousRangeEnd: previousRange.end,
      generatedAt: (context.now ?? new Date()).toISOString(),
      days: Math.floor((parseIsoDate(range.end).getTime() - parseIsoDate(range.start).getTime()) / 86_400_000) + 1,
      checkinsCount: current.checkinsCount,
      workoutsCount: current.workoutsCount,
      previousWorkoutsCount: previous.workoutsCount,
      nutritionLogsCount: current.nutritionLogsCount,
      mealLoggingDays: current.mealLoggingDays,
      trainingTargetSessions: targetSessions,
      trainingAdherencePct,
      averageEnergy: current.averageEnergy,
      averageHunger: current.averageHunger,
      weightChangeKg:
        current.averageWeightKg !== null && previous.averageWeightKg !== null
          ? round(current.averageWeightKg - previous.averageWeightKg, 2)
          : null,
      weightChangePct: percentChange(current.averageWeightKg, previous.averageWeightKg),
      waistChangeCm:
        current.averageWaistCm !== null && previous.averageWaistCm !== null
          ? round(current.averageWaistCm - previous.averageWaistCm, 1)
          : null,
    },
    recommendations: recommendations.slice(0, 3),
  };
}
