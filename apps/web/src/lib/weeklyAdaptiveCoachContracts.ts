import { z } from "zod";
import {
  WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION,
  type WeeklyCoachCheckInAnswers,
  type WeeklyCoachCheckInDraftResponse,
  type WeeklyCoachCheckInSubmitRequest,
  type WeeklyCoachWeeklyStateResponse,
} from "@/types/weeklyAdaptiveCoach";

export type WeeklyCoachContractValidationResult = {
  ok: boolean;
  reason?: string;
};

const isoDateSchema = z.iso.date();
const isoDatetimeSchema = z.iso.datetime({ offset: true });
const boundedScoreSchema = z.number().int().min(1).max(5);
const nonEmptyStringSchema = z.string().trim().min(1);
const nonNegativeIntegerSchema = z.number().int().min(0);

const weeklyCoachPlanWeekStateSchema = z.enum([
  "draft",
  "active",
  "check_in_due",
  "adaptation_ready",
  "accepted",
  "expired",
]);

const weeklyCoachLoopStateSchema = z.enum([
  "onboarding_in_progress",
  "plan_initial_ready",
  "plan_active",
  "check_in_due",
  "check_in_submitted",
  "adaptation_generated",
  "adaptation_accepted",
]);

const weeklyCoachCheckInStateSchema = z.enum(["draft", "submitted", "processed", "flagged"]);

const weeklyCoachCurrentWeekSchema = z.object({
  planWeekId: nonEmptyStringSchema,
  weekIndex: z.number().int().min(1),
  state: weeklyCoachPlanWeekStateSchema,
  validFrom: isoDateSchema,
  validTo: isoDateSchema,
  weeklyObjective: nonEmptyStringSchema.nullable(),
  acceptedAt: isoDatetimeSchema.nullable(),
});

const weeklyCoachPlanSummarySchema = z.object({
  trainingSummary: z.array(nonEmptyStringSchema),
  nutritionSummary: z.array(nonEmptyStringSchema),
  assumptions: z.array(nonEmptyStringSchema),
});

export const weeklyCoachWeeklyStateResponseSchema = z.object({
  loopState: weeklyCoachLoopStateSchema,
  currentWeek: weeklyCoachCurrentWeekSchema.nullable(),
  nextAction: nonEmptyStringSchema.nullable(),
  checkInDue: z.boolean(),
  planSummary: weeklyCoachPlanSummarySchema.nullable(),
  latestAdaptationSummary: nonEmptyStringSchema.nullable(),
  featureFlags: z.object({
    weeklyCoachEnabled: z.boolean(),
    weeklyCheckInEnabled: z.boolean(),
    adaptationEnabled: z.boolean(),
  }),
});

export const weeklyCoachCheckInAnswersSchema = z.object({
  trainingSessionsCompleted: nonNegativeIntegerSchema.optional(),
  trainingSessionsPlanned: nonNegativeIntegerSchema.optional(),
  nutritionAdherenceScore: boundedScoreSchema.optional(),
  progressMode: z.enum(["weight", "perceived_progress"]).optional(),
  currentWeightKg: z.number().positive().nullable().optional(),
  perceivedProgress: nonEmptyStringSchema.nullable().optional(),
  energyScore: boundedScoreSchema.optional(),
  hungerScore: boundedScoreSchema.optional(),
  recoveryScore: boundedScoreSchema.optional(),
  stressScore: boundedScoreSchema.optional(),
  painLevel: nonEmptyStringSchema.optional(),
  frictionPrimary: nonEmptyStringSchema.optional(),
  frictionNote: z.string().trim().max(600).nullable().optional(),
  contextChangeFlag: z.boolean().optional(),
  contextChangeType: nonEmptyStringSchema.nullable().optional(),
  nextWeekConfidenceScore: boundedScoreSchema.optional(),
});

const weeklyCoachWeekContextSchema = z.object({
  planWeekId: nonEmptyStringSchema,
  weekIndex: z.number().int().min(1),
  state: weeklyCoachPlanWeekStateSchema,
  validFrom: isoDateSchema,
  validTo: isoDateSchema,
  weeklyObjective: nonEmptyStringSchema.nullable(),
});

export const weeklyCoachCheckInDraftResponseSchema = z.object({
  checkInId: nonEmptyStringSchema.nullable(),
  checkInState: weeklyCoachCheckInStateSchema,
  weekContext: weeklyCoachWeekContextSchema,
  draftAnswers: weeklyCoachCheckInAnswersSchema,
  requiredFields: z.array(nonEmptyStringSchema),
  completionState: z.object({
    completedFields: z.array(nonEmptyStringSchema),
    missingRequiredFields: z.array(nonEmptyStringSchema),
    isComplete: z.boolean(),
  }),
  deadline: isoDatetimeSchema.nullable(),
  nextCta: nonEmptyStringSchema.nullable(),
  updatedAt: isoDatetimeSchema.nullable(),
});

