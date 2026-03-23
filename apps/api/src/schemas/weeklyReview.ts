import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const weeklyReviewRequestSchema = z
  .object({
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "startDate must be before or equal to endDate",
      });
    }
  });

export const weeklyReviewRecommendationIdSchema = z.enum([
  "training-deload",
  "training-progress",
  "nutrition-recovery",
  "nutrition-maintain",
  "habit-meal-logging",
  "habit-training-consistency",
  "habit-foundation",
  "habit-passive-bridge",
]);

export const weeklyReviewRecommendationTypeSchema = z.enum(["training", "nutrition", "habit"]);
export const weeklyReviewRecommendationDirectionSchema = z.enum(["increase", "decrease", "maintain", "focus"]);
export const weeklyReviewDecisionSchema = z.enum(["pending", "accepted", "rejected"]);

export const weeklyReviewMetricChipSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const weeklyReviewRecommendationSchema = z.object({
  id: weeklyReviewRecommendationIdSchema,
  type: weeklyReviewRecommendationTypeSchema,
  title: z.string().min(1),
  recommendation: z.string().min(1),
  why: z.string().min(1),
  reasoning: z.array(z.string().min(1)).min(1).max(5),
  direction: weeklyReviewRecommendationDirectionSchema,
  adjustmentPct: z.number().min(0).max(10).nullable(),
  decision: weeklyReviewDecisionSchema,
  metrics: z.array(weeklyReviewMetricChipSchema).max(4),
  safetyNotes: z.array(z.string().min(1)).min(1).max(4),
});

export const weeklyReviewSummarySchema = z.object({
  weekKey: isoDateSchema,
  rangeStart: isoDateSchema,
  rangeEnd: isoDateSchema,
  previousRangeStart: isoDateSchema,
  previousRangeEnd: isoDateSchema,
  generatedAt: z.string().datetime(),
  days: z.number().int().min(1),
  checkinsCount: z.number().int().min(0),
  workoutsCount: z.number().int().min(0),
  previousWorkoutsCount: z.number().int().min(0),
  nutritionLogsCount: z.number().int().min(0),
  mealLoggingDays: z.number().int().min(0).max(7),
  trainingTargetSessions: z.number().int().min(0).max(7),
  trainingAdherencePct: z.number().min(0).max(100),
  manualTrainingAdherencePct: z.number().min(0).max(100),
  passiveAdherenceSupportPct: z.number().min(0).max(25),
  passiveActiveDays: z.number().int().min(0).max(7),
  passiveStepsTotal: z.number().int().min(0),
  passiveActiveMinutes: z.number().int().min(0),
  passiveSourceCount: z.number().int().min(0),
  averageEnergy: z.number().min(0).max(5).nullable(),
  averageHunger: z.number().min(0).max(5).nullable(),
  averageSleepHours: z.number().min(0).max(24).nullable(),
  averageRestingHeartRate: z.number().min(20).max(240).nullable(),
  weightChangeKg: z.number().nullable(),
  weightChangePct: z.number().nullable(),
  waistChangeCm: z.number().nullable(),
});

export const weeklyReviewResponseSchema = z.object({
  summary: weeklyReviewSummarySchema,
  recommendations: z.array(weeklyReviewRecommendationSchema).max(3),
});

export const weeklyReviewDecisionRequestSchema = z.object({
  weekKey: isoDateSchema,
  recommendationId: weeklyReviewRecommendationIdSchema,
  decision: z.enum(["accepted", "rejected"]),
});

export const weeklyReviewDecisionResponseSchema = z.object({
  ok: z.literal(true),
  review: weeklyReviewResponseSchema,
});

export type WeeklyReviewRequest = z.infer<typeof weeklyReviewRequestSchema>;
export type WeeklyReviewRecommendationId = z.infer<typeof weeklyReviewRecommendationIdSchema>;
export type WeeklyReviewRecommendationType = z.infer<typeof weeklyReviewRecommendationTypeSchema>;
export type WeeklyReviewDecision = z.infer<typeof weeklyReviewDecisionSchema>;
export type WeeklyReviewRecommendation = z.infer<typeof weeklyReviewRecommendationSchema>;
export type WeeklyReviewSummary = z.infer<typeof weeklyReviewSummarySchema>;
export type WeeklyReviewResponse = z.infer<typeof weeklyReviewResponseSchema>;
export type WeeklyReviewDecisionRequest = z.infer<typeof weeklyReviewDecisionRequestSchema>;
