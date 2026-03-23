import crypto from "node:crypto";
import type { TrackingSnapshot } from "../tracking/schemas.js";
import type {
  FutureProjectionResponse,
  RctMetricSnapshot,
} from "../schemas/futureProjection.js";

type Goal = "cut" | "maintain" | "bulk";
type RctGroup = "control" | "treatment";
type ProjectionMode = "minimal" | "full";

type UserProjectionInput = {
  userId: string;
  goal: Goal;
  tracking: TrackingSnapshot;
  targetSessionsPerWeek: number;
  now?: Date;
};

type WeeklyReviewDecision = "accepted" | "rejected" | "pending";

type WeeklyReviewProfilePayload = {
  recommendations?: Array<{ decision?: WeeklyReviewDecision }>;
};

export type RctAssignment = {
  experimentId: string;
  group: RctGroup;
  projectionMode: ProjectionMode;
  status: "active";
  assignedAt: string;
};

export type RctEvent = {
  event:
    | "projection_viewed"
    | "projection_scenario_selected"
    | "recommendation_accepted"
    | "recommendation_rejected"
    | "logging_entry_created";
  timestamp: string;
  context?: Record<string, string | number | boolean | null>;
};

const RCT_EXPERIMENT_ID = "future-self-rct-v1";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shiftDays(base: Date, delta: number): Date {
  const next = new Date(base);
  next.setUTCDate(base.getUTCDate() + delta);
  return next;
}

function countUniqueDays(items: Array<{ date: string }>, startDate: string): number {
  return new Set(items.filter((entry) => entry.date >= startDate).map((entry) => entry.date)).size;
}

function countPassiveActiveDays(tracking: TrackingSnapshot, startDate: string): number {
  return new Set(
    tracking.passiveData.snapshots
      .filter((entry) => entry.date >= startDate)
      .filter(
        (entry) =>
          (entry.steps ?? 0) >= 7000 ||
          (entry.activeMinutes ?? 0) >= 25 ||
          entry.exerciseSessions >= 1,
      )
      .map((entry) => entry.date),
  ).size;
}

