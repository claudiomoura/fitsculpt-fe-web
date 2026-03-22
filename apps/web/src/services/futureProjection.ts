import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";
import type {
  FutureProjectionResponse,
  RctEventRequest,
  RctStatisticalReportResponse,
  RctSummaryResponse,
  RctStatusResponse,
} from "@/types/futureProjection";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isDatetime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseFutureProjection(value: unknown): FutureProjectionResponse | null {
  if (!isRecord(value)) return null;
  if (!isDatetime(value.generatedAt) || !Array.isArray(value.horizons)) return null;
  if (!Array.isArray(value.limitations) || typeof value.disclaimer !== "string") return null;

  const experiment = value.experiment;
  if (!isRecord(experiment)) return null;
  if (typeof experiment.id !== "string") return null;
  if (experiment.group !== "control" && experiment.group !== "treatment") return null;
  if (experiment.projectionMode !== "minimal" && experiment.projectionMode !== "full") return null;

  const inputs = value.inputs;
  if (!isRecord(inputs)) return null;
  if (inputs.goal !== "cut" && inputs.goal !== "maintain" && inputs.goal !== "bulk") return null;
  if (!(inputs.currentWeightKg === null || typeof inputs.currentWeightKg === "number")) return null;
  if (typeof inputs.targetSessionsPerWeek !== "number") return null;
  if (typeof inputs.adherenceScore !== "number" || typeof inputs.consistencyScore !== "number") return null;
  if (typeof inputs.loggingFrequencyDaysPerWeek !== "number") return null;
  if (!(inputs.weightTrendKgPerWeek === null || typeof inputs.weightTrendKgPerWeek === "number")) return null;

  const horizonsValid = value.horizons.every((horizon) => {
    if (!isRecord(horizon)) return false;
    if (horizon.months !== 3 && horizon.months !== 6 && horizon.months !== 12) return false;
    if (horizon.confidence !== "low" && horizon.confidence !== "medium" && horizon.confidence !== "high") return false;
    if (!Array.isArray(horizon.scenarios) || horizon.scenarios.length < 1) return false;
    return horizon.scenarios.every((scenario) => {
      if (!isRecord(scenario)) return false;
      if (scenario.id !== "current-consistency" && scenario.id !== "improved-consistency") return false;
      if (typeof scenario.label !== "string" || typeof scenario.adherenceScore !== "number") return false;
      if (!isRecord(scenario.expectedDeltaKg)) return false;
      if (typeof scenario.expectedDeltaKg.min !== "number" || typeof scenario.expectedDeltaKg.max !== "number") return false;
      if (!(scenario.projectedWeightKg === null || isRecord(scenario.projectedWeightKg))) return false;
      if (scenario.projectedWeightKg &&
        (typeof scenario.projectedWeightKg.current !== "number" ||
          typeof scenario.projectedWeightKg.min !== "number" ||
          typeof scenario.projectedWeightKg.max !== "number")) {
        return false;
      }
      return Array.isArray(scenario.assumptions) && scenario.assumptions.every((assumption) => typeof assumption === "string");
    });
  });

  if (!horizonsValid) return null;

  return value as FutureProjectionResponse;
}

function parseRctStatus(value: unknown): RctStatusResponse | null {
  if (!isRecord(value)) return null;
  if (typeof value.experimentId !== "string") return null;
  if (value.group !== "control" && value.group !== "treatment") return null;
  if (value.projectionMode !== "minimal" && value.projectionMode !== "full") return null;
  if (value.status !== "active") return null;
  if (!isDatetime(value.assignedAt)) return null;

  const latestMetrics = value.latestMetrics;
  if (!isRecord(latestMetrics)) return null;
  if (!isIsoDate(latestMetrics.weekKey) || !isDatetime(latestMetrics.capturedAt)) return null;
  if (typeof latestMetrics.weeklyActivitySessions !== "number") return null;
  if (typeof latestMetrics.adherenceScore !== "number") return null;
  if (!(latestMetrics.recommendationAcceptanceRate === null || typeof latestMetrics.recommendationAcceptanceRate === "number")) return null;
  if (typeof latestMetrics.loggingFrequencyDays !== "number") return null;

  const eventCounts = value.eventCounts;
  if (!isRecord(eventCounts)) return null;
  if (
    typeof eventCounts.projectionViewed !== "number" ||
    typeof eventCounts.scenarioSelected !== "number" ||
    typeof eventCounts.recommendationsAccepted !== "number" ||
    typeof eventCounts.recommendationsRejected !== "number" ||
    typeof eventCounts.loggingEvents !== "number"
  ) {
    return null;
  }

  return value as RctStatusResponse;
}

function parseRctSummary(value: unknown): RctSummaryResponse | null {
  if (!isRecord(value)) return null;
  if (typeof value.experimentId !== "string" || !isDatetime(value.generatedAt)) return null;
  if (!isRecord(value.window)) return null;
  if (
    typeof value.window.days !== "number" ||
    typeof value.window.weeksApprox !== "number" ||
    !isIsoDate(value.window.startDate) ||
    !isIsoDate(value.window.endDate)
  ) {
    return null;
  }

  const groups = value.groups;
  if (!isRecord(groups) || !isRecord(groups.control) || !isRecord(groups.treatment)) return null;

  if (!Array.isArray(value.metrics) || value.metrics.length !== 7) return null;
  const metricsOk = value.metrics.every((metric) => {
    if (!isRecord(metric)) return false;
    if (typeof metric.key !== "string" || typeof metric.label !== "string" || typeof metric.unit !== "string") return false;
    const numericOrNull = (entry: unknown) => entry === null || typeof entry === "number";
    return (
      numericOrNull(metric.control) &&
      numericOrNull(metric.treatment) &&
      numericOrNull(metric.deltaTreatmentVsControl)
    );
  });

  if (!metricsOk) return null;
  return value as RctSummaryResponse;
}

