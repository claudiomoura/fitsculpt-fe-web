import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";
import type {
  WeeklyReviewRecommendation,
  WeeklyReviewRecommendationId,
  WeeklyReviewRequest,
  WeeklyReviewResponse,
  WeeklyReviewSummary,
} from "@/types/weeklyReview";

type UnknownRecord = Record<string, unknown>;

const recommendationIds: ReadonlySet<WeeklyReviewRecommendationId> = new Set([
  "keep-momentum",
  "add-workout",
  "meal-consistency",
  "checkin-reminder",
  "balance-recovery",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isBoundedMetric(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseSummary(value: unknown): WeeklyReviewSummary | null {
  if (!isRecord(value)) return null;

  const {
    rangeStart,
    rangeEnd,
    days,
    checkinsCount,
    workoutsCount,
    nutritionLogsCount,
    averageEnergy,
    averageHunger,
  } = value;

  if (!isIsoDate(rangeStart) || !isIsoDate(rangeEnd)) return null;
  if (!isNonNegativeInteger(days) || days < 1) return null;
  if (!isNonNegativeInteger(checkinsCount)) return null;
  if (!isNonNegativeInteger(workoutsCount)) return null;
  if (!isNonNegativeInteger(nutritionLogsCount)) return null;
  if (!isBoundedMetric(averageEnergy) || !isBoundedMetric(averageHunger)) return null;

  return {
    rangeStart,
    rangeEnd,
    days,
    checkinsCount,
    workoutsCount,
    nutritionLogsCount,
    averageEnergy,
    averageHunger,
  };
}

function parseRecommendation(value: unknown): WeeklyReviewRecommendation | null {
  if (!isRecord(value)) return null;
  const { id, title, why } = value;
  if (typeof id !== "string" || !recommendationIds.has(id as WeeklyReviewRecommendationId)) return null;
  if (typeof title !== "string" || title.trim().length === 0) return null;
  if (typeof why !== "string" || why.trim().length === 0) return null;

  return {
    id: id as WeeklyReviewRecommendationId,
    title,
    why,
  };
}

function parseWeeklyReviewResponse(value: unknown): WeeklyReviewResponse | null {
  if (!isRecord(value)) return null;

  const summary = parseSummary(value.summary);
  if (!summary) return null;

  if (!Array.isArray(value.recommendations) || value.recommendations.length > 3) return null;
  const recommendations = value.recommendations
    .map(parseRecommendation)
    .filter((entry): entry is WeeklyReviewRecommendation => entry !== null);

  if (recommendations.length !== value.recommendations.length) return null;

  return {
    summary,
    recommendations,
  };
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
    return {
      ok: false,
      reason: "invalidResponse",
      message: "Weekly review response does not match expected contract.",
    };
  }

  return {
    ok: true,
    data: typed,
  };
}