export const weeklyCoachCheckInSubmitRequestSchema = z
  .object({
    contractVersion: z.literal(WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION),
    clientRequestId: nonEmptyStringSchema,
    trainingSessionsCompleted: nonNegativeIntegerSchema,
    trainingSessionsPlanned: nonNegativeIntegerSchema.min(1),
    nutritionAdherenceScore: boundedScoreSchema,
    progressMode: z.enum(["weight", "perceived_progress"]),
    currentWeightKg: z.number().positive().nullable(),
    perceivedProgress: nonEmptyStringSchema.nullable(),
    energyScore: boundedScoreSchema,
    hungerScore: boundedScoreSchema,
    recoveryScore: boundedScoreSchema,
    stressScore: boundedScoreSchema,
    painLevel: nonEmptyStringSchema,
    frictionPrimary: nonEmptyStringSchema,
    frictionNote: z.string().trim().max(600).nullable(),
    contextChangeFlag: z.boolean(),
    contextChangeType: nonEmptyStringSchema.nullable(),
    nextWeekConfidenceScore: boundedScoreSchema,
  })
  .superRefine((value, ctx) => {
    if (value.trainingSessionsCompleted > value.trainingSessionsPlanned) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trainingSessionsCompleted"],
        message: "completed sessions cannot exceed planned sessions",
      });
    }

    if (value.progressMode === "weight" && value.currentWeightKg === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentWeightKg"],
        message: "currentWeightKg is required when progressMode is weight",
      });
    }

    if (value.progressMode === "perceived_progress" && value.perceivedProgress === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["perceivedProgress"],
        message: "perceivedProgress is required when progressMode is perceived_progress",
      });
    }

    if (!value.contextChangeFlag && value.contextChangeType !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contextChangeType"],
        message: "contextChangeType must be null when contextChangeFlag is false",
      });
    }

    if (value.contextChangeFlag && value.contextChangeType === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contextChangeType"],
        message: "contextChangeType is required when contextChangeFlag is true",
      });
    }
  });

export function parseWeeklyCoachWeeklyStateResponse(payload: unknown): WeeklyCoachWeeklyStateResponse | null {
  const result = weeklyCoachWeeklyStateResponseSchema.safeParse(payload);
  return result.success ? result.data : null;
}

export function parseWeeklyCoachCheckInDraftResponse(payload: unknown): WeeklyCoachCheckInDraftResponse | null {
  const result = weeklyCoachCheckInDraftResponseSchema.safeParse(payload);
  return result.success ? result.data : null;
}

export function parseWeeklyCoachCheckInAnswers(payload: unknown): WeeklyCoachCheckInAnswers | null {
  const result = weeklyCoachCheckInAnswersSchema.safeParse(payload);
  return result.success ? result.data : null;
}

export function parseWeeklyCoachCheckInSubmitRequest(payload: unknown): WeeklyCoachCheckInSubmitRequest | null {
  const result = weeklyCoachCheckInSubmitRequestSchema.safeParse(payload);
  return result.success ? result.data : null;
}

export function validateWeeklyCoachWeeklyStatePayload(payload: unknown): WeeklyCoachContractValidationResult {
  const result = weeklyCoachWeeklyStateResponseSchema.safeParse(payload);
  if (result.success) return { ok: true };
  return { ok: false, reason: result.error.issues[0]?.message ?? "WEEKLY_COACH_WEEKLY_STATE_INVALID" };
}

export function validateWeeklyCoachCheckInDraftPayload(payload: unknown): WeeklyCoachContractValidationResult {
  const result = weeklyCoachCheckInDraftResponseSchema.safeParse(payload);
  if (result.success) return { ok: true };
  return { ok: false, reason: result.error.issues[0]?.message ?? "WEEKLY_COACH_CHECKIN_DRAFT_INVALID" };
}

export function validateWeeklyCoachCheckInSubmitPayload(payload: unknown): WeeklyCoachContractValidationResult {
  const result = weeklyCoachCheckInSubmitRequestSchema.safeParse(payload);
  if (result.success) return { ok: true };
  return { ok: false, reason: result.error.issues[0]?.message ?? "WEEKLY_COACH_CHECKIN_SUBMIT_INVALID" };
}

export function createEmptyWeeklyCoachCheckInAnswers(): WeeklyCoachCheckInAnswers {
  return {
    currentWeightKg: null,
    perceivedProgress: null,
    frictionNote: null,
    contextChangeType: null,
  };
}
