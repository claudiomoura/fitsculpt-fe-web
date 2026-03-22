import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const rctGroupSchema = z.enum(["control", "treatment"]);
export const rctProjectionModeSchema = z.enum(["minimal", "full"]);

export const futureProjectionScenarioSchema = z.object({
  id: z.enum(["current-consistency", "improved-consistency"]),
  label: z.string().min(1),
  adherenceScore: z.number().min(0).max(1),
  expectedDeltaKg: z.object({
    min: z.number(),
    max: z.number(),
  }),
  projectedWeightKg: z
    .object({
      current: z.number().positive(),
      min: z.number().positive(),
      max: z.number().positive(),
    })
    .nullable(),
  assumptions: z.array(z.string().min(1)).min(2).max(6),
});

export const futureProjectionHorizonSchema = z.object({
  months: z.union([z.literal(3), z.literal(6), z.literal(12)]),
  confidence: z.enum(["low", "medium", "high"]),
  scenarios: z.array(futureProjectionScenarioSchema).min(1).max(2),
});

export const futureProjectionResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  experiment: z.object({
    id: z.string().min(1),
    group: rctGroupSchema,
    projectionMode: rctProjectionModeSchema,
  }),
  inputs: z.object({
    goal: z.enum(["cut", "maintain", "bulk"]),
    currentWeightKg: z.number().positive().nullable(),
    targetSessionsPerWeek: z.number().int().min(1).max(7),
    adherenceScore: z.number().min(0).max(1),
    consistencyScore: z.number().min(0).max(1),
    loggingFrequencyDaysPerWeek: z.number().min(0).max(7),
    weightTrendKgPerWeek: z.number().nullable(),
  }),
  horizons: z.array(futureProjectionHorizonSchema).length(3),
  limitations: z.array(z.string().min(1)).min(2).max(8),
  disclaimer: z.string().min(1),
});

export const rctMetricSnapshotSchema = z.object({
  weekKey: isoDateSchema,
  weeklyActivitySessions: z.number().int().min(0),
  adherenceScore: z.number().min(0).max(1),
  recommendationAcceptanceRate: z.number().min(0).max(1).nullable(),
  loggingFrequencyDays: z.number().int().min(0).max(7),
  capturedAt: z.string().datetime(),
});

export const rctStatusResponseSchema = z.object({
  experimentId: z.string().min(1),
  group: rctGroupSchema,
  projectionMode: rctProjectionModeSchema,
  status: z.literal("active"),
  assignedAt: z.string().datetime(),
  latestMetrics: rctMetricSnapshotSchema,
  eventCounts: z.object({
    projectionViewed: z.number().int().min(0),
    scenarioSelected: z.number().int().min(0),
    recommendationsAccepted: z.number().int().min(0),
    recommendationsRejected: z.number().int().min(0),
    loggingEvents: z.number().int().min(0),
  }),
});

export const rctEventRequestSchema = z.object({
  event: z.enum([
    "projection_viewed",
    "projection_scenario_selected",
    "recommendation_accepted",
    "recommendation_rejected",
    "logging_entry_created",
  ]),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const rctEventResponseSchema = z.object({
  ok: z.literal(true),
  storedAt: z.string().datetime(),
});

export type FutureProjectionResponse = z.infer<typeof futureProjectionResponseSchema>;
export type RctStatusResponse = z.infer<typeof rctStatusResponseSchema>;
export type RctMetricSnapshot = z.infer<typeof rctMetricSnapshotSchema>;
export type RctEventRequest = z.infer<typeof rctEventRequestSchema>;