function resolveWeightTrendKgPerWeek(tracking: TrackingSnapshot, startDate: string): number | null {
  const candidates = tracking.checkins
    .filter((entry) => entry.date >= startDate && entry.weightKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (candidates.length < 2) return null;
  const first = candidates[0];
  const last = candidates[candidates.length - 1];
  const days = Math.max(1, Math.round((parseIsoDate(last.date).getTime() - parseIsoDate(first.date).getTime()) / 86_400_000));
  const weeklyDelta = ((last.weightKg - first.weightKg) / days) * 7;
  return round(weeklyDelta, 3);
}

function resolveCurrentWeight(tracking: TrackingSnapshot): number | null {
  const latest = [...tracking.checkins]
    .filter((entry) => entry.weightKg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest ? round(latest.weightKg, 2) : null;
}

function buildAssumptions(goal: Goal, months: 3 | 6 | 12, targetSessionsPerWeek: number): string[] {
  const goalText =
    goal === "cut"
      ? "objetivo de reduccion gradual de peso"
      : goal === "bulk"
        ? "objetivo de ganancia gradual de peso"
        : "objetivo de mantenimiento";
  return [
    `Se asume que mantienes una frecuencia cercana a ${targetSessionsPerWeek} sesiones/semana durante ${months} meses.`,
    `La proyeccion usa tu tendencia reciente de peso y consistencia de las ultimas 4 semanas, con ${goalText}.`,
    "El resultado es un rango orientativo y puede variar por sueno, estres, lesion, adherencia nutricional y cambios de plan.",
  ];
}

function normalizeRange(a: number, b: number): { min: number; max: number } {
  return a <= b ? { min: round(a, 2), max: round(b, 2) } : { min: round(b, 2), max: round(a, 2) };
}

function getScenarioLabel(id: "current-consistency" | "improved-consistency"): string {
  return id === "current-consistency" ? "Si mantienes tu consistencia actual" : "Si mejoras un poco tu consistencia";
}

function hashToGroup(userId: string): RctGroup {
  const digest = crypto.createHash("sha256").update(`${userId}:${RCT_EXPERIMENT_ID}`).digest("hex");
  const firstByte = Number.parseInt(digest.slice(0, 2), 16);
  return firstByte % 2 === 0 ? "control" : "treatment";
}

export function ensureRctAssignment(profile: unknown, userId: string, now = new Date()): {
  assignment: RctAssignment;
  profile: Record<string, unknown>;
  created: boolean;
} {
  const source = asRecord(profile);
  const research = asRecord(source.research);
  const storedRct = asRecord(research.rct);
  const storedExperimentId = typeof storedRct.experimentId === "string" ? storedRct.experimentId : null;

  const isStoredValid =
    storedExperimentId === RCT_EXPERIMENT_ID &&
    (storedRct.group === "control" || storedRct.group === "treatment") &&
    (storedRct.projectionMode === "minimal" || storedRct.projectionMode === "full") &&
    typeof storedRct.assignedAt === "string";

  if (isStoredValid) {
    const storedGroup = storedRct.group as RctGroup;
    const storedProjectionMode = storedRct.projectionMode as ProjectionMode;
    const storedAssignedAt = storedRct.assignedAt as string;
    const assignment: RctAssignment = {
      experimentId: RCT_EXPERIMENT_ID,
      group: storedGroup,
      projectionMode: storedProjectionMode,
      status: "active",
      assignedAt: storedAssignedAt,
    };
    return { assignment, profile: source, created: false };
  }

  const group = hashToGroup(userId);
  const assignment: RctAssignment = {
    experimentId: RCT_EXPERIMENT_ID,
    group,
    projectionMode: group === "treatment" ? "full" : "minimal",
    status: "active",
    assignedAt: now.toISOString(),
  };

  return {
    assignment,
    created: true,
    profile: {
      ...source,
      research: {
        ...research,
        rct: {
          ...storedRct,
          ...assignment,
          events: Array.isArray(storedRct.events) ? storedRct.events : [],
          metricsHistory: Array.isArray(storedRct.metricsHistory)
            ? storedRct.metricsHistory
            : [],
        },
      },
    },
  };
}

export function buildFutureProjection(
  input: UserProjectionInput,
  assignment: RctAssignment,
): FutureProjectionResponse {
  const now = input.now ?? new Date();
  const start28 = toIsoDate(shiftDays(now, -27));
  const start42 = toIsoDate(shiftDays(now, -41));

  const workouts28 = input.tracking.workoutLog.filter((entry) => entry.date >= start28).length;
  const checkins28 = input.tracking.checkins.filter((entry) => entry.date >= start28).length;
  const loggingDays28 = countUniqueDays(
    [
      ...input.tracking.checkins,
      ...input.tracking.mealLog,
      ...input.tracking.foodLog,
      ...input.tracking.workoutLog,
    ],
    start28,
  );
  const passiveActiveDays28 = countPassiveActiveDays(input.tracking, start28);

  const expectedSessions28 = input.targetSessionsPerWeek * 4;
  const trainingConsistency = clamp(workouts28 / Math.max(1, expectedSessions28), 0, 1);
  const checkinConsistency = clamp(checkins28 / 4, 0, 1);
  const loggingConsistency = clamp(loggingDays28 / 28, 0, 1);
  const passiveConsistency = clamp(passiveActiveDays28 / 28, 0, 1);

  const adherenceScore = clamp(
    trainingConsistency * 0.45 +
      loggingConsistency * 0.25 +
      checkinConsistency * 0.2 +
      passiveConsistency * 0.1,
    0,
    1,
  );

  const consistencyScore = clamp(
    trainingConsistency * 0.6 + loggingConsistency * 0.3 + checkinConsistency * 0.1,
    0,
    1,
  );

  const loggingFrequencyDaysPerWeek = round((loggingDays28 / 28) * 7, 1);
  const weightTrendKgPerWeek = resolveWeightTrendKgPerWeek(input.tracking, start42);
  const currentWeightKg = resolveCurrentWeight(input.tracking);

  const baseMonthlyDelta =
    input.goal === "cut" ? -0.6 : input.goal === "bulk" ? 0.35 : 0;

  const horizons: Array<3 | 6 | 12> = [3, 6, 12];
  const projectionHorizons = horizons.map((months) => {
    const uncertainty =
      consistencyScore >= 0.75 ? 0.25 : consistencyScore >= 0.45 ? 0.35 : 0.5;

    const trendModifier =
      weightTrendKgPerWeek === null
        ? 1
        : input.goal === "cut"
          ? weightTrendKgPerWeek > 0
            ? 0.78
            : 1.08
          : input.goal === "bulk"
            ? weightTrendKgPerWeek < 0
              ? 0.82
              : 1.05
            : 1;

    const scenarioIds: Array<"current-consistency" | "improved-consistency"> =
      assignment.projectionMode === "full"
        ? ["current-consistency", "improved-consistency"]
        : ["current-consistency"];

    const scenarios = scenarioIds.map((scenarioId) => {
      const scenarioAdherence =
        scenarioId === "improved-consistency"
          ? clamp(adherenceScore + 0.15, 0, 1)
          : adherenceScore;
      const adherenceMultiplier = 0.4 + scenarioAdherence * 0.9;

      const expected =
        baseMonthlyDelta * months * adherenceMultiplier * trendModifier;
      const range = normalizeRange(expected * (1 - uncertainty), expected * (1 + uncertainty));

      const projectedWeight =
        currentWeightKg === null
          ? null
          : {
              current: round(currentWeightKg, 2),
              ...normalizeRange(currentWeightKg + range.min, currentWeightKg + range.max),
            };

      return {
        id: scenarioId,
        label: getScenarioLabel(scenarioId),
        adherenceScore: round(scenarioAdherence, 3),
        expectedDeltaKg: range,
        projectedWeightKg: projectedWeight,
        assumptions: buildAssumptions(input.goal, months, input.targetSessionsPerWeek),
      };
    });

    const confidence: "low" | "medium" | "high" =
      consistencyScore >= 0.75
        ? "high"
        : consistencyScore >= 0.45
          ? "medium"
          : "low";

    return {
      months,
      confidence,
      scenarios,
    };
  });

  return {
    generatedAt: now.toISOString(),
    experiment: {
      id: assignment.experimentId,
      group: assignment.group,
      projectionMode: assignment.projectionMode,
    },
    inputs: {
      goal: input.goal,
      currentWeightKg,
      targetSessionsPerWeek: input.targetSessionsPerWeek,
      adherenceScore: round(adherenceScore, 3),
      consistencyScore: round(consistencyScore, 3),
      loggingFrequencyDaysPerWeek,
      weightTrendKgPerWeek,
    },
    horizons: projectionHorizons,
    limitations: [
      "La proyeccion v1 es determinista y no usa diagnostico clinico ni modelo medico.",
      "Si faltan datos de peso o registro semanal, la incertidumbre sube y el rango se vuelve mas amplio.",
      "Eventos externos (lesion, vacaciones, cambios de rutina) no se modelan automaticamente en esta version.",
    ],
    disclaimer:
      "Esta proyeccion es orientativa y no garantiza resultados. Usala como referencia para ajustar habitos con criterio.",
  };
}

export function buildRctMetricSnapshot(
  tracking: TrackingSnapshot,
  profile: unknown,
  now = new Date(),
): RctMetricSnapshot {
  const start7 = toIsoDate(shiftDays(now, -6));
  const start28 = toIsoDate(shiftDays(now, -27));

  const weeklyActivitySessions = tracking.workoutLog.filter((entry) => entry.date >= start7).length;
  const loggingFrequencyDays = countUniqueDays(
    [...tracking.checkins, ...tracking.mealLog, ...tracking.foodLog, ...tracking.workoutLog],
    start7,
  );

  const expectedSessions28 = 12;
  const workouts28 = tracking.workoutLog.filter((entry) => entry.date >= start28).length;
  const checkins28 = tracking.checkins.filter((entry) => entry.date >= start28).length;
  const loggingDays28 = countUniqueDays(
    [...tracking.checkins, ...tracking.mealLog, ...tracking.foodLog, ...tracking.workoutLog],
    start28,
  );
  const passiveActiveDays28 = countPassiveActiveDays(tracking, start28);

  const adherenceScore = clamp(
    clamp(workouts28 / expectedSessions28, 0, 1) * 0.45 +
      clamp(loggingDays28 / 28, 0, 1) * 0.25 +
      clamp(checkins28 / 4, 0, 1) * 0.2 +
      clamp(passiveActiveDays28 / 28, 0, 1) * 0.1,
    0,
    1,
  );

  const source = asRecord(profile);
  const adaptiveEngine = asRecord(source.adaptiveEngine);
  const weeklyReviews = asRecord(adaptiveEngine.weeklyReviews);
  const reviews = Object.values(weeklyReviews)
    .map((entry) => asRecord(entry))
    .map((entry) => asRecord(entry.review) as WeeklyReviewProfilePayload);

  let accepted = 0;
  let rejected = 0;
  reviews.forEach((review) => {
    (review.recommendations ?? []).forEach((recommendation) => {
      if (recommendation.decision === "accepted") accepted += 1;
      if (recommendation.decision === "rejected") rejected += 1;
    });
  });

  const totalDecisions = accepted + rejected;

  return {
    weekKey: toIsoDate(now),
    weeklyActivitySessions,
    adherenceScore: round(adherenceScore, 3),
    recommendationAcceptanceRate:
      totalDecisions > 0 ? round(accepted / totalDecisions, 3) : null,
    loggingFrequencyDays,
    capturedAt: now.toISOString(),
  };
}

export function mergeRctMetricSnapshot(profile: unknown, metric: RctMetricSnapshot): Record<string, unknown> {
  const source = asRecord(profile);
  const research = asRecord(source.research);
  const rct = asRecord(research.rct);
  const existing = Array.isArray(rct.metricsHistory)
    ? rct.metricsHistory.filter((item) => typeof item === "object" && item !== null)
    : [];

  const next = [
    metric,
    ...existing.filter((item) => asRecord(item).weekKey !== metric.weekKey),
  ]
    .sort((a, b) => {
      const left = typeof asRecord(a).weekKey === "string" ? (asRecord(a).weekKey as string) : "";
      const right = typeof asRecord(b).weekKey === "string" ? (asRecord(b).weekKey as string) : "";
      return right.localeCompare(left);
    })
    .slice(0, 16);

  return {
    ...source,
    research: {
      ...research,
      rct: {
        ...rct,
        metricsHistory: next,
      },
    },
  };
}

export function appendRctEvent(profile: unknown, event: RctEvent): Record<string, unknown> {
  const source = asRecord(profile);
  const research = asRecord(source.research);
  const rct = asRecord(research.rct);
  const existingEvents = Array.isArray(rct.events)
    ? rct.events.filter((item) => typeof item === "object" && item !== null)
    : [];

  return {
    ...source,
    research: {
      ...research,
      rct: {
        ...rct,
        events: [event, ...existingEvents].slice(0, 240),
      },
    },
  };
}

export function summarizeRctEvents(profile: unknown) {
  const source = asRecord(profile);
  const research = asRecord(source.research);
  const rct = asRecord(research.rct);
  const events = Array.isArray(rct.events)
    ? rct.events.filter((item) => typeof item === "object" && item !== null)
    : [];

  const counters = {
    projectionViewed: 0,
    scenarioSelected: 0,
    recommendationsAccepted: 0,
    recommendationsRejected: 0,
    loggingEvents: 0,
  };

  events.forEach((event) => {
    const typed = asRecord(event);
    if (typed.event === "projection_viewed") counters.projectionViewed += 1;
    if (typed.event === "projection_scenario_selected") counters.scenarioSelected += 1;
    if (typed.event === "recommendation_accepted") counters.recommendationsAccepted += 1;
    if (typed.event === "recommendation_rejected") counters.recommendationsRejected += 1;
    if (typed.event === "logging_entry_created") counters.loggingEvents += 1;
  });

  return counters;
}

export function getLatestStoredMetric(profile: unknown): RctMetricSnapshot | null {
  const source = asRecord(profile);
  const research = asRecord(source.research);
  const rct = asRecord(research.rct);
  const metrics = Array.isArray(rct.metricsHistory) ? rct.metricsHistory : [];
  const latest = metrics
    .map((item) => asRecord(item))
    .sort((a, b) => {
      const left = typeof a.weekKey === "string" ? a.weekKey : "";
      const right = typeof b.weekKey === "string" ? b.weekKey : "";
      return right.localeCompare(left);
    })[0];

  if (!latest) return null;

  if (
    typeof latest.weekKey !== "string" ||
    typeof latest.capturedAt !== "string" ||
    typeof latest.weeklyActivitySessions !== "number" ||
    typeof latest.adherenceScore !== "number" ||
    typeof latest.loggingFrequencyDays !== "number"
  ) {
    return null;
  }

  return {
    weekKey: latest.weekKey,
    weeklyActivitySessions: latest.weeklyActivitySessions,
    adherenceScore: latest.adherenceScore,
    recommendationAcceptanceRate:
      typeof latest.recommendationAcceptanceRate === "number"
        ? latest.recommendationAcceptanceRate
        : null,
    loggingFrequencyDays: latest.loggingFrequencyDays,
    capturedAt: latest.capturedAt,
  };
}
