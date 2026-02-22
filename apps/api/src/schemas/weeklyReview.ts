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

export const weeklyReviewRecommendationSchema = z.object({
  id: z.enum(["keep-momentum", "add-workout", "meal-consistency", "checkin-reminder", "balance-recovery"]),
  title: z.string().min(1),
  why: z.string().min(1),
});

export const weeklyReviewSummarySchema = z.object({
  rangeStart: isoDateSchema,
  rangeEnd: isoDateSchema,
  days: z.number().int().min(1),
  checkinsCount: z.number().int().min(0),
  workoutsCount: z.number().int().min(0),
  nutritionLogsCount: z.number().int().min(0),
  averageEnergy: z.number().min(0).max(5).nullable(),
  averageHunger: z.number().min(0).max(5).nullable(),
});

export const weeklyReviewResponseSchema = z.object({
  summary: weeklyReviewSummarySchema,
  recommendations: z.array(weeklyReviewRecommendationSchema).max(3),
});

export type WeeklyReviewRequest = z.infer<typeof weeklyReviewRequestSchema>;
export type WeeklyReviewResponse = z.infer<typeof weeklyReviewResponseSchema>;
