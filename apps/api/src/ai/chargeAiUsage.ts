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

type AiExecutionResult = {
  payload: Record<string, unknown>;
  model?: string | null;
  usage?: OpenAiUsage | null;
  requestId?: string | null;
};

type ChargeAiUsageParams = {
  prisma: PrismaClient;
  pricing: AiPricingMap;
  user: AiUsageUser;
  feature: string;
  execute: () => Promise<AiExecutionResult>;
  createHttpError: (statusCode: number, code: string, debug?: Record<string, unknown>) => Error;
};

type ChargeAiUsageForResultParams = {
  prisma: PrismaClient;
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

function getEffectiveTokens(user: { aiTokenBalance: number; aiTokenResetAt: Date | null; aiTokenRenewalAt: Date | null }) {
  const expiresAt = user.aiTokenResetAt ?? user.aiTokenRenewalAt;
  if (!expiresAt) return 0;
  if (expiresAt.getTime() < Date.now()) return 0;
  return Math.max(0, user.aiTokenBalance);
}

function buildUsageTotals(usage?: OpenAiUsage | null): UsageTotals {
  const promptTokens = Math.max(0, usage?.prompt_tokens ?? usage?.input_tokens ?? 0);
  const completionTokens = Math.max(0, usage?.completion_tokens ?? usage?.output_tokens ?? 0);
  const totalTokens = Math.max(0, usage?.total_tokens ?? promptTokens + completionTokens);
  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
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
  prisma: PrismaClient,
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
  return prisma.$transaction(async (tx) => {
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
      throw createHttpError(402, "INSUFFICIENT_TOKENS", { message: "No tienes tokens IA" });
    }

    const nextBalance = Math.max(0, effectiveTokens - costCents);
    const mergedMeta = { ...(meta ?? {}) };
    if (costCents > effectiveTokens) {
      mergedMeta.overdraw = true;
    }
    const logMeta = Object.keys(mergedMeta).length > 0 ? (mergedMeta as Prisma.InputJsonValue) : undefined;

    const [updatedUser] = await Promise.all([
      tx.user.update({
        where: { id: userId },
        data: { aiTokenBalance: nextBalance },
      }),
      tx.aiUsageLog.create({
        data: {
          userId,
          feature,
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          costCents,
          currency: "usd",
          requestId: requestId ?? undefined,
          meta: logMeta,
        },
      }),
    ]);

    return {
      balance: updatedUser.aiTokenBalance,
    };
  });
}

export async function chargeAiUsage(params: ChargeAiUsageParams) {
  const { prisma, pricing, user, feature, execute, createHttpError } = params;

  if (!user.isAdminOverride && user.plan === "FREE") {
    throw createHttpError(403, "NOT_PRO");
  }

  if (!user.isAdminOverride && getEffectiveTokens(user) <= 0) {
    throw createHttpError(402, "INSUFFICIENT_TOKENS");
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
    tokensSpent: costCents,
    costCents,
    balance: charging.balance,
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
    throw createHttpError(402, "INSUFFICIENT_TOKENS");
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
    tokensSpent: costCents,
    costCents,
    balance: charging.balance,
    totalTokens: totals.totalTokens,
    model: normalizedModel,
    usage: totals,
    balanceBefore: getEffectiveTokens(user),
  };
}
