import { buildRctExperimentSummary } from "./rctSummary.js";
import type { RctSummaryResponse } from "../schemas/rctSummary.js";
import type { RctStatisticalReportResponse } from "../schemas/rctStatisticalReport.js";

type ProfileRow = {
  profile: unknown;
  tracking: unknown;
};

type MainMetricKey = RctStatisticalReportResponse["metrics"][number]["key"];

const MAIN_METRIC_KEYS: MainMetricKey[] = [
  "retention_proxy",
  "adherence_mean",
  "logging_frequency_mean",
  "recommendation_acceptance_rate",
  "weekly_activity_sessions_mean",
];

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeRelativeEffectPercent(
  control: number | null,
  treatment: number | null,
): number | null {
  if (control === null || treatment === null) return null;
  if (Math.abs(control) < Number.EPSILON) return null;
  return round(((treatment - control) / Math.abs(control)) * 100, 2);
}

function practicalEffectLabel(relativeEffectPercent: number | null):
  | "negligible practical effect"
  | "small practical effect"
  | "medium practical effect"
  | "large practical effect"
  | "insufficient baseline for practical effect" {
  if (relativeEffectPercent === null) return "insufficient baseline for practical effect";
  const magnitude = Math.abs(relativeEffectPercent);
  if (magnitude < 5) return "negligible practical effect";
  if (magnitude < 15) return "small practical effect";
  if (magnitude < 30) return "medium practical effect";
  return "large practical effect";
}

function erfApprox(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x));
  return sign * y;
}

function normalCdfApprox(value: number): number {
  return 0.5 * (1 + erfApprox(value / Math.SQRT2));
}

function twoSidedPValueFromZ(zScore: number): number {
  const tail = 1 - normalCdfApprox(Math.abs(zScore));
  return clamp(round(tail * 2, 4), 0, 1);
}

function buildSampleConfidence(summary: RctSummaryResponse): RctStatisticalReportResponse["sample"] {
  const controlN = summary.groups.control.sampleSize;
  const treatmentN = summary.groups.treatment.sampleSize;
  const minGroupN = Math.min(controlN, treatmentN);
  const controlCompleteness = controlN <= 0 ? 0 : summary.groups.control.activeUsers / controlN;
  const treatmentCompleteness = treatmentN <= 0 ? 0 : summary.groups.treatment.activeUsers / treatmentN;
  const overallCompleteness = round((controlCompleteness + treatmentCompleteness) / 2, 3);

  let confidence: "low" | "medium" | "high" = "low";
  if (minGroupN >= 40 && overallCompleteness >= 0.75) {
    confidence = "high";
  } else if (minGroupN >= 20 && overallCompleteness >= 0.5) {
    confidence = "medium";
  }

  const rationale = `n minimo por grupo=${minGroupN}; completitud promedio=${Math.round(overallCompleteness * 100)}%`;

  return {
    controlN,
    treatmentN,
    minGroupN,
    controlCompleteness: round(controlCompleteness, 3),
    treatmentCompleteness: round(treatmentCompleteness, 3),
    overallCompleteness,
    confidence,
    rationale,
  };
}

function approximateProportionSignificance(
  control: number | null,
  treatment: number | null,
  controlN: number,
  treatmentN: number,
): RctStatisticalReportResponse["metrics"][number]["significance"] {
  if (control === null || treatment === null || controlN < 8 || treatmentN < 8) {
    return {
      status: "insufficient_data",
      method: "unavailable",
      statistic: null,
      pValueApprox: null,
      note: "Muestra o datos insuficientes para aproximar significancia.",
    };
  }

  const pooledRate = (control * controlN + treatment * treatmentN) / (controlN + treatmentN);
  const standardError = Math.sqrt(
    pooledRate * (1 - pooledRate) * (1 / controlN + 1 / treatmentN),
  );

  if (!Number.isFinite(standardError) || standardError <= 0) {
    return {
      status: "insufficient_data",
      method: "unavailable",
      statistic: null,
      pValueApprox: null,
      note: "No fue posible estimar varianza para aproximacion de proporcion.",
    };
  }

  const zScore = (treatment - control) / standardError;
  return {
    status: "approximated",
    method: "two_proportion_z",
    statistic: round(zScore, 3),
    pValueApprox: twoSidedPValueFromZ(zScore),
    note: "Aproximacion exploratoria (z de dos proporciones), no confirmatoria.",
  };
}

function buildMetricRows(
  summary: RctSummaryResponse,
  sampleConfidence: "low" | "medium" | "high",
): RctStatisticalReportResponse["metrics"] {
  const metricsByKey = new Map(summary.metrics.map((entry) => [entry.key, entry]));

  return MAIN_METRIC_KEYS.map((key) => {
    const source = metricsByKey.get(key);
    if (!source) {
      throw new Error(`Missing main metric ${key} in RCT summary`);
    }

    const relativeEffectPercent = computeRelativeEffectPercent(source.control, source.treatment);
    const practicalEffect = practicalEffectLabel(relativeEffectPercent);
    const unit =
      key === "logging_frequency_mean"
        ? "days_per_week"
        : key === "weekly_activity_sessions_mean"
          ? "sessions_per_week"
          : "ratio";

    const significance =
      key === "retention_proxy" || key === "recommendation_acceptance_rate"
        ? approximateProportionSignificance(
            source.control,
            source.treatment,
            summary.groups.control.sampleSize,
            summary.groups.treatment.sampleSize,
          )
        : {
            status: "insufficient_data" as const,
            method: "unavailable" as const,
            statistic: null,
            pValueApprox: null,
            note: "No hay varianza por grupo en los agregados actuales para esta metrica.",
          };

    return {
      key,
      label: source.label,
      unit,
      controlMean: source.control,
      treatmentMean: source.treatment,
      deltaTreatmentVsControl: source.deltaTreatmentVsControl,
      relativeEffectPercent,
      practicalEffect,
      sampleConfidence,
      significance,
    };
  });
}

export function buildRctStatisticalReport(
  rows: ProfileRow[],
  input: { windowDays?: number; windowWeeks?: number; now?: Date },
): RctStatisticalReportResponse {
  const summary = buildRctExperimentSummary(rows, input);
  const sample = buildSampleConfidence(summary);
  const metrics = buildMetricRows(summary, sample.confidence);

  return {
    experimentId: summary.experimentId,
    generatedAt: summary.generatedAt,
    window: summary.window,
    sample,
    metrics,
    disclaimer:
      "Reporte exploratorio para seguimiento de hipotesis RCT. No implica causalidad clinica ni reemplaza evaluacion estadistica completa.",
    limitations: [
      "Usa agregados anonimizados por grupo y ventana; no expone datos individuales.",
      "Las aproximaciones de significancia son orientativas y no sustituyen analisis inferencial formal.",
      "Las metricas sin varianza por grupo se marcan como insufficient_data para significancia.",
    ],
  };
}
