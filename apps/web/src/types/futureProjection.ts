export type RctGroup = "control" | "treatment";
export type RctProjectionMode = "minimal" | "full";

export type FutureProjectionScenario = {
  id: "current-consistency" | "improved-consistency";
  label: string;
  adherenceScore: number;
  expectedDeltaKg: {
    min: number;
    max: number;
  };
  projectedWeightKg: {
    current: number;
    min: number;
    max: number;
  } | null;
  assumptions: string[];
};

export type FutureProjectionHorizon = {
  months: 3 | 6 | 12;
  confidence: "low" | "medium" | "high";
  scenarios: FutureProjectionScenario[];
};

export type FutureProjectionResponse = {
  generatedAt: string;
  experiment: {
    id: string;
    group: RctGroup;
    projectionMode: RctProjectionMode;
  };
  inputs: {
    goal: "cut" | "maintain" | "bulk";
    currentWeightKg: number | null;
    targetSessionsPerWeek: number;
    adherenceScore: number;
    consistencyScore: number;
    loggingFrequencyDaysPerWeek: number;
    weightTrendKgPerWeek: number | null;
  };
  horizons: FutureProjectionHorizon[];
  limitations: string[];
  disclaimer: string;
};

export type RctMetricSnapshot = {
  weekKey: string;
  weeklyActivitySessions: number;
  adherenceScore: number;
  recommendationAcceptanceRate: number | null;
  loggingFrequencyDays: number;
  capturedAt: string;
};

export type RctStatusResponse = {
  experimentId: string;
  group: RctGroup;
  projectionMode: RctProjectionMode;
  status: "active";
  assignedAt: string;
  latestMetrics: RctMetricSnapshot;
  eventCounts: {
    projectionViewed: number;
    scenarioSelected: number;
    recommendationsAccepted: number;
    recommendationsRejected: number;
    loggingEvents: number;
  };
};

export type RctEventRequest = {
  event:
    | "projection_viewed"
    | "projection_scenario_selected"
    | "recommendation_accepted"
    | "recommendation_rejected"
    | "logging_entry_created";
  context?: Record<string, string | number | boolean | null>;
};

export type RctSummaryMetric = {
  key:
    | "sample_size"
    | "active_users"
    | "retention_proxy"
    | "adherence_mean"
    | "logging_frequency_mean"
    | "recommendation_acceptance_rate"
    | "weekly_activity_sessions_mean";
  label: string;
  unit: "count" | "ratio" | "days_per_week" | "sessions_per_week";
  control: number | null;
  treatment: number | null;
  deltaTreatmentVsControl: number | null;
};

export type RctSummaryResponse = {
  experimentId: string;
  generatedAt: string;
  window: {
    days: number;
    weeksApprox: number;
    startDate: string;
    endDate: string;
  };
  groups: {
    control: {
      sampleSize: number;
      activeUsers: number;
      retentionProxy: number | null;
      adherenceMean: number | null;
      loggingFrequencyMean: number | null;
      recommendationAcceptanceRate: number | null;
      weeklyActivitySessionsMean: number | null;
    };
    treatment: {
      sampleSize: number;
      activeUsers: number;
      retentionProxy: number | null;
      adherenceMean: number | null;
      loggingFrequencyMean: number | null;
      recommendationAcceptanceRate: number | null;
      weeklyActivitySessionsMean: number | null;
    };
  };
  deltaTreatmentVsControl: {
    sampleSize: number;
    activeUsers: number;
    retentionProxy: number | null;
    adherenceMean: number | null;
    loggingFrequencyMean: number | null;
    recommendationAcceptanceRate: number | null;
    weeklyActivitySessionsMean: number | null;
  };
  metrics: RctSummaryMetric[];
};

export type RctStatisticalSignificance = {
  status: "approximated" | "insufficient_data";
  method: "two_proportion_z" | "unavailable";
  statistic: number | null;
  pValueApprox: number | null;
  note: string;
};

export type RctStatisticalMetric = {
  key:
    | "retention_proxy"
    | "adherence_mean"
    | "logging_frequency_mean"
    | "recommendation_acceptance_rate"
    | "weekly_activity_sessions_mean";
  label: string;
  unit: "ratio" | "days_per_week" | "sessions_per_week";
  controlMean: number | null;
  treatmentMean: number | null;
  deltaTreatmentVsControl: number | null;
  relativeEffectPercent: number | null;
  practicalEffect:
    | "negligible practical effect"
    | "small practical effect"
    | "medium practical effect"
    | "large practical effect"
    | "insufficient baseline for practical effect";
  sampleConfidence: "low" | "medium" | "high";
  significance: RctStatisticalSignificance;
};

export type RctStatisticalReportResponse = {
  experimentId: string;
  generatedAt: string;
  disclaimer: string;
  limitations: string[];
  window: {
    days: number;
    weeksApprox: number;
    startDate: string;
    endDate: string;
  };
  sample: {
    controlN: number;
    treatmentN: number;
    minGroupN: number;
    controlCompleteness: number;
    treatmentCompleteness: number;
    overallCompleteness: number;
    confidence: "low" | "medium" | "high";
    rationale: string;
  };
  metrics: RctStatisticalMetric[];
};
