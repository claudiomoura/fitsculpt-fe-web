import { normalizeTrackingSnapshot } from "./service.js";
import {
  bodyFatScanModelOutputSchema,
  type BodyFatScanModelOutput,
  type BodyFatScanResponse,
} from "./bodyFatScanSchemas.js";

type BodyFatConfidence = "low" | "medium" | "high";

type BodyFatScanContext = {
  latestWeightKg: number | null;
  latestBodyFatPercent: number | null;
  latestWaistCm: number | null;
  latestNeckCm: number | null;
  latestHipsCm: number | null;
  profileHeightCm: number | null;
  profileAge: number | null;
  profileSex: "male" | "female" | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function round(value: number): number {
  return Number(value.toFixed(1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRange(center: number, halfRange: number) {
  const min = round(clamp(center - halfRange, 2, 60));
  const max = round(clamp(center + halfRange, 2, 60));
  return min <= max ? { min, max } : { min: max, max: min };
}

function toComposition(estimateBodyFatPercent: number, latestWeightKg: number | null) {
  if (latestWeightKg === null || latestWeightKg <= 0) {
    return {
      bodyFatPercent: round(estimateBodyFatPercent),
      leanMassKg: null,
      fatMassKg: null,
    };
  }

  const fatMassKg = round(latestWeightKg * (estimateBodyFatPercent / 100));
  const leanMassKg = round(Math.max(0, latestWeightKg - fatMassKg));
  return {
    bodyFatPercent: round(estimateBodyFatPercent),
    leanMassKg,
    fatMassKg,
  };
}

function toInches(valueCm: number): number {
  return valueCm / 2.54;
}

function estimateUsNavy(context: BodyFatScanContext): number | null {
  const { profileHeightCm, latestWaistCm, latestNeckCm, latestHipsCm, profileSex } = context;
  if (!profileHeightCm || !latestWaistCm || !latestNeckCm || !profileSex) {
    return null;
  }

  const heightIn = toInches(profileHeightCm);
  const waistIn = toInches(latestWaistCm);
  const neckIn = toInches(latestNeckCm);
  if (profileSex === "male") {
    const abdomenDelta = waistIn - neckIn;
    if (abdomenDelta <= 0) return null;
    const estimate =
      495 /
        (1.0324 - 0.19077 * Math.log10(abdomenDelta) + 0.15456 * Math.log10(heightIn)) -
      450;
    return round(clamp(estimate, 3, 50));
  }

  if (!latestHipsCm) return null;
  const hipsIn = toInches(latestHipsCm);
  const compositionDelta = waistIn + hipsIn - neckIn;
  if (compositionDelta <= 0) return null;
  const estimate =
    495 / (1.29579 - 0.35004 * Math.log10(compositionDelta) + 0.221 * Math.log10(heightIn)) -
    450;
  return round(clamp(estimate, 3, 50));
}

function estimateBmiAge(context: BodyFatScanContext): number | null {
  const { profileHeightCm, latestWeightKg, profileAge, profileSex } = context;
  if (!profileHeightCm || !latestWeightKg || !profileAge || !profileSex) {
    return null;
  }

  const heightM = profileHeightCm / 100;
  const bmi = latestWeightKg / (heightM * heightM);
  const sexFactor = profileSex === "male" ? 1 : 0;
  const estimate = 1.2 * bmi + 0.23 * profileAge - 10.8 * sexFactor - 5.4;
  return round(clamp(estimate, 3, 50));
}

function toState(confidence: BodyFatConfidence): "ready" | "low_confidence" {
  return confidence === "low" ? "low_confidence" : "ready";
}

export function extractBodyFatScanContext(profile: unknown, tracking: unknown): BodyFatScanContext {
  const profileRecord = asRecord(profile);
  const normalizedTracking = normalizeTrackingSnapshot(tracking);
  const latestCheckin =
    [...normalizedTracking.checkins]
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  return {
    latestWeightKg: readNumber(latestCheckin?.weightKg) ?? readNumber(profileRecord?.weightKg),
    latestBodyFatPercent: readNumber(latestCheckin?.bodyFatPercent),
    latestWaistCm: readNumber(latestCheckin?.waistCm) ?? readNumber(asRecord(profileRecord?.measurements)?.waistCm),
    latestNeckCm: readNumber(latestCheckin?.neckCm) ?? readNumber(asRecord(profileRecord?.measurements)?.neckCm),
    latestHipsCm: readNumber(latestCheckin?.hipsCm) ?? readNumber(asRecord(profileRecord?.measurements)?.hipsCm),
    profileHeightCm: readNumber(profileRecord?.heightCm),
    profileAge: readNumber(profileRecord?.age),
    profileSex:
      profileRecord?.sex === "male" || profileRecord?.sex === "female"
        ? profileRecord.sex
        : null,
  };
}

export function normalizeAiBodyFatScan(payload: unknown, context: BodyFatScanContext): BodyFatScanResponse {
  const parsed = bodyFatScanModelOutputSchema.parse(payload);
  const center = round(clamp(parsed.estimateBodyFatPercent, 2, 60));
  const min = round(clamp(Math.min(parsed.range.min, parsed.range.max), 2, 60));
  const max = round(clamp(Math.max(parsed.range.min, parsed.range.max), 2, 60));
  const range = min <= max ? { min, max } : { min: max, max: min };

  return {
    executionStatus: "completed",
    status: "ai_success",
    analysisMode: "ai_augmented",
    estimate: toComposition(center, context.latestWeightKg),
    range,
    confidence: parsed.confidence,
    qualityScore: parsed.qualityScore,
    issues: parsed.issues,
    limitations: parsed.issues,
    disclaimer: parsed.disclaimer,
    summary:
      parsed.summary ??
      `AI estimate around ${center.toFixed(1)}% body fat (range ${range.min.toFixed(1)}-${range.max.toFixed(1)}%).`,
    persistence: {
      status: "not_persisted",
      adapter: "none",
      errorMessage: null,
      record: null,
    },
  };
}

export function buildDeterministicBodyFatFallback(args: {
  reason: NonNullable<BodyFatScanResponse["fallbackReason"]>;
  context: BodyFatScanContext;
  locale?: "es" | "en" | "pt";
  carry?: Partial<BodyFatScanModelOutput>;
}): BodyFatScanResponse {
  const reasonIssue = {
    UPSTREAM_ERROR: "AI request failed; used deterministic estimate.",
    CONTRACT_DRIFT: "AI payload was invalid; used deterministic estimate.",
    AI_NOT_CONFIGURED: "AI provider unavailable; used deterministic estimate.",
    UNEXPECTED_ERROR: "Unexpected AI error; used deterministic estimate.",
  } as const;
  const locale = args.locale ?? "en";
  const disclaimer =
    locale === "es"
      ? "Estimacion orientativa. No sustituye una evaluacion clinica ni un DEXA."
      : locale === "pt"
        ? "Estimativa orientativa. Nao substitui avaliacao clinica nem DEXA."
        : "Guidance-only estimate. Not a clinical measurement or DEXA substitute.";

  const manual = args.context.latestBodyFatPercent && args.context.latestBodyFatPercent > 0
    ? round(clamp(args.context.latestBodyFatPercent, 3, 50))
    : null;
  const navy = estimateUsNavy(args.context);
  const bmiAge = estimateBmiAge(args.context);

  const weighted: Array<{ value: number; weight: number }> = [];
  if (manual !== null) weighted.push({ value: manual, weight: 0.62 });
  if (navy !== null) weighted.push({ value: navy, weight: 0.25 });
  if (bmiAge !== null) weighted.push({ value: bmiAge, weight: 0.13 });
  if (weighted.length === 0) weighted.push({ value: 22, weight: 1 });

  const numerator = weighted.reduce((sum, item) => sum + item.value * item.weight, 0);
  const denominator = weighted.reduce((sum, item) => sum + item.weight, 0);
  const center = round(clamp(numerator / denominator, 3, 50));

  const disagreement = weighted.length > 1
    ? Math.max(...weighted.map((item) => item.value)) - Math.min(...weighted.map((item) => item.value))
    : 0;
  const halfRange = clamp(5.6 + disagreement * 0.35 - (manual !== null ? 1.5 : 0), 2.4, 7.2);
  const range = toRange(center, halfRange);

  const qualityScore = Math.round(clamp(45 + (manual !== null ? 20 : 0) + (navy !== null ? 10 : 0) - disagreement * 2, 30, 86));
  const confidence: BodyFatConfidence = qualityScore >= 74 ? "high" : qualityScore >= 56 ? "medium" : "low";

  const issues = [
    reasonIssue[args.reason],
    ...(manual === null ? ["No recent manual body-fat value was available."] : []),
    ...(navy === null ? ["Navy anthropometric formula inputs were incomplete."] : []),
    ...(bmiAge === null ? ["BMI/age secondary estimate inputs were incomplete."] : []),
  ].slice(0, 8);

  return {
    executionStatus: "fallback",
    status: "deterministic_fallback",
    analysisMode: "deterministic_fallback",
    estimate: toComposition(center, args.context.latestWeightKg),
    range,
    confidence,
    qualityScore,
    issues,
    limitations: issues,
    disclaimer,
    summary:
      args.carry?.summary ??
      `Deterministic estimate around ${center.toFixed(1)}% body fat (range ${range.min.toFixed(1)}-${range.max.toFixed(1)}%).`,
    fallbackReason: args.reason,
    persistence: {
      status: "not_persisted",
      adapter: "none",
      errorMessage: null,
      record: null,
    },
  };
}

export function toPersistenceState(confidence: BodyFatConfidence): "ready" | "low_confidence" {
  return toState(confidence);
}