function parseRctStatisticalReport(value: unknown): RctStatisticalReportResponse | null {
  if (!isRecord(value)) return null;
  if (typeof value.experimentId !== "string" || !isDatetime(value.generatedAt)) return null;
  if (typeof value.disclaimer !== "string" || !Array.isArray(value.limitations)) return null;
  if (!isRecord(value.window) || !isRecord(value.sample) || !Array.isArray(value.metrics)) return null;

  if (
    typeof value.window.days !== "number" ||
    typeof value.window.weeksApprox !== "number" ||
    !isIsoDate(value.window.startDate) ||
    !isIsoDate(value.window.endDate)
  ) {
    return null;
  }

  if (
    typeof value.sample.controlN !== "number" ||
    typeof value.sample.treatmentN !== "number" ||
    typeof value.sample.minGroupN !== "number" ||
    typeof value.sample.controlCompleteness !== "number" ||
    typeof value.sample.treatmentCompleteness !== "number" ||
    typeof value.sample.overallCompleteness !== "number" ||
    typeof value.sample.rationale !== "string" ||
    (value.sample.confidence !== "low" && value.sample.confidence !== "medium" && value.sample.confidence !== "high")
  ) {
    return null;
  }

  const metricsOk = value.metrics.every((metric) => {
    if (!isRecord(metric)) return false;
    const numericOrNull = (entry: unknown) => entry === null || typeof entry === "number";
    if (
      typeof metric.key !== "string" ||
      typeof metric.label !== "string" ||
      typeof metric.unit !== "string" ||
      typeof metric.practicalEffect !== "string" ||
      (metric.sampleConfidence !== "low" && metric.sampleConfidence !== "medium" && metric.sampleConfidence !== "high")
    ) {
      return false;
    }
    if (!numericOrNull(metric.controlMean) || !numericOrNull(metric.treatmentMean)) return false;
    if (!numericOrNull(metric.deltaTreatmentVsControl) || !numericOrNull(metric.relativeEffectPercent)) return false;

    if (!isRecord(metric.significance)) return false;
    if (
      (metric.significance.status !== "approximated" && metric.significance.status !== "insufficient_data") ||
      (metric.significance.method !== "two_proportion_z" && metric.significance.method !== "unavailable") ||
      !numericOrNull(metric.significance.statistic) ||
      !numericOrNull(metric.significance.pValueApprox) ||
      typeof metric.significance.note !== "string"
    ) {
      return false;
    }
    return true;
  });

  if (!metricsOk) return null;
  return value as RctStatisticalReportResponse;
}

export async function getFutureProjection(): Promise<ServiceResult<FutureProjectionResponse>> {
  const result = await requestJson<unknown>("/api/projection/future-self");
  if (!result.ok) return result;

  const typed = parseFutureProjection(result.data);
  if (!typed) {
    return {
      ok: false,
      reason: "invalidResponse",
      message: "Future projection response does not match expected contract.",
    };
  }

  return { ok: true, data: typed };
}

export async function getRctStatus(): Promise<ServiceResult<RctStatusResponse>> {
  const result = await requestJson<unknown>("/api/research/rct/status");
  if (!result.ok) return result;

  const typed = parseRctStatus(result.data);
  if (!typed) {
    return {
      ok: false,
      reason: "invalidResponse",
      message: "RCT status response does not match expected contract.",
    };
  }

  return { ok: true, data: typed };
}

export async function sendRctEvent(payload: RctEventRequest): Promise<ServiceResult<{ ok: true; storedAt: string }>> {
  const result = await requestJson<unknown>("/api/research/rct/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!result.ok) return result;

  if (!isRecord(result.data) || result.data.ok !== true || !isDatetime(result.data.storedAt)) {
    return {
      ok: false,
      reason: "invalidResponse",
      message: "RCT event response does not match expected contract.",
    };
  }

  return { ok: true, data: { ok: true, storedAt: result.data.storedAt } };
}

export async function getRctSummary(params?: {
  windowDays?: number;
  windowWeeks?: 4 | 8 | 12;
}): Promise<ServiceResult<RctSummaryResponse>> {
  const query = new URLSearchParams();
  if (params?.windowDays) query.set("windowDays", String(params.windowDays));
  if (params?.windowWeeks) query.set("windowWeeks", String(params.windowWeeks));
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const result = await requestJson<unknown>(`/api/research/rct/summary${suffix}`);
  if (!result.ok) return result;

  const typed = parseRctSummary(result.data);
  if (!typed) {
    return {
      ok: false,
      reason: "invalidResponse",
      message: "RCT summary response does not match expected contract.",
    };
  }

  return { ok: true, data: typed };
}

export async function getRctStatisticalReport(params?: {
  windowDays?: number;
  windowWeeks?: 4 | 8 | 12;
}): Promise<ServiceResult<RctStatisticalReportResponse>> {
  const query = new URLSearchParams();
  if (params?.windowDays) query.set("windowDays", String(params.windowDays));
  if (params?.windowWeeks) query.set("windowWeeks", String(params.windowWeeks));
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const result = await requestJson<unknown>(`/api/research/rct/statistical-report${suffix}`);
  if (!result.ok) return result;

  const typed = parseRctStatisticalReport(result.data);
  if (!typed) {
    return {
      ok: false,
      reason: "invalidResponse",
      message: "RCT statistical report response does not match expected contract.",
    };
  }

  return { ok: true, data: typed };
}
