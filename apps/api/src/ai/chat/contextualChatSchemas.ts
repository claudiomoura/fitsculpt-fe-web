import { z } from "zod";

export const CONTEXTUAL_CHAT_MAX_MESSAGE_LENGTH = 1200;

export const contextualChatSurfaceSchema = z.enum([
  "feed",
  "training",
  "nutrition",
  "general",
]);

export const contextualChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1)
    .max(CONTEXTUAL_CHAT_MAX_MESSAGE_LENGTH),
  surface: contextualChatSurfaceSchema.optional(),
  locale: z.string().trim().min(2).max(16).optional(),
  focusEntityId: z.string().trim().min(1).max(120).optional(),
});

const contextualChatReplySchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  message: z.string().trim().min(1),
  suggestions: z.array(z.string().trim().min(1).max(120)).max(4).optional(),
});

export const contextualChatResponseSchema = z.object({
  reply: contextualChatReplySchema,
  aiRequestId: z.string().nullable().optional(),
  aiTokenBalance: z.number().nullable().optional(),
  aiTokenRenewalAt: z.string().nullable().optional(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});

export type ContextualChatRequest = z.infer<typeof contextualChatRequestSchema>;
export type ContextualChatResponse = z.infer<typeof contextualChatResponseSchema>;
