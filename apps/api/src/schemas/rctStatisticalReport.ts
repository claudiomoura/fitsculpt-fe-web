import { z } from "zod";
import { rctSummaryQuerySchema } from "./rctSummary.js";

export const rctStatisticalReportQuerySchema = rctSummaryQuerySchema;

const confidenceSchema = z.enum(["low", "medium", "high"]);

export const rctStatisticalSignificanceSchema = z.object({
  status: z.enum(["approximated", "insufficient_data"]),
  method: z.enum(["two_proportion_z", "unavailable"]),
  statistic: z.number().nullable(),
  pValueApprox: z.number().min(0).max(1).nullable(),
  note: z.string().min(1),
});

export const rctStatisticalMetricSchema = z.object({
  key: z.enum([
    "retention_proxy",
    "adherence_mean",
    "logging_frequency_mean",
    "recommendation_acceptance_rate",
    "weekly_activity_sessions_mean",
  ]),
  label: z.string().min(1),
  unit: z.enum(["ratio", "days_per_week", "sessions_per_week"]),
  controlMean: z.number().nullable(),
  treatmentMean: z.number().nullable(),
  deltaTreatmentVsControl: z.number().nullable(),
  relativeEffectPercent: z.number().nullable(),
  practicalEffect: z.enum([
    "negligible practical effect",
    "small practical effect",
    "medium practical effect",
    "large practical effect",
    "insufficient baseline for practical effect",
  ]),
  sampleConfidence: confidenceSchema,
  significance: rctStatisticalSignificanceSchema,
});

export const rctStatisticalReportResponseSchema = z.object({
  experimentId: z.string().min(1),
  generatedAt: z.string().datetime(),
  disclaimer: z.string().min(1),
  limitations: z.array(z.string().min(1)).min(1),
  window: z.object({
    days: z.number().int().min(7).max(365),
    weeksApprox: z.number().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  sample: z.object({
    controlN: z.number().int().min(0),
    treatmentN: z.number().int().min(0),
    minGroupN: z.number().int().min(0),
    controlCompleteness: z.number().min(0).max(1),
    treatmentCompleteness: z.number().min(0).max(1),
    overallCompleteness: z.number().min(0).max(1),
    confidence: confidenceSchema,
    rationale: z.string().min(1),
  }),
  metrics: z.array(rctStatisticalMetricSchema).length(5),
});

export type RctStatisticalReportQuery = z.infer<typeof rctStatisticalReportQuerySchema>;
export type RctStatisticalReportResponse = z.infer<typeof rctStatisticalReportResponseSchema>;
