import { z } from "zod";

export const bodyFatScanRequestSchema = z.object({
  frontPhotoDataUrl: z
    .string()
    .min(40)
    .max(2_000_000)
    .regex(/^data:image\/(png|jpe?g|webp);base64,/i, "Invalid front image data URL"),
  sidePhotoDataUrl: z
    .string()
    .min(40)
    .max(2_000_000)
    .regex(/^data:image\/(png|jpe?g|webp);base64,/i, "Invalid side image data URL"),
  locale: z.enum(["es", "en", "pt"]).optional().default("es"),
});

export const bodyFatScanModelOutputSchema = z.object({
  estimateBodyFatPercent: z.number().min(2).max(60),
  range: z.object({
    min: z.number().min(2).max(60),
    max: z.number().min(2).max(60),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  qualityScore: z.number().int().min(0).max(100),
  issues: z.array(z.string().min(1).max(120)).max(8),
  disclaimer: z.string().min(1).max(320),
  summary: z.string().min(1).max(280).optional(),
});

export const bodyFatScanResponseSchema = z.object({
  executionStatus: z.enum(["completed", "blocked", "fallback", "error"]),
  status: z.enum(["ai_success", "deterministic_fallback"]),
  analysisMode: z.enum(["ai_augmented", "deterministic_fallback"]),
  estimate: z.object({
    bodyFatPercent: z.number().min(2).max(60),
    leanMassKg: z.number().positive().nullable(),
    fatMassKg: z.number().positive().nullable(),
  }),
  range: z.object({
    min: z.number().min(2).max(60),
    max: z.number().min(2).max(60),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  qualityScore: z.number().int().min(0).max(100),
  issues: z.array(z.string().min(1).max(120)).max(8),
  limitations: z.array(z.string().min(1).max(120)).max(8),
  disclaimer: z.string().min(1).max(320),
  summary: z.string().min(1).max(280),
  fallbackReason: z
    .enum(["UPSTREAM_ERROR", "CONTRACT_DRIFT", "AI_NOT_CONFIGURED", "UNEXPECTED_ERROR"])
    .optional(),
  persistence: z.object({
    status: z.enum(["persisted", "persist_failed", "not_persisted"]),
    adapter: z.enum(["tracking_json", "memory", "none"]),
    errorMessage: z.string().nullable(),
    record: z
      .object({
        id: z.string(),
        capability: z.literal("body-scan"),
        executionStatus: z.enum(["completed", "fallback"]),
        origin: z.string().min(1),
        state: z.enum(["ready", "low_confidence", "insufficient_data"]),
        confidence: z.enum(["low", "medium", "high"]),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      })
      .nullable(),
  }),
  aiTokenBalance: z.number().nullable().optional(),
  aiTokenRenewalAt: z.string().nullable().optional(),
  balanceBefore: z.number().nullable().optional(),
  balanceAfter: z.number().nullable().optional(),
  costCents: z.number().nonnegative().optional(),
  costEur: z.number().nonnegative().optional(),
  usage: z
    .object({
      promptTokens: z.number().nonnegative(),
      completionTokens: z.number().nonnegative(),
      totalTokens: z.number().nonnegative(),
    })
    .optional(),
});

export const bodyFatScanModelOutputJsonSchema = {
  type: "object",
  properties: {
    estimateBodyFatPercent: { type: "number", minimum: 2, maximum: 60 },
    range: {
      type: "object",
      properties: {
        min: { type: "number", minimum: 2, maximum: 60 },
        max: { type: "number", minimum: 2, maximum: 60 },
      },
      required: ["min", "max"],
      additionalProperties: false,
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    qualityScore: { type: "integer", minimum: 0, maximum: 100 },
    issues: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
    disclaimer: { type: "string", minLength: 1, maxLength: 320 },
    summary: { type: "string", minLength: 1, maxLength: 280 },
  },
  required: ["estimateBodyFatPercent", "range", "confidence", "qualityScore", "issues", "disclaimer"],
  additionalProperties: false,
} as const;

export type BodyFatScanRequest = z.infer<typeof bodyFatScanRequestSchema>;
export type BodyFatScanModelOutput = z.infer<typeof bodyFatScanModelOutputSchema>;
export type BodyFatScanResponse = z.infer<typeof bodyFatScanResponseSchema>;
