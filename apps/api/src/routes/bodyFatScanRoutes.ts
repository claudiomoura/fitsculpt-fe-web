import type { User } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthenticatedEntitlementsRequest } from "../middleware/entitlements.js";
import type { OpenAiResponse } from "../ai/provider/openaiClient.js";
import { sendAiEndpointError } from "../domains/ai/mapAiEndpointError.js";
import {
  bodyFatScanModelOutputJsonSchema,
  bodyFatScanRequestSchema,
  type BodyFatScanResponse,
} from "../tracking/bodyFatScanSchemas.js";
import {
  buildDeterministicBodyFatFallback,
  extractBodyFatScanContext,
  normalizeAiBodyFatScan,
} from "../tracking/bodyFatScanService.js";
import { createBodyFatScanRepository } from "../tracking/bodyFatScanRepository.js";

type RequireUserFn = (request: FastifyRequest, options?: { logContext?: string }) => Promise<User>;
type CallOpenAiFn = (
  prompt: string,
  attempt?: number,
  parser?: (content: string) => Record<string, unknown>,
  options?: {
    responseFormat?: {
      type: "json_schema";
      json_schema: {
        name: string;
        schema: Record<string, unknown>;
        strict?: boolean;
      };
    };
    model?: string;
    maxTokens?: number;
    retryOnParseError?: boolean;
    userContent?: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
    >;
  },
) => Promise<OpenAiResponse>;

type CreateHttpErrorFn = (statusCode: number, code: string, debug?: Record<string, unknown>) => Error;

type AiUsageSummary = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type ChargeAiUsageForResultFn = (params: any) => Promise<{
  payload: Record<string, unknown>;
  balance?: number;
  costCents?: number;
  usage?: AiUsageSummary;
}>;

type BodyFatScanEntitlements = {
  legacy: { tier: string };
  role: { adminOverride: boolean };
};

const ZERO_AI_USAGE: AiUsageSummary = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

function toEurAmount(costCents: number) {
  return Number((Math.max(0, costCents) / 100).toFixed(2));
}

function serializeTokenRenewalAt(user: User) {
  const expiry = user.aiTokenResetAt ?? user.aiTokenRenewalAt;
  return expiry ? expiry.toISOString() : null;
}

function buildPrompt(locale: "es" | "en" | "pt") {
  const languageInstruction =
    locale === "es"
      ? "Write issues/disclaimer/summary in Spanish."
      : locale === "pt"
        ? "Write issues/disclaimer/summary in Portuguese."
        : "Write issues/disclaimer/summary in English.";
  return [
    "Analyze front and side body progress photos for a non-clinical body-fat estimate.",
    "Return strict JSON only with the requested schema.",
    "Use conservative uncertainty ranges and avoid medical claims.",
    "qualityScore must reflect photo quality + consistency confidence (0-100).",
    languageInstruction,
  ].join(" ");
}

function attachAiMeta(
  payload: BodyFatScanResponse,
  params: {
    usage: AiUsageSummary;
    costCents: number;
    balanceBefore: number | null;
    balanceAfter: number | null;
    aiTokenRenewalAt: string | null;
  },
): BodyFatScanResponse {
  return {
    ...payload,
    usage: params.usage,
    costCents: params.costCents,
    costEur: toEurAmount(params.costCents),
    balanceBefore: params.balanceBefore,
    balanceAfter: params.balanceAfter,
    aiTokenBalance: params.balanceAfter,
    aiTokenRenewalAt: params.aiTokenRenewalAt,
  };
}

function blockedResponse(
  reply: FastifyReply,
  statusCode: 403 | 429,
  body: {
    error: string;
    kind: "auth" | "quota";
    reason?: string;
    retryAfterSec?: number;
  },
) {
  if (typeof body.retryAfterSec === "number") {
    reply.header("Retry-After", String(body.retryAfterSec));
  }
  return reply.status(statusCode).send({
    executionStatus: "blocked",
    status: "blocked",
    ...body,
  });
}

function errorResponse(
  reply: FastifyReply,
  statusCode: number,
  body: {
    error: string;
    kind: "upstream" | "internal";
    reason?: string;
  },
) {
  return reply.status(statusCode).send({
    executionStatus: "error",
    status: "error",
    ...body,
  });
}

