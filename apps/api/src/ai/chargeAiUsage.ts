import type { Prisma, PrismaClient } from "@prisma/client";
import { computeCostCents, getModelPricing, normalizeModelName, type AiPricingMap } from "./pricing.js";

type AiUsageUser = {
  id: string;
  plan: string;
  aiTokenBalance: number;
  aiTokenResetAt: Date | null;
  aiTokenRenewalAt: Date | null;
  isAdminOverride?: boolean;
};

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

export type AiUsageProviderUsage = OpenAiUsage;

export type AiUsageMode = "AI" | "FALLBACK";

type AiExecutionResult = {
  payload: Record<string, unknown>;
  model?: string | null;
  usage?: OpenAiUsage | null;
  requestId?: string | null;
};

type ChargeAiUsageParams = {
  prisma: PrismaClient | Prisma.TransactionClient;
  pricing: AiPricingMap;
  user: AiUsageUser;
  feature: string;
  execute: () => Promise<AiExecutionResult>;
  createHttpError: (statusCode: number, code: string, debug?: Record<string, unknown>) => Error;
};

type ChargeAiUsageForResultParams = {
  prisma: PrismaClient | Prisma.TransactionClient;
  pricing: AiPricingMap;
  user: AiUsageUser;
  feature: string;
  result: AiExecutionResult;
  meta?: Record<string, unknown>;
  createHttpError: (statusCode: number, code: string, debug?: Record<string, unknown>) => Error;
};

type UsageTotals = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AiUsageTotals = UsageTotals;

const FEATURE_ESTIMATED_TOKEN_COST: Record<string, number> = {
  "training-generate": 1200,
  "nutrition-generate": 1200,
  training: 800,
  nutrition: 800,
  tip: 300,
};

function getFeatureEstimatedTokenCost(feature: string): number {
  return FEATURE_ESTIMATED_TOKEN_COST[feature] ?? 1;
}


export function extractExactProviderUsage(usage?: OpenAiUsage | null): UsageTotals | undefined {
  if (!usage) return undefined;
  const promptRaw = usage.prompt_tokens ?? usage.input_tokens;
  const completionRaw = usage.completion_tokens ?? usage.output_tokens;
  const totalRaw = usage.total_tokens;
  if (typeof promptRaw !== "number" || typeof completionRaw !== "number" || typeof totalRaw !== "number") {
    return undefined;
  }

  return {
    promptTokens: Math.max(0, promptRaw),
    completionTokens: Math.max(0, completionRaw),
    totalTokens: Math.max(0, totalRaw),
  };
}

