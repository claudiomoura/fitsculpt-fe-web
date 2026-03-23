import { normalizeTrackingSnapshot } from "../tracking/service.js";
import type { RctSummaryResponse } from "../schemas/rctSummary.js";

type RctGroup = "control" | "treatment";

type ProfileRow = {
  profile: unknown;
  tracking: unknown;
};

type UserWindowMetrics = {
  group: RctGroup;
  adherenceScore: number;
  loggingFrequencyDaysPerWeek: number;
  weeklyActivitySessions: number;
  acceptedRecommendations: number;
  rejectedRecommendations: number;
  isActive: boolean;
};

const RCT_EXPERIMENT_ID = "future-self-rct-v1";
const DEFAULT_WINDOW_DAYS = 56;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function shiftDays(base: Date, delta: number): Date {
  const next = new Date(base);
  next.setUTCDate(base.getUTCDate() + delta);
  return next;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function resolveWindowDays(input: { windowDays?: number; windowWeeks?: number }): number {
  if (typeof input.windowDays === "number") return input.windowDays;
  if (typeof input.windowWeeks === "number") return input.windowWeeks * 7;
  return DEFAULT_WINDOW_DAYS;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((acc, value) => acc + value, 0);
  return round(total / values.length);
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return round(numerator / denominator);
}

function hasEventWithinWindow(
  profile: unknown,
  startDateInclusive: string,
  endDateInclusive: string,
  eventName?: "recommendation_accepted" | "recommendation_rejected",
): number {
  const source = asRecord(profile);
  const research = asRecord(source.research);
  const rct = asRecord(research.rct);
  const events = Array.isArray(rct.events) ? rct.events : [];

  return events.reduce((count, event) => {
    const typed = asRecord(event);
    if (eventName && typed.event !== eventName) return count;
    const timestamp = typeof typed.timestamp === "string" ? typed.timestamp : null;
    if (!timestamp) return count;
    const dateKey = timestamp.slice(0, 10);
    if (dateKey < startDateInclusive || dateKey > endDateInclusive) return count;
    return count + 1;
  }, 0);
}

function resolveRctGroup(profile: unknown): RctGroup | null {
  const source = asRecord(profile);
  const research = asRecord(source.research);
  const rct = asRecord(research.rct);
  if (rct.experimentId !== RCT_EXPERIMENT_ID) return null;
  if (rct.group !== "control" && rct.group !== "treatment") return null;
  return rct.group;
}

function buildUserWindowMetrics(
  row: ProfileRow,
  window: { startDate: string; endDate: string; days: number; weeksApprox: number },
): UserWindowMetrics | null {
  const group = resolveRctGroup(row.profile);
  if (!group) return null;

  const tracking = normalizeTrackingSnapshot(row.tracking);

  const loggingDates = new Set<string>();
  tracking.checkins.forEach((entry) => {
    if (entry.date >= window.startDate && entry.date <= window.endDate) loggingDates.add(entry.date);
  });
  tracking.foodLog.forEach((entry) => {
    if (entry.date >= window.startDate && entry.date <= window.endDate) loggingDates.add(entry.date);
  });
  tracking.mealLog.forEach((entry) => {
    if (entry.date >= window.startDate && entry.date <= window.endDate) loggingDates.add(entry.date);
  });
  tracking.workoutLog.forEach((entry) => {
    if (entry.date >= window.startDate && entry.date <= window.endDate) loggingDates.add(entry.date);
  });

  const workouts = tracking.workoutLog.filter(
    (entry) => entry.date >= window.startDate && entry.date <= window.endDate,
  ).length;
  const checkins = tracking.checkins.filter(
    (entry) => entry.date >= window.startDate && entry.date <= window.endDate,
  ).length;

  const passiveActiveDaysSet = new Set<string>();
  tracking.passiveData.snapshots.forEach((entry) => {
    if (entry.date < window.startDate || entry.date > window.endDate) return;
    if ((entry.steps ?? 0) >= 7000 || (entry.activeMinutes ?? 0) >= 25 || entry.exerciseSessions >= 1) {
      passiveActiveDaysSet.add(entry.date);
    }
  });

  const allActiveDates = new Set<string>([...loggingDates, ...passiveActiveDaysSet]);
  const acceptedRecommendations = hasEventWithinWindow(
    row.profile,
    window.startDate,
    window.endDate,
    "recommendation_accepted",
  );
  const rejectedRecommendations = hasEventWithinWindow(
    row.profile,
    window.startDate,
    window.endDate,
    "recommendation_rejected",
  );

  const expectedWorkouts = Math.max(1, 3 * window.weeksApprox);
  const adherenceScore = clamp(
    clamp(workouts / expectedWorkouts, 0, 1) * 0.45 +
      clamp(loggingDates.size / window.days, 0, 1) * 0.25 +
      clamp(checkins / window.weeksApprox, 0, 1) * 0.2 +
      clamp(passiveActiveDaysSet.size / window.days, 0, 1) * 0.1,
    0,
    1,
  );

  const isActive = allActiveDates.size > 0 || acceptedRecommendations + rejectedRecommendations > 0;

  return {
    group,
    adherenceScore: round(adherenceScore),
    loggingFrequencyDaysPerWeek: round(loggingDates.size / window.weeksApprox),
    weeklyActivitySessions: round(workouts / window.weeksApprox),
    acceptedRecommendations,
    rejectedRecommendations,
    isActive,
  };
}

function buildGroupSummary(userMetrics: UserWindowMetrics[]) {
  const sampleSize = userMetrics.length;
  const activeUsers = userMetrics.filter((entry) => entry.isActive).length;
  const acceptedRecommendations = userMetrics.reduce(
    (acc, entry) => acc + entry.acceptedRecommendations,
    0,
  );
  const rejectedRecommendations = userMetrics.reduce(
    (acc, entry) => acc + entry.rejectedRecommendations,
    0,
  );

  return {
    sampleSize,
    activeUsers,
    retentionProxy: rate(activeUsers, sampleSize),
    adherenceMean: mean(userMetrics.map((entry) => entry.adherenceScore)),
    loggingFrequencyMean: mean(userMetrics.map((entry) => entry.loggingFrequencyDaysPerWeek)),
    recommendationAcceptanceRate: rate(
      acceptedRecommendations,
      acceptedRecommendations + rejectedRecommendations,
    ),
    weeklyActivitySessionsMean: mean(userMetrics.map((entry) => entry.weeklyActivitySessions)),
  };
}

function computeDelta(treatment: number | null, control: number | null): number | null {
  if (treatment === null || control === null) return null;
  return round(treatment - control);
}

export function buildRctExperimentSummary(
  rows: ProfileRow[],
  input: { windowDays?: number; windowWeeks?: number; now?: Date },
): RctSummaryResponse {
  const now = input.now ?? new Date();
  const days = resolveWindowDays(input);
  const weeksApprox = round(days / 7);
  const endDate = toIsoDate(now);
  const startDate = toIsoDate(shiftDays(now, -(days - 1)));

  const window = {
    startDate,
    endDate,
    days,
    weeksApprox,
  };

  const metrics = rows
    .map((row) => buildUserWindowMetrics(row, window))
    .filter((entry): entry is UserWindowMetrics => entry !== null);

  const byGroup = {
    control: metrics.filter((entry) => entry.group === "control"),
    treatment: metrics.filter((entry) => entry.group === "treatment"),
  };

  const groups = {
    control: buildGroupSummary(byGroup.control),
    treatment: buildGroupSummary(byGroup.treatment),
  };

  const deltaTreatmentVsControl = {
    sampleSize: groups.treatment.sampleSize - groups.control.sampleSize,
    activeUsers: groups.treatment.activeUsers - groups.control.activeUsers,
    retentionProxy: computeDelta(groups.treatment.retentionProxy, groups.control.retentionProxy),
    adherenceMean: computeDelta(groups.treatment.adherenceMean, groups.control.adherenceMean),
    loggingFrequencyMean: computeDelta(
      groups.treatment.loggingFrequencyMean,
      groups.control.loggingFrequencyMean,
    ),
    recommendationAcceptanceRate: computeDelta(
      groups.treatment.recommendationAcceptanceRate,
      groups.control.recommendationAcceptanceRate,
    ),
    weeklyActivitySessionsMean: computeDelta(
      groups.treatment.weeklyActivitySessionsMean,
      groups.control.weeklyActivitySessionsMean,
    ),
  };

  const metricsComparison: RctSummaryResponse["metrics"] = [
    {
      key: "sample_size",
      label: "Usuarios en grupo",
      unit: "count",
      control: groups.control.sampleSize,
      treatment: groups.treatment.sampleSize,
      deltaTreatmentVsControl: deltaTreatmentVsControl.sampleSize,
    },
    {
      key: "active_users",
      label: "Usuarios activos en ventana",
      unit: "count",
      control: groups.control.activeUsers,
      treatment: groups.treatment.activeUsers,
      deltaTreatmentVsControl: deltaTreatmentVsControl.activeUsers,
    },
    {
      key: "retention_proxy",
      label: "Retencion proxy",
      unit: "ratio",
      control: groups.control.retentionProxy,
      treatment: groups.treatment.retentionProxy,
      deltaTreatmentVsControl: deltaTreatmentVsControl.retentionProxy,
    },
    {
      key: "adherence_mean",
      label: "Adherencia media",
      unit: "ratio",
      control: groups.control.adherenceMean,
      treatment: groups.treatment.adherenceMean,
      deltaTreatmentVsControl: deltaTreatmentVsControl.adherenceMean,
    },
    {
      key: "logging_frequency_mean",
      label: "Frecuencia de logging media",
      unit: "days_per_week",
      control: groups.control.loggingFrequencyMean,
      treatment: groups.treatment.loggingFrequencyMean,
      deltaTreatmentVsControl: deltaTreatmentVsControl.loggingFrequencyMean,
    },
    {
      key: "recommendation_acceptance_rate",
      label: "Recommendation acceptance rate",
      unit: "ratio",
      control: groups.control.recommendationAcceptanceRate,
      treatment: groups.treatment.recommendationAcceptanceRate,
      deltaTreatmentVsControl: deltaTreatmentVsControl.recommendationAcceptanceRate,
    },
    {
      key: "weekly_activity_sessions_mean",
      label: "Weekly activity sessions media",
      unit: "sessions_per_week",
      control: groups.control.weeklyActivitySessionsMean,
      treatment: groups.treatment.weeklyActivitySessionsMean,
      deltaTreatmentVsControl: deltaTreatmentVsControl.weeklyActivitySessionsMean,
    },
  ];

  return {
    experimentId: RCT_EXPERIMENT_ID,
    generatedAt: now.toISOString(),
    window,
    groups,
    deltaTreatmentVsControl,
    metrics: metricsComparison,
  };
}