export function registerBodyFatScanRoutes(
  app: FastifyInstance,
  deps: {
    requireUser: RequireUserFn;
    getOrCreateProfile: (userId: string) => Promise<{ profile: unknown; tracking: unknown }>;
    callOpenAi: CallOpenAiFn;
    createHttpError: CreateHttpErrorFn;
    aiAccessGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    getUserEntitlements?: (user: User) => BodyFatScanEntitlements;
    getEffectiveTokenBalance?: (user: User) => number;
    assertSufficientAiTokenBalance?: (user: User, minimumRequiredTokens?: number) => number;
    getEstimatedAiFeatureTokens?: (feature: string) => number;
    enforceAiQuota?: (user: { id: string; plan: string }) => Promise<void>;
    chargeAiUsageForResult?: ChargeAiUsageForResultFn;
    prisma?: unknown;
    aiPricing?: unknown;
  },
) {
  const bodyFatFeature = "body-fat-scan-analysis";
  const repository = createBodyFatScanRepository({ prisma: deps.prisma as never });

  app.post(
    "/tracking/body-fat-scan/analyze",
    deps.aiAccessGuard ? { preHandler: deps.aiAccessGuard } : {},
    async (request, reply) => {
      const authRequest = request as AuthenticatedEntitlementsRequest;
      const user =
        authRequest.currentUser ??
        (await deps.requireUser(request, { logContext: "/tracking/body-fat-scan/analyze" }));
      const entitlements = authRequest.currentEntitlements ?? deps.getUserEntitlements?.(user);

      if (!entitlements) {
        return blockedResponse(reply, 403, { error: "AI_ACCESS_FORBIDDEN", kind: "auth" });
      }
      if (!entitlements.role.adminOverride && entitlements.legacy.tier !== "PRO") {
        return blockedResponse(reply, 403, {
          error: "AI_ACCESS_FORBIDDEN",
          kind: "auth",
          reason: "pro_required",
        });
      }

      const parsed = bodyFatScanRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendAiEndpointError(reply, parsed.error);
      }

      const input = parsed.data;
      const shouldChargeAi = !entitlements.role.adminOverride;
      const tokenFlowReady =
        Boolean(
          deps.assertSufficientAiTokenBalance &&
            deps.getEstimatedAiFeatureTokens &&
            deps.enforceAiQuota &&
            deps.chargeAiUsageForResult &&
            deps.prisma &&
            deps.aiPricing,
        );
      const baseBalanceBefore =
        typeof deps.getEffectiveTokenBalance?.(user) === "number"
          ? deps.getEffectiveTokenBalance(user)
          : typeof user.aiTokenBalance === "number"
            ? user.aiTokenBalance
            : null;
      let responseUsage: AiUsageSummary = ZERO_AI_USAGE;
      let responseCostCents = 0;
      let responseBalanceAfter = baseBalanceBefore;
      const aiTokenRenewalAt = serializeTokenRenewalAt(user);

      const profileSnapshot = await deps.getOrCreateProfile(user.id);
      const context = extractBodyFatScanContext(profileSnapshot.profile, profileSnapshot.tracking);

      try {
        if (shouldChargeAi && !tokenFlowReady) {
          throw deps.createHttpError(503, "AI_BILLING_NOT_READY", {
            kind: "upstream",
            reason: "token_flow_not_configured",
          });
        }

        if (shouldChargeAi) {
          deps.assertSufficientAiTokenBalance!(
            user,
            deps.getEstimatedAiFeatureTokens!(bodyFatFeature),
          );
          await deps.enforceAiQuota!({ id: user.id, plan: entitlements.legacy.tier });
        }

        const aiResponse = await deps.callOpenAi(buildPrompt(input.locale), 0, JSON.parse, {
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "body_fat_scan",
              schema: bodyFatScanModelOutputJsonSchema as unknown as Record<string, unknown>,
              strict: true,
            },
          },
          model: "gpt-4o-mini",
          maxTokens: 500,
          retryOnParseError: false,
          userContent: [
            {
              type: "text",
              text: "Use front and side images jointly and report uncertainty explicitly.",
            },
            {
              type: "image_url",
              image_url: {
                url: input.frontPhotoDataUrl,
                detail: "low",
              },
            },
            {
              type: "image_url",
              image_url: {
                url: input.sidePhotoDataUrl,
                detail: "low",
              },
            },
          ],
        });

        const normalized = normalizeAiBodyFatScan(aiResponse.payload, context);
        const chargedResult = shouldChargeAi
          ? await deps.chargeAiUsageForResult!({
              prisma: deps.prisma!,
              pricing: deps.aiPricing!,
              user: {
                id: user.id,
                plan: user.plan,
                aiTokenBalance: user.aiTokenBalance ?? 0,
                aiTokenResetAt: user.aiTokenResetAt,
                aiTokenRenewalAt: user.aiTokenRenewalAt,
              },
              feature: bodyFatFeature,
              result: {
                payload: aiResponse.payload,
                model: aiResponse.model ?? "gpt-4o-mini",
                requestId: aiResponse.requestId ?? null,
                usage: aiResponse.usage ?? {},
              },
              meta: { route: "tracking/body-fat-scan/analyze" },
              createHttpError: deps.createHttpError,
            })
          : null;

        if (chargedResult?.usage) responseUsage = chargedResult.usage;
        if (typeof chargedResult?.costCents === "number") responseCostCents = Math.max(0, chargedResult.costCents);
        if (typeof chargedResult?.balance === "number") responseBalanceAfter = chargedResult.balance;

        const persisted = await repository.save({
          userId: user.id,
          origin: "tracking",
          payload: normalized,
        });

        const response = attachAiMeta(
          {
            ...normalized,
            persistence: {
              status: "persisted",
              adapter: persisted.adapter,
              errorMessage: null,
              record: persisted.record,
            },
          },
          {
            usage: responseUsage,
            costCents: responseCostCents,
            balanceBefore: baseBalanceBefore,
            balanceAfter: responseBalanceAfter,
            aiTokenRenewalAt,
          },
        );

        return reply.status(200).send(response);
      } catch (error) {
        const typed = error as { code?: string; message?: string };
        if (typed.code === "AI_TOKENS_INSUFFICIENT" || typed.code === "AI_TOKENS_EXHAUSTED") {
          return blockedResponse(reply, 429, { error: typed.code, kind: "quota" });
        }
        if (typed.code === "NOT_PRO") {
          return blockedResponse(reply, 403, { error: typed.code, kind: "auth", reason: "pro_required" });
        }
        if (typed.code === "AI_BILLING_NOT_READY") {
          return errorResponse(reply, 503, {
            error: "AI_BILLING_NOT_READY",
            kind: "upstream",
            reason: "token_flow_not_configured",
          });
        }

        const fallbackReason: NonNullable<BodyFatScanResponse["fallbackReason"]> =
          error instanceof z.ZodError
            ? "CONTRACT_DRIFT"
            : typed.code === "AI_REQUEST_FAILED"
              ? "UPSTREAM_ERROR"
              : typed.code === "AI_NOT_CONFIGURED"
                ? "AI_NOT_CONFIGURED"
                : "UNEXPECTED_ERROR";

        const fallback = buildDeterministicBodyFatFallback({
          reason: fallbackReason,
          context,
          locale: input.locale,
        });

        try {
          const persisted = await repository.save({
            userId: user.id,
            origin: "tracking",
            payload: fallback,
          });
          fallback.persistence = {
            status: "persisted",
            adapter: persisted.adapter,
            errorMessage: null,
            record: persisted.record,
          };
        } catch {
          fallback.persistence = {
            status: "persist_failed",
            adapter: "none",
            errorMessage: "Unable to persist body scan fallback payload.",
            record: null,
          };
        }

        return reply.status(200).send(
          attachAiMeta(fallback, {
            usage: responseUsage,
            costCents: responseCostCents,
            balanceBefore: baseBalanceBefore,
            balanceAfter: responseBalanceAfter,
            aiTokenRenewalAt,
          }),
        );
      }
    },
  );
}
