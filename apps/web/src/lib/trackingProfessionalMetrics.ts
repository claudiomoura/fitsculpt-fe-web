import { addDays, parseDate, startOfWeek, toDateKey } from "@/lib/calendar";
import type { ProfileData } from "@/lib/profile";
import type { CheckinEntry, MealLogEntry, WorkoutEntry } from "@/services/tracking";
import {
  assessWaistHipRatio,
  assessWeeklyRate,
  getTrackingRangeConfig,
  type TrackingRangeConfig,
  type WaistHipAssessment,
  type WeeklyRateAssessment,
} from "@/lib/trackingProfessionalRules";

export type DailyNormalizedCheckin = CheckinEntry & {
  dayKey: string;
  sourceCount: number;
};

export type WeeklyTrendPoint = {
  weekKey: string;
  label: string;
  startDate: string;
  endDate: string;
  daysLogged: number;
  adherencePct: number;
  averageWeightKg: number | null;
  averageWaistCm: number | null;
  averageHipsCm: number | null;
  averageBodyFatPercent: number | null;
  averageEnergy: number | null;
  averageHunger: number | null;
};

export type RollingWeeklyWindow = {
  startDate: string;
  endDate: string;
  averageWeightKg: number | null;
  averageWaistCm: number | null;
  averageBodyFatPercent: number | null;
  averageEnergy: number | null;
  averageHunger: number | null;
  daysLogged: number;
};

export type ProfessionalAlert = {
  id: string;
  severity: "success" | "watch" | "alert";
  title: string;
  detail: string;
};

export type ProfessionalSignal = {
  id: string;
  tone: "positive" | "neutral" | "negative";
  title: string;
  detail: string;
};

export type WaistHipInsight = {
  ratio: number;
  assessment: WaistHipAssessment;
  waistCm: number;
  hipsCm: number;
};

export type RecoveryCorrelationInsight = {
  id: string;
  tone: "positive" | "neutral" | "negative";
  title: string;
  detail: string;
};

export type ProfessionalTrackingInsights = {
  rangeConfig: TrackingRangeConfig;
  dailyCheckins: DailyNormalizedCheckin[];
  weeklySeries: WeeklyTrendPoint[];
  currentWindow: RollingWeeklyWindow | null;
  previousWindow: RollingWeeklyWindow | null;
  weeklyRatePct: number | null;
  weeklyRateKg: number | null;
  weeklyRateAssessment: WeeklyRateAssessment | null;
  weeklyWaistDeltaCm: number | null;
  weeklyBodyFatDeltaPct: number | null;
  combinedAdherencePct: number;
  nutritionLoggingPct: number;
  trainingConsistencyPct: number;
  checkinConsistencyPct: number;
  waistHip: WaistHipInsight | null;
  alerts: ProfessionalAlert[];
  bodyCompositionSignals: ProfessionalSignal[];
  recoveryCorrelation: RecoveryCorrelationInsight[];
  historyRows: DailyNormalizedCheckin[];
};

type BuildProfessionalTrackingInsightsArgs = {
  checkins: CheckinEntry[];
  mealLog: MealLogEntry[];
  workoutLog: WorkoutEntry[];
  profile: ProfileData;
  rangeDays?: number;
  now?: Date;
};

const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;

function toFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function roundMetric(value: number | null, digits = 1): number | null {
  if (value === null || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function isValidWeight(value: number | null): value is number {
  return value !== null && value >= MIN_WEIGHT_KG && value <= MAX_WEIGHT_KG;
}

function isValidMeasurement(value: number | null): value is number {
  return value !== null && value > 0;
}

function isValidEnergy(value: number | null): value is number {
  return value !== null && value >= 1 && value <= 5;
}

function getLatestValidValue(group: CheckinEntry[], selector: (entry: CheckinEntry) => number | null, validator: (value: number | null) => boolean): number {
  for (let index = group.length - 1; index >= 0; index -= 1) {
    const value = selector(group[index]);
    if (validator(value)) return Number(value);
  }
  return 0;
}

function getLatestTextValue(group: CheckinEntry[], selector: (entry: CheckinEntry) => string | null | undefined): string {
  for (let index = group.length - 1; index >= 0; index -= 1) {
    const value = selector(group[index])?.trim();
    if (value) return value;
  }
  return "";
}

function getLatestNullableTextValue(group: CheckinEntry[], selector: (entry: CheckinEntry) => string | null): string | null {
  for (let index = group.length - 1; index >= 0; index -= 1) {
    const value = selector(group[index]);
    if (value) return value;
  }
  return null;
}

export function normalizeDailyCheckins(checkins: CheckinEntry[]): DailyNormalizedCheckin[] {
  const groups = new Map<string, CheckinEntry[]>();

  checkins
    .filter((entry) => Boolean(parseDate(entry.date)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .forEach((entry) => {
      const parsedDate = parseDate(entry.date);
      if (!parsedDate) return;
      const dayKey = toDateKey(parsedDate);
      const current = groups.get(dayKey) ?? [];
      current.push(entry);
      groups.set(dayKey, current);
    });

  return Array.from(groups.entries())
    .map(([dayKey, group]) => {
      const parsedDate = parseDate(dayKey);
      const weightValues = group.map((entry) => toFiniteNumber(entry.weightKg)).filter(isValidWeight);
      const energyValues = group.map((entry) => toFiniteNumber(entry.energy)).filter(isValidEnergy);
      const hungerValues = group.map((entry) => toFiniteNumber(entry.hunger)).filter(isValidEnergy);
      const latest = group[group.length - 1];

      return {
        id: `${dayKey}-normalized`,
        dayKey,
        date: dayKey,
        weightKg: roundMetric(median(weightValues)) ?? 0,
        chestCm: getLatestValidValue(group, (entry) => toFiniteNumber(entry.chestCm), isValidMeasurement),
        waistCm: getLatestValidValue(group, (entry) => toFiniteNumber(entry.waistCm), isValidMeasurement),
        hipsCm: getLatestValidValue(group, (entry) => toFiniteNumber(entry.hipsCm), isValidMeasurement),
        bicepsCm: getLatestValidValue(group, (entry) => toFiniteNumber(entry.bicepsCm), isValidMeasurement),
        thighCm: getLatestValidValue(group, (entry) => toFiniteNumber(entry.thighCm), isValidMeasurement),
        calfCm: getLatestValidValue(group, (entry) => toFiniteNumber(entry.calfCm), isValidMeasurement),
        neckCm: getLatestValidValue(group, (entry) => toFiniteNumber(entry.neckCm), isValidMeasurement),
        bodyFatPercent: getLatestValidValue(group, (entry) => toFiniteNumber(entry.bodyFatPercent), (value) => value !== null && value >= 0 && value <= 60),
        energy: roundMetric(average(energyValues)) ?? 0,
        hunger: roundMetric(average(hungerValues)) ?? 0,
        notes: getLatestTextValue(group, (entry) => entry.notes),
        recommendation: getLatestTextValue(group, (entry) => entry.recommendation),
        frontPhotoUrl: getLatestNullableTextValue(group, (entry) => entry.frontPhotoUrl),
        sidePhotoUrl: getLatestNullableTextValue(group, (entry) => entry.sidePhotoUrl),
        sourceCount: group.length,
      } satisfies DailyNormalizedCheckin;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function valuesFromEntries(entries: DailyNormalizedCheckin[], selector: (entry: DailyNormalizedCheckin) => number, validator: (value: number | null) => boolean): number[] {
  return entries
    .map((entry) => selector(entry))
    .map((value) => toFiniteNumber(value))
    .filter(validator) as number[];
}

function buildRollingWindow(entries: DailyNormalizedCheckin[], endDate: Date, windowDays: number): RollingWeeklyWindow | null {
  const startDate = addDays(endDate, -(Math.max(windowDays, 1) - 1));
  const inWindow = entries.filter((entry) => {
    const parsed = parseDate(entry.date);
    return parsed ? parsed >= startDate && parsed <= endDate : false;
  });
  if (inWindow.length === 0) return null;

  return {
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
    averageWeightKg: roundMetric(average(valuesFromEntries(inWindow, (entry) => entry.weightKg, isValidWeight))),
    averageWaistCm: roundMetric(average(valuesFromEntries(inWindow, (entry) => entry.waistCm, isValidMeasurement))),
    averageBodyFatPercent: roundMetric(average(valuesFromEntries(inWindow, (entry) => entry.bodyFatPercent, (value) => value !== null && value >= 0 && value <= 60))),
    averageEnergy: roundMetric(average(valuesFromEntries(inWindow, (entry) => entry.energy, isValidEnergy))),
    averageHunger: roundMetric(average(valuesFromEntries(inWindow, (entry) => entry.hunger, isValidEnergy))),
    daysLogged: inWindow.length,
  };
}

function buildWeeklySeries(entries: DailyNormalizedCheckin[], now: Date, weeks = 8): WeeklyTrendPoint[] {
  const currentWeekStart = startOfWeek(now, 1);
  const series: WeeklyTrendPoint[] = [];

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const startDate = addDays(currentWeekStart, -7 * index);
    const endDate = addDays(startDate, 6);
    const weekEntries = entries.filter((entry) => {
      const parsed = parseDate(entry.date);
      return parsed ? parsed >= startDate && parsed <= endDate : false;
    });

    const weekKey = toDateKey(startDate);
    const label = `${String(startDate.getUTCDate()).padStart(2, "0")}/${String(startDate.getUTCMonth() + 1).padStart(2, "0")}`;

    series.push({
      weekKey,
      label,
      startDate: weekKey,
      endDate: toDateKey(endDate),
      daysLogged: weekEntries.length,
      adherencePct: Math.round((weekEntries.length / 7) * 100),
      averageWeightKg: roundMetric(average(valuesFromEntries(weekEntries, (entry) => entry.weightKg, isValidWeight))),
      averageWaistCm: roundMetric(average(valuesFromEntries(weekEntries, (entry) => entry.waistCm, isValidMeasurement))),
      averageHipsCm: roundMetric(average(valuesFromEntries(weekEntries, (entry) => entry.hipsCm, isValidMeasurement))),
      averageBodyFatPercent: roundMetric(average(valuesFromEntries(weekEntries, (entry) => entry.bodyFatPercent, (value) => value !== null && value >= 0 && value <= 60))),
      averageEnergy: roundMetric(average(valuesFromEntries(weekEntries, (entry) => entry.energy, isValidEnergy))),
      averageHunger: roundMetric(average(valuesFromEntries(weekEntries, (entry) => entry.hunger, isValidEnergy))),
    });
  }

  return series;
}

function countUniqueDaysInRange(entries: Array<{ date: string }>, startDate: Date, endDate: Date): number {
  const unique = new Set<string>();
  entries.forEach((entry) => {
    const parsed = parseDate(entry.date);
    if (parsed && parsed >= startDate && parsed <= endDate) {
      unique.add(toDateKey(parsed));
    }
  });
  return unique.size;
}

function buildWaistHipInsight(entries: DailyNormalizedCheckin[], profile: ProfileData): WaistHipInsight | null {
  const latestWithRatio = entries.find((entry) => entry.waistCm > 0 && entry.hipsCm > 0);
  if (!latestWithRatio) return null;
  const ratio = latestWithRatio.waistCm / latestWithRatio.hipsCm;
  const assessment = assessWaistHipRatio(ratio, profile.sex);
  if (!assessment) return null;
  return {
    ratio: Number(ratio.toFixed(2)),
    assessment,
    waistCm: latestWithRatio.waistCm,
    hipsCm: latestWithRatio.hipsCm,
  };
}

function buildBodyCompositionSignals(weeklyRatePct: number | null, weeklyWaistDeltaCm: number | null, weeklyBodyFatDeltaPct: number | null): ProfessionalSignal[] {
  const signals: ProfessionalSignal[] = [];

  if (weeklyRatePct !== null && Math.abs(weeklyRatePct) <= 0.25 && weeklyWaistDeltaCm !== null && weeklyWaistDeltaCm <= -0.5) {
    signals.push({
      id: "recomp-probable",
      tone: "positive",
      title: "Recomposicion probable",
      detail: "El peso se mantiene bastante estable mientras la cintura baja. La lectura profesional favorece recomposicion corporal.",
    });
  }

  if (weeklyRatePct !== null && weeklyRatePct >= 0.1 && weeklyRatePct <= 0.4 && weeklyWaistDeltaCm !== null && weeklyWaistDeltaCm <= 0.4) {
    signals.push({
      id: "lean-gain-probable",
      tone: "positive",
      title: "Ganancia magra probable",
      detail: "El peso sube lento y la cintura se mantiene estable. Es una senal compatible con una ganancia mas limpia.",
    });
  }

  if (weeklyRatePct !== null && weeklyRatePct > 0.4 && weeklyWaistDeltaCm !== null && weeklyWaistDeltaCm >= 0.8) {
    signals.push({
      id: "negative-drift",
      tone: "negative",
      title: "Deriva negativa",
      detail: "El peso y la cintura suben a la vez por encima de lo deseable. Conviene revisar el superavit y la consistencia.",
    });
  }

  if (weeklyBodyFatDeltaPct !== null && weeklyBodyFatDeltaPct <= -0.3 && weeklyRatePct !== null && Math.abs(weeklyRatePct) <= 0.3) {
    signals.push({
      id: "bodyfat-improving",
      tone: "positive",
      title: "Composicion mejorando",
      detail: "El porcentaje graso cae sin un gran cambio de peso, lo que refuerza una lectura de mejora de composicion.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: "signal-neutral",
      tone: "neutral",
      title: "Sin senal fuerte aun",
      detail: "La lectura profesional necesita mas semanas consistentes para detectar una senal clara de recomposicion o deriva.",
    });
  }

  return signals;
}

function buildRecoveryCorrelation(args: {
  averageEnergy: number | null;
  averageHunger: number | null;
  combinedAdherencePct: number;
  weeklyRatePct: number | null;
}): RecoveryCorrelationInsight[] {
  const insights: RecoveryCorrelationInsight[] = [];
  const { averageEnergy, averageHunger, combinedAdherencePct, weeklyRatePct } = args;

  if (
    averageEnergy !== null &&
    averageHunger !== null &&
    averageEnergy <= 2.5 &&
    averageHunger >= 3.5 &&
    combinedAdherencePct >= 75 &&
    weeklyRatePct !== null &&
    weeklyRatePct <= -1
  ) {
    insights.push({
      id: "aggressive-deficit",
      tone: "negative",
      title: "Deficit agresivo probable",
      detail: "Energia baja, hambre alta, buena adherencia y una perdida rapida suelen apuntar a un deficit demasiado agresivo.",
    });
  }

  if (combinedAdherencePct < 60 && weeklyRatePct !== null && Math.abs(weeklyRatePct) <= 0.25) {
    insights.push({
      id: "consistency-issue",
      tone: "negative",
      title: "Parece un problema de consistencia",
      detail: "Las metricas estan planas con adherencia baja. Antes de cambiar el plan, conviene cerrar la brecha de ejecucion.",
    });
  }

  if (
    averageEnergy !== null &&
    averageHunger !== null &&
    averageEnergy >= 3 &&
    averageHunger <= 3.2 &&
    combinedAdherencePct >= 70
  ) {
    insights.push({
      id: "sustainable-compliance",
      tone: "positive",
      title: "Senales de buena sostenibilidad",
      detail: "La combinacion de energia razonable, hambre controlada y adherencia alta sugiere una fase mas sostenible.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "correlation-neutral",
      tone: "neutral",
      title: "Correlacion aun neutra",
      detail: "No hay una senal dominante entre energia, hambre y adherencia. Sigue acumulando semanas consistentes.",
    });
  }

  return insights;
}

function buildAlerts(args: {
  weeklyRateAssessment: WeeklyRateAssessment | null;
  combinedAdherencePct: number;
  checkinConsistencyPct: number;
  nutritionLoggingPct: number;
  trainingConsistencyPct: number;
  waistHip: WaistHipInsight | null;
}): ProfessionalAlert[] {
  const alerts: ProfessionalAlert[] = [];
  const { weeklyRateAssessment, combinedAdherencePct, checkinConsistencyPct, nutritionLoggingPct, trainingConsistencyPct, waistHip } = args;

  if (weeklyRateAssessment) {
    alerts.push({
      id: "weekly-rate",
      severity: weeklyRateAssessment.status === "on-track" ? "success" : weeklyRateAssessment.status,
      title: weeklyRateAssessment.title,
      detail: weeklyRateAssessment.detail,
    });
  }

  if (combinedAdherencePct < 60) {
    alerts.push({
      id: "combined-adherence",
      severity: "watch",
      title: "Adherencia global mejorable",
      detail: `La adherencia compuesta esta en ${combinedAdherencePct}%. Antes de retocar el plan, conviene asegurar ejecucion semanal mas consistente.`,
    });
  }

  if (checkinConsistencyPct < 50) {
    alerts.push({
      id: "checkin-consistency",
      severity: "watch",
      title: "Pocos dias de check-in",
      detail: "La tendencia profesional es mas fiable con al menos 4-5 dias registrados por semana. Ahora mismo la muestra es corta.",
    });
  }

  if (nutritionLoggingPct < 50) {
    alerts.push({
      id: "nutrition-logging",
      severity: "watch",
      title: "Nutricion poco registrada",
      detail: "La correlacion entre hambre, energia y progreso mejora cuando el log nutricional cubre mas dias de la semana.",
    });
  }

  if (trainingConsistencyPct < 60) {
    alerts.push({
      id: "training-consistency",
      severity: "watch",
      title: "Entrenamiento por debajo del objetivo",
      detail: "La frecuencia de entreno esta por debajo de la referencia del perfil, lo que puede contaminar la lectura de progreso.",
    });
  }

  if (waistHip && waistHip.assessment.status === "high") {
    alerts.push({
      id: "waist-hip-high",
      severity: "watch",
      title: "Cintura/cadera para vigilar",
      detail: waistHip.assessment.detail,
    });
  }

  return alerts;
}

export function buildProfessionalTrackingInsights({
  checkins,
  mealLog,
  workoutLog,
  profile,
  rangeDays = 30,
  now = new Date(),
}: BuildProfessionalTrackingInsightsArgs): ProfessionalTrackingInsights {
  const rangeConfig = getTrackingRangeConfig(rangeDays);
  const analysisNow = parseDate(toDateKey(now)) ?? now;
  const allDailyCheckins = normalizeDailyCheckins(checkins);
  const rangeStart = addDays(analysisNow, -(rangeConfig.days - 1));
  const dailyCheckins = allDailyCheckins.filter((entry) => {
    const parsed = parseDate(entry.date);
    return parsed ? parsed >= rangeStart && parsed <= analysisNow : false;
  });
  const latestDate = parseDate(dailyCheckins[0]?.date) ?? parseDate(allDailyCheckins[0]?.date) ?? now;
  const currentWindow = buildRollingWindow(dailyCheckins, latestDate, rangeConfig.windowDays);
  const previousWindow = buildRollingWindow(allDailyCheckins, addDays(latestDate, -rangeConfig.windowDays), rangeConfig.windowDays);
  const weeklyNormalizationFactor = 7 / rangeConfig.windowDays;
  const weeklyRateKg = currentWindow && previousWindow && currentWindow.averageWeightKg !== null && previousWindow.averageWeightKg !== null
    ? roundMetric((currentWindow.averageWeightKg - previousWindow.averageWeightKg) * weeklyNormalizationFactor)
    : null;
  const weeklyRatePct = currentWindow && previousWindow && currentWindow.averageWeightKg !== null && previousWindow.averageWeightKg !== null && previousWindow.averageWeightKg > 0
    ? roundMetric((((currentWindow.averageWeightKg - previousWindow.averageWeightKg) / previousWindow.averageWeightKg) * 100) * weeklyNormalizationFactor, 2)
    : null;
  const weeklyWaistDeltaCm = currentWindow && previousWindow && currentWindow.averageWaistCm !== null && previousWindow.averageWaistCm !== null
    ? roundMetric((currentWindow.averageWaistCm - previousWindow.averageWaistCm) * weeklyNormalizationFactor)
    : null;
  const weeklyBodyFatDeltaPct = currentWindow && previousWindow && currentWindow.averageBodyFatPercent !== null && previousWindow.averageBodyFatPercent !== null
    ? roundMetric((currentWindow.averageBodyFatPercent - previousWindow.averageBodyFatPercent) * weeklyNormalizationFactor)
    : null;

  const historyRows = dailyCheckins;

  const checkinDays = countUniqueDaysInRange(dailyCheckins, rangeStart, analysisNow);
  const nutritionDays = countUniqueDaysInRange(mealLog, rangeStart, analysisNow);
  const trainingDays = countUniqueDaysInRange(workoutLog, rangeStart, analysisNow);
  const targetSessions = Math.max(1, Number(profile.trainingPreferences.daysPerWeek ?? 3));
  const targetSessionsForRange = Math.max(1, Math.round((targetSessions * rangeConfig.days) / 7));
  const checkinConsistencyPct = Math.min(100, Math.round((checkinDays / rangeConfig.days) * 100));
  const nutritionLoggingPct = Math.min(100, Math.round((nutritionDays / rangeConfig.days) * 100));
  const trainingConsistencyPct = Math.min(100, Math.round((trainingDays / targetSessionsForRange) * 100));
  const combinedAdherencePct = Math.round((checkinConsistencyPct * 0.2) + (nutritionLoggingPct * 0.45) + (trainingConsistencyPct * 0.35));

  const weeklyRateAssessment = assessWeeklyRate(profile.goal, weeklyRatePct);
  const waistHip = buildWaistHipInsight(dailyCheckins, profile);
  const bodyCompositionSignals = buildBodyCompositionSignals(weeklyRatePct, weeklyWaistDeltaCm, weeklyBodyFatDeltaPct);
  const recoveryCorrelation = buildRecoveryCorrelation({
    averageEnergy: currentWindow?.averageEnergy ?? null,
    averageHunger: currentWindow?.averageHunger ?? null,
    combinedAdherencePct,
    weeklyRatePct,
  });
  const alerts = buildAlerts({
    weeklyRateAssessment,
    combinedAdherencePct,
    checkinConsistencyPct,
    nutritionLoggingPct,
    trainingConsistencyPct,
    waistHip,
  });

  return {
    rangeConfig,
    dailyCheckins,
    weeklySeries: buildWeeklySeries(dailyCheckins, analysisNow, rangeConfig.trendWeeks),
    currentWindow,
    previousWindow,
    weeklyRatePct,
    weeklyRateKg,
    weeklyRateAssessment,
    weeklyWaistDeltaCm,
    weeklyBodyFatDeltaPct,
    combinedAdherencePct,
    nutritionLoggingPct,
    trainingConsistencyPct,
    checkinConsistencyPct,
    waistHip,
    alerts,
    bodyCompositionSignals,
    recoveryCorrelation,
    historyRows,
  };
}