export function buildUsageTotals(usage?: OpenAiUsage | null): UsageTotals {
  const promptTokens = Math.max(0, usage?.prompt_tokens ?? usage?.input_tokens ?? 0);
  const completionTokens = Math.max(0, usage?.completion_tokens ?? usage?.output_tokens ?? 0);
  const totalTokens = Math.max(0, usage?.total_tokens ?? promptTokens + completionTokens);
  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

type PersistAiUsageLogParams = {
  prisma: PrismaClient | Prisma.TransactionClient;
  userId: string;
  feature: string;
  requestId?: string | null;
  model?: string | null;
  provider?: string | null;
  usage?: OpenAiUsage | null;
  totals?: UsageTotals;
  costCents?: number;
  currency?: string;
  meta?: Record<string, unknown>;
  mode?: AiUsageMode;
  fallbackReason?: string | null;
  throwOnError?: boolean;
};

export async function persistAiUsageLog(params: PersistAiUsageLogParams) {
  const totals = params.totals ?? buildUsageTotals(params.usage);
  const logMeta =
    params.meta && Object.keys(params.meta).length > 0 ? (params.meta as Prisma.InputJsonValue) : undefined;

  try {
    await params.prisma.aiUsageLog.create({
      data: {
        userId: params.userId,
        feature: params.feature,
        model: params.model ?? "unknown",
        mode: params.mode ?? "AI",
        fallbackReason: params.fallbackReason ?? undefined,
        promptTokens: totals.promptTokens,
        completionTokens: totals.completionTokens,
        totalTokens: totals.totalTokens,
        costCents: params.costCents ?? 0,
        currency: params.currency ?? "usd",
        requestId: params.requestId ?? undefined,
        meta: logMeta,
      },
    });
    console.info("AI usage persisted", {
      feature: params.feature,
      userId: params.userId,
      mode: params.mode ?? "AI",
      model: params.model ?? "unknown",
      provider: params.provider ?? "unknown",
      requestId: params.requestId ?? null,
      promptTokens: totals.promptTokens,
      completionTokens: totals.completionTokens,
      totalTokens: totals.totalTokens,
    });
  } catch (error) {
    const typedError = error as {
      name?: string;
      message?: string;
      code?: string;
      meta?: { modelName?: string; column?: string; target?: unknown };
    };
    console.warn("AI usage persist failed but continued", {
      feature: params.feature,
      step: "usage_log_create",
      userId: params.userId,
      mode: params.mode ?? "AI",
      model: params.model ?? "unknown",
      provider: params.provider ?? "unknown",
      aiRequestId: params.requestId ?? null,
      errorName: typedError.name ?? "UnknownError",
      prisma_code: typedError.code,
      prisma_model: typedError.meta?.modelName,
      prisma_column: typedError.meta?.column,
      errorMessage: typedError.message ?? "unknown",
    });
    if (params.throwOnError) {
      throw error;
    }
  }
}

function getEffectiveTokens(user: { aiTokenBalance: number; aiTokenResetAt: Date | null; aiTokenRenewalAt: Date | null }) {
  const expiresAt = user.aiTokenResetAt ?? user.aiTokenRenewalAt;
  if (!expiresAt) return 0;
  if (expiresAt.getTime() < Date.now()) return 0;
  return Math.max(0, user.aiTokenBalance);
}

function buildChargeDetails({
  pricing,
  model,
  usage,
  meta,
  feature,
  userId,
}: {
  pricing: AiPricingMap;
  model?: string | null;
  usage?: OpenAiUsage | null;
  meta?: Record<string, unknown>;
  feature: string;
  userId: string;
}) {
  const usageProvided = Boolean(usage);
  if (!usageProvided) {
    console.warn("AI usage missing from provider response", { feature, userId });
  }
  const totals = buildUsageTotals(usage);
  const normalizedModel = normalizeModelName(model, pricing) ?? model ?? "unknown";
  const pricingEntry = getModelPricing(normalizedModel, pricing);
  const pricingFound = Boolean(pricingEntry);
  if (!pricingFound) {
    console.warn("AI pricing missing for model", { feature, userId, model: normalizedModel });
  }
  let costCents = computeCostCents({
    pricing,
    model: normalizedModel,
    promptTokens: totals.promptTokens,
    completionTokens: totals.completionTokens,
  });
  const nextMeta: Record<string, unknown> = { ...(meta ?? {}) };

  if (!usageProvided) {
    nextMeta.usageMissing = true;
  }
  if (!pricingFound) {
    nextMeta.pricingMissing = true;
  }
  if (costCents <= 0 && totals.totalTokens > 0) {
    console.warn("AI costCents=0", {
      feature,
      userId,
      model: normalizedModel,
      usageProvided,
      pricingFound,
      totals,
    });
    nextMeta.zeroCost = true;
    costCents = 1;
  }
  if (!usageProvided || !pricingFound) {
    costCents = Math.max(1, costCents);
  }

  return {
    costCents,
    totals,
    normalizedModel,
    meta: nextMeta,
  };
}

async function debitAiTokensTx(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  args: {
    feature: string;
    model: string;
    usage: UsageTotals;
    costCents: number;
    meta?: Record<string, unknown>;
    requestId?: string | null;
  },
  createHttpError: (statusCode: number, code: string, debug?: Record<string, unknown>) => Error
) {
  const { feature, model, usage, costCents, meta, requestId } = args;
  const runDebit = async (tx: Prisma.TransactionClient) => {
    console.info("AI token debit transaction started", {
      userId,
      feature,
      requestId: requestId ?? null,
      requestedTokens: usage.totalTokens,
    });
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createHttpError(404, "USER_NOT_FOUND");
    }
    const effectiveTokens = getEffectiveTokens({
      aiTokenBalance: user.aiTokenBalance ?? 0,
      aiTokenResetAt: user.aiTokenResetAt,
      aiTokenRenewalAt: user.aiTokenRenewalAt,
    });
    if (effectiveTokens <= 0) {
      throw createHttpError(403, "AI_TOKENS_EXHAUSTED", { message: "No tienes tokens IA" });
    }

    if (requestId) {
      const existing = await tx.aiUsageLog.findFirst({
        where: {
          userId,
          feature,
          requestId,
          mode: "AI",
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        const existingMeta =
          existing.meta && typeof existing.meta === "object" && !Array.isArray(existing.meta)
            ? (existing.meta as Record<string, unknown>)
            : undefined;
        const existingBalanceAfter =
          typeof existingMeta?.balanceAfter === "number" ? Math.max(0, existingMeta.balanceAfter) : null;

        return {
          balance: existingBalanceAfter ?? effectiveTokens,
          debitedTokens: 0,
          idempotentReplay: true,
        };
      }
    }

    const tokensToDebit = Math.max(0, usage.totalTokens);
    const nextBalance = Math.max(0, effectiveTokens - tokensToDebit);
    const mergedMeta = { ...(meta ?? {}) };
    if (tokensToDebit > effectiveTokens) {
      mergedMeta.overdraw = true;
    }
    mergedMeta.balanceBefore = effectiveTokens;
    mergedMeta.balanceAfter = nextBalance;
    mergedMeta.debitedTokens = tokensToDebit;

    const updateResult = await tx.user.updateMany({
      where: {
        id: userId,
        updatedAt: user.updatedAt,
        aiTokenBalance: {
          gte: tokensToDebit,
        },
      },
      data: { aiTokenBalance: nextBalance },
    });

    if (updateResult.count !== 1) {
      const latestUser = await tx.user.findUnique({ where: { id: userId } });
      const latestEffectiveTokens = latestUser
        ? getEffectiveTokens({
            aiTokenBalance: latestUser.aiTokenBalance ?? 0,
            aiTokenResetAt: latestUser.aiTokenResetAt,
            aiTokenRenewalAt: latestUser.aiTokenRenewalAt,
          })
        : 0;
      console.warn("AI token debit transaction conflict", {
        userId,
        feature,
        requestId: requestId ?? null,
        latestEffectiveTokens,
        requestedTokens: tokensToDebit,
      });
      throw createHttpError(403, "AI_TOKENS_INSUFFICIENT", { message: "No tienes tokens IA" });
    }

    try {
      await persistAiUsageLog({
        prisma: tx,
        userId,
        feature,
        model,
        provider: "openai",
        usage: null,
        totals: usage,
        costCents,
        currency: "usd",
        requestId: requestId ?? undefined,
        meta: mergedMeta,
        mode: "AI",
        throwOnError: true,
      });
    } catch (error) {
      const typedError = error as { code?: string };
      if (typedError.code === "P2002" && requestId) {
        const existing = await tx.aiUsageLog.findFirst({
          where: {
            userId,
            feature,
            requestId,
            mode: "AI",
          },
          orderBy: { createdAt: "desc" },
        });
        if (existing) {
          const existingMeta =
            existing.meta && typeof existing.meta === "object" && !Array.isArray(existing.meta)
              ? (existing.meta as Record<string, unknown>)
              : undefined;
          const existingBalanceAfter =
            typeof existingMeta?.balanceAfter === "number" ? Math.max(0, existingMeta.balanceAfter) : null;
          console.info("AI token debit transaction idempotent replay", {
            userId,
            feature,
            requestId,
          });
          return {
            balance: existingBalanceAfter ?? nextBalance,
            debitedTokens: 0,
            idempotentReplay: true,
          };
        }
      }
      throw error;
    }

    const updatedUser = await tx.user.findUnique({ where: { id: userId } });
    if (!updatedUser) {
      throw createHttpError(404, "USER_NOT_FOUND");
    }

    console.info("AI token debit transaction committed", {
      userId,
      feature,
      requestId: requestId ?? null,
      balanceBefore: effectiveTokens,
      balanceAfter: updatedUser.aiTokenBalance,
      debitedTokens: tokensToDebit,
    });

    return {
      balance: updatedUser.aiTokenBalance,
      debitedTokens: tokensToDebit,
      idempotentReplay: false,
    };
  };

  if ("$transaction" in prisma && typeof prisma.$transaction === "function") {
    return prisma.$transaction(async (tx) => runDebit(tx));
  }

  return runDebit(prisma);
}

export async function chargeAiUsage(params: ChargeAiUsageParams) {
  const { prisma, pricing, user, feature, execute, createHttpError } = params;

  if (!user.isAdminOverride && user.plan === "FREE") {
    throw createHttpError(403, "NOT_PRO");
  }

  if (!user.isAdminOverride && getEffectiveTokens(user) <= 0) {
    throw createHttpError(403, "AI_TOKENS_EXHAUSTED");
  }

  if (!user.isAdminOverride && getEffectiveTokens(user) < getFeatureEstimatedTokenCost(feature)) {
    throw createHttpError(403, "AI_TOKENS_INSUFFICIENT");
  }

  const result = await execute();
  const { costCents, totals, normalizedModel, meta } = buildChargeDetails({
    pricing,
    model: result.model,
    usage: result.usage,
    meta: undefined,
    feature,
    userId: user.id,
  });

  const charging = await debitAiTokensTx(
    prisma,
    user.id,
    {
      feature,
      model: normalizedModel,
      usage: totals,
      costCents,
      meta,
      requestId: result.requestId ?? undefined,
    },
    createHttpError
  );

  return {
    payload: result.payload,
    tokensSpent: charging.debitedTokens,
    costCents,
    balance: charging.balance,
    balanceAfter: charging.balance,
    idempotentReplay: charging.idempotentReplay,
    totalTokens: totals.totalTokens,
    model: normalizedModel,
    usage: totals,
    balanceBefore: getEffectiveTokens(user),
  };
}

export async function chargeAiUsageForResult(params: ChargeAiUsageForResultParams) {
  const { prisma, pricing, user, feature, result, meta, createHttpError } = params;

  if (!user.isAdminOverride && user.plan === "FREE") {
    throw createHttpError(403, "NOT_PRO");
  }

  if (!user.isAdminOverride && getEffectiveTokens(user) <= 0) {
    throw createHttpError(403, "AI_TOKENS_EXHAUSTED");
  }

  if (!user.isAdminOverride && getEffectiveTokens(user) < getFeatureEstimatedTokenCost(feature)) {
    throw createHttpError(403, "AI_TOKENS_INSUFFICIENT");
  }

  const { costCents, totals, normalizedModel, meta: mergedMeta } = buildChargeDetails({
    pricing,
    model: result.model,
    usage: result.usage,
    meta,
    feature,
    userId: user.id,
  });

  const charging = await debitAiTokensTx(
    prisma,
    user.id,
    {
      feature,
      model: normalizedModel,
      usage: totals,
      costCents,
      meta: mergedMeta,
      requestId: result.requestId ?? undefined,
    },
    createHttpError
  );

  return {
    payload: result.payload,
    tokensSpent: charging.debitedTokens,
    costCents,
    balance: charging.balance,
    balanceAfter: charging.balance,
    idempotentReplay: charging.idempotentReplay,
    totalTokens: totals.totalTokens,
    model: normalizedModel,
    usage: totals,
    balanceBefore: getEffectiveTokens(user),
  };
}
