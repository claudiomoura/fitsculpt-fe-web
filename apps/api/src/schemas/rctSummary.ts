import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const rctSummaryQuerySchema = z.object({
  windowDays: z.coerce.number().int().min(7).max(365).optional(),
  windowWeeks: z.coerce.number().int().min(1).max(52).optional(),
});

const ratioSchema = z.number().min(0).max(1).nullable();

export const rctGroupSummarySchema = z.object({
  sampleSize: z.number().int().min(0),
  activeUsers: z.number().int().min(0),
  retentionProxy: ratioSchema,
  adherenceMean: ratioSchema,
  loggingFrequencyMean: z.number().min(0).nullable(),
  recommendationAcceptanceRate: ratioSchema,
  weeklyActivitySessionsMean: z.number().min(0).nullable(),
});

export const rctMetricComparisonSchema = z.object({
  key: z.enum([
    "sample_size",
    "active_users",
    "retention_proxy",
    "adherence_mean",
    "logging_frequency_mean",
    "recommendation_acceptance_rate",
    "weekly_activity_sessions_mean",
  ]),
  label: z.string().min(1),
  unit: z.enum(["count", "ratio", "days_per_week", "sessions_per_week"]),
  control: z.number().nullable(),
  treatment: z.number().nullable(),
  deltaTreatmentVsControl: z.number().nullable(),
});

export const rctSummaryResponseSchema = z.object({
  experimentId: z.string().min(1),
  generatedAt: z.string().datetime(),
  window: z.object({
    days: z.number().int().min(7).max(365),
    weeksApprox: z.number().min(1),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  }),
  groups: z.object({
    control: rctGroupSummarySchema,
    treatment: rctGroupSummarySchema,
  }),
  deltaTreatmentVsControl: z.object({
    sampleSize: z.number(),
    activeUsers: z.number(),
    retentionProxy: z.number().nullable(),
    adherenceMean: z.number().nullable(),
    loggingFrequencyMean: z.number().nullable(),
    recommendationAcceptanceRate: z.number().nullable(),
    weeklyActivitySessionsMean: z.number().nullable(),
  }),
  metrics: z.array(rctMetricComparisonSchema).length(7),
});

export type RctSummaryQuery = z.infer<typeof rctSummaryQuerySchema>;
export type RctSummaryResponse = z.infer<typeof rctSummaryResponseSchema>;
