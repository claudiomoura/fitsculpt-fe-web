import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";
import type {
  WeeklyReviewDecisionRequest,
  WeeklyReviewDecision,
  WeeklyReviewRecommendation,
  WeeklyReviewRecommendationDirection,
  WeeklyReviewRecommendationId,
  WeeklyReviewRecommendationType,
  WeeklyReviewRequest,
  WeeklyReviewResponse,
  WeeklyReviewSummary,
} from "@/types/weeklyReview";

type UnknownRecord = Record<string, unknown>;

const recommendationIds: ReadonlySet<WeeklyReviewRecommendationId> = new Set([
  "training-deload",
  "training-progress",
  "nutrition-recovery",
  "nutrition-maintain",
  "habit-meal-logging",
  "habit-training-consistency",
  "habit-foundation",
]);

const recommendationTypes: ReadonlySet<WeeklyReviewRecommendationType> = new Set(["training", "nutrition", "habit"]);
const recommendationDirections: ReadonlySet<WeeklyReviewRecommendationDirection> = new Set(["increase", "decrease", "maintain", "focus"]);
const recommendationDecisions: ReadonlySet<WeeklyReviewDecision> = new Set(["pending", "accepted", "rejected"]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoDatetime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isBoundedMetric(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseMetricChip(value: unknown): { label: string; value: string } | null {
  if (!isRecord(value)) return null;
  if (typeof value.label !== "string" || value.label.trim().length === 0) return null;
  if (typeof value.value !== "string" || value.value.trim().length === 0) return null;
  return { label: value.label, value: value.value };
}

function parseSummary(value: unknown): WeeklyReviewSummary | null {
  if (!isRecord(value)) return null;

  const {
    weekKey,
    rangeStart,
    rangeEnd,
    previousRangeStart,
    previousRangeEnd,
    generatedAt,
    days,
    checkinsCount,
    workoutsCount,
    previousWorkoutsCount,
    nutritionLogsCount,
    mealLoggingDays,
    trainingTargetSessions,
    trainingAdherencePct,
    averageEnergy,
    averageHunger,
    weightChangeKg,
    weightChangePct,
    waistChangeCm,
  } = value;

  if (!isIsoDate(weekKey) || !isIsoDate(rangeStart) || !isIsoDate(rangeEnd) || !isIsoDate(previousRangeStart) || !isIsoDate(previousRangeEnd)) return null;
  if (!isIsoDatetime(generatedAt)) return null;
  if (!isNonNegativeInteger(days) || days < 1) return null;
  if (!isNonNegativeInteger(checkinsCount) || !isNonNegativeInteger(workoutsCount) || !isNonNegativeInteger(previousWorkoutsCount)) return null;
  if (!isNonNegativeInteger(nutritionLogsCount) || !isNonNegativeInteger(mealLoggingDays) || !isNonNegativeInteger(trainingTargetSessions)) return null;
  if (typeof trainingAdherencePct !== "number" || trainingAdherencePct < 0 || trainingAdherencePct > 100) return null;
  if (!isBoundedMetric(averageEnergy) || !isBoundedMetric(averageHunger)) return null;
  if (!isNullableNumber(weightChangeKg) || !isNullableNumber(weightChangePct) || !isNullableNumber(waistChangeCm)) return null;

  return {
    weekKey,
    rangeStart,
    rangeEnd,
    previousRangeStart,
    previousRangeEnd,
    generatedAt,
    days,
    checkinsCount,
    workoutsCount,
    previousWorkoutsCount,
    nutritionLogsCount,
    mealLoggingDays,
    trainingTargetSessions,
    trainingAdherencePct,
    averageEnergy,
    averageHunger,
    weightChangeKg,
    weightChangePct,
    waistChangeCm,
  };
}

function parseRecommendation(value: unknown): WeeklyReviewRecommendation | null {
  if (!isRecord(value)) return null;
  const { id, type, title, recommendation, why, reasoning, direction, adjustmentPct, decision, metrics, safetyNotes } = value;
  if (typeof id !== "string" || !recommendationIds.has(id as WeeklyReviewRecommendationId)) return null;
  if (typeof type !== "string" || !recommendationTypes.has(type as WeeklyReviewRecommendationType)) return null;
  if (typeof title !== "string" || title.trim().length === 0) return null;
  if (typeof recommendation !== "string" || recommendation.trim().length === 0) return null;
  if (typeof why !== "string" || why.trim().length === 0) return null;
  if (!Array.isArray(reasoning) || reasoning.some((item) => typeof item !== "string" || item.trim().length === 0)) return null;
  if (typeof direction !== "string" || !recommendationDirections.has(direction as WeeklyReviewRecommendationDirection)) return null;
  if (!(adjustmentPct === null || (typeof adjustmentPct === "number" && adjustmentPct >= 0 && adjustmentPct <= 10))) return null;
  if (typeof decision !== "string" || !recommendationDecisions.has(decision as WeeklyReviewDecision)) return null;
  if (!Array.isArray(metrics) || metrics.length > 4) return null;
  if (!Array.isArray(safetyNotes) || safetyNotes.some((item) => typeof item !== "string" || item.trim().length === 0)) return null;

  const parsedMetrics = metrics.map(parseMetricChip);
  if (parsedMetrics.some((item) => item === null)) return null;

  return {
    id: id as WeeklyReviewRecommendationId,
    type: type as WeeklyReviewRecommendationType,
    title,
    recommendation,
    why,
    reasoning,
    direction: direction as WeeklyReviewRecommendationDirection,
    adjustmentPct,
    decision: decision as WeeklyReviewDecision,
    metrics: parsedMetrics as Array<{ label: string; value: string }>,
    safetyNotes,
  };
}

function parseWeeklyReviewResponse(value: unknown): WeeklyReviewResponse | null {
  if (!isRecord(value)) return null;

  const summary = parseSummary(value.summary);
  if (!summary) return null;

  if (!Array.isArray(value.recommendations) || value.recommendations.length > 3) return null;
  const recommendations = value.recommendations.map(parseRecommendation).filter((entry): entry is WeeklyReviewRecommendation => entry !== null);
  if (recommendations.length !== value.recommendations.length) return null;

  return { summary, recommendations };
}

function appendDateIfPresent(search: URLSearchParams, key: "startDate" | "endDate", value?: string) {
  const normalized = value?.trim();
  if (!normalized) return;
  search.set(key, normalized);
}

export async function getWeeklyReview(params: WeeklyReviewRequest = {}): Promise<ServiceResult<WeeklyReviewResponse>> {
  const search = new URLSearchParams();
  appendDateIfPresent(search, "startDate", params.startDate);
  appendDateIfPresent(search, "endDate", params.endDate);

  const query = search.toString();
  const route = query ? `/api/review/weekly?${query}` : "/api/review/weekly";
  const result = await requestJson<unknown>(route);
  if (!result.ok) return result;

  const typed = parseWeeklyReviewResponse(result.data);
  if (!typed) {
    return { ok: false, reason: "invalidResponse", message: "Weekly review response does not match expected contract." };
  }

  return { ok: true, data: typed };
}

export async function submitWeeklyReviewDecision(payload: WeeklyReviewDecisionRequest): Promise<ServiceResult<WeeklyReviewResponse>> {
  const result = await requestJson<unknown>("/api/review/weekly/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!result.ok) return result;

  if (!isRecord(result.data) || result.data.ok !== true) {
    return { ok: false, reason: "invalidResponse", message: "Weekly review decision response does not match expected contract." };
  }

  const typed = parseWeeklyReviewResponse(result.data.review);
  if (!typed) {
    return { ok: false, reason: "invalidResponse", message: "Weekly review decision response does not match expected contract." };
  }

  return { ok: true, data: typed };
}
