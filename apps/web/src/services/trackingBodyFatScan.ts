import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";

export type BodyFatScanExecutionStatus =
  | "completed"
  | "insufficient_data"
  | "blocked"
  | "failed";

export type BodyFatScanExecutionFailureReason =
  | "tier_ineligible"
  | "insufficient_balance"
  | "missing_entitlement"
  | "token_estimation_failed"
  | "reservation_failed"
  | "reservation_unavailable"
  | "validation_error"
  | "upstream_error"
  | string;

export type BodyFatScanExecutionResult = {
  status: BodyFatScanExecutionStatus;
  summary: string;
  estimate: {
    pointPercent: number;
    range: { min: number; max: number };
  } | null;
  confidence: "low" | "medium" | "high";
  confidenceScore: number | null;
  limitations: string[];
  nextActions: string[];
  failureReason: BodyFatScanExecutionFailureReason | null;
  errorMessage: string | null;
  requestId: string | null;
  reservationId: string | null;
  usage: {
    totalTokens: number | null;
    balanceAfter: number | null;
  };
};

export type AnalyzeBodyFatScanPayload = {
  frontPhotoDataUrl: string;
  sidePhotoDataUrl: string;
  locale?: "es" | "en" | "pt";
};

const UNKNOWN_RECORD = {} as Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : UNKNOWN_RECORD;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => asString(entry)!).filter(Boolean);
}

function parseExecutionResult(value: unknown): BodyFatScanExecutionResult | null {
  const source = asRecord(value);
  const status = asString(source.status) as BodyFatScanExecutionStatus;

  if (!status || !["completed", "insufficient_data", "blocked", "failed"].includes(status)) {
    return null;
  }

  const estimateRaw = asRecord(source.estimate ?? {});
  const rangeRaw = asRecord(estimateRaw.range ?? {});
  const pointPercent = asNumber(estimateRaw.bodyFatPercent ?? estimateRaw.pointPercent);
  const rangeMin = asNumber(rangeRaw.min);
  const rangeMax = asNumber(rangeRaw.max);

  const estimate =
    pointPercent !== null && rangeMin !== null && rangeMax !== null
      ? { pointPercent, range: { min: rangeMin, max: rangeMax } }
      : null;

  const confidenceRaw = asString(source.confidence);
  const confidence: BodyFatScanExecutionResult["confidence"] =
    confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
      ? confidenceRaw
      : "low";

  const usageRaw = asRecord(source.usage ?? {});

  return {
    status,
    summary: asString(source.summary) ?? "No pudimos interpretar el resultado del scan AI.",
    estimate,
    confidence,
    confidenceScore: asNumber(source.confidenceScore ?? source.qualityScore),
    limitations: toStringArray(source.limitations ?? source.issues ?? []),
    nextActions: toStringArray(source.nextActions ?? []),
    failureReason: asString(source.failureReason) as BodyFatScanExecutionResult["failureReason"],
    errorMessage: asString(source.errorMessage ?? source.reason),
    requestId: asString(source.requestId ?? source.executionId),
    reservationId: asString(source.reservationId),
    usage: {
      totalTokens: asNumber(usageRaw.totalTokens),
      balanceAfter: asNumber(source.balanceAfter ?? source.aiTokenBalance),
    },
  };
}

export async function analyzeTrackingBodyFatScan(
  payload: AnalyzeBodyFatScanPayload,
): Promise<ServiceResult<BodyFatScanExecutionResult>> {
  const response = await requestJson<unknown>("/api/tracking/body-fat-scan/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, reason: "invalidResponse" as const };
  }

  const typed = parseExecutionResult(response.data);
  if (!typed) {
    return { ok: false, reason: "invalidResponse" as const };
  }

  return { ok: true, data: typed };
}