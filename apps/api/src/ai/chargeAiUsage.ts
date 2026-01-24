import type { Prisma, PrismaClient } from "@prisma/client";
import { calculateCostCents, type AiPricingMap } from "./pricing.js";

type AiUsageUser = {
  id: string;
  subscriptionPlan: string;
  aiTokenBalance: number;
};

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
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

type UsageTotals = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

function buildUsageTotals(usage?: OpenAiUsage | null): UsageTotals {
  return {
    promptTokens: Math.max(0, usage?.prompt_tokens ?? 0),
    completionTokens: Math.max(0, usage?.completion_tokens ?? 0),
    totalTokens: Math.max(0, usage?.total_tokens ?? 0),
  };
}

function computeCostCents(args: {
  pricing: AiPricingMap;
  model?: string | null;
  usage?: OpenAiUsage | null;
}) {
  const totals = buildUsageTotals(args.usage);
  const pricingResult = calculateCostCents({
    pricing: args.pricing,
    model: args.model,
    promptTokens: totals.promptTokens,
    completionTokens: totals.completionTokens,
  });

  return {
    ...totals,
    costCents: pricingResult.costCents,
    pricingFound: pricingResult.pricingFound,
  };
}

async function chargeUserForAiUsage(args: {
  prisma: PrismaClient;
  user: AiUsageUser;
  feature: string;
  model: string;
  usage: UsageTotals;
  costCents: number;
  pricingFound: boolean;
  usageProvided: boolean;
  requestId?: string | null;
}) {
  const { prisma, user, feature, model, usage, costCents, pricingFound, usageProvided, requestId } = args;
  const shouldCharge = usageProvided && costCents > 0;
  const chargeAmount = shouldCharge ? costCents : 0;
  const nextBalance = Math.max(0, user.aiTokenBalance - chargeAmount);
  const meta: Record<string, unknown> = {};

  if (!usageProvided) {
    meta.usageMissing = true;
  }
  if (!pricingFound) {
    meta.pricingMissing = true;
  }
  if (chargeAmount > user.aiTokenBalance) {
    meta.overdraw = true;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { aiTokenBalance: nextBalance },
    }),
    prisma.aiUsageLog.create({
      data: {
        userId: user.id,
        feature,
        model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        costCents,
        currency: "usd",
        requestId: requestId ?? undefined,
        meta: Object.keys(meta).length > 0 ? (meta as Prisma.InputJsonValue) : undefined,
      },
    }),
  ]);

  return {
    balance: nextBalance,
    chargeAmount,
    overdrawn: chargeAmount > user.aiTokenBalance,
  };
}

export async function chargeAiUsage(params: ChargeAiUsageParams) {
  const { prisma, pricing, user, feature, execute, createHttpError } = params;

  if (user.subscriptionPlan !== "PRO") {
    throw createHttpError(403, "NOT_PRO");
  }

  if (user.aiTokenBalance <= 0) {
    throw createHttpError(402, "INSUFFICIENT_TOKENS");
  }

  const result = await execute();
  const usageProvided = Boolean(result.usage);
  if (!usageProvided) {
    console.warn("AI usage missing from provider response", { feature, userId: user.id });
  }
  const costSummary = computeCostCents({ pricing, model: result.model, usage: result.usage });
  const charging = await chargeUserForAiUsage({
    prisma,
    user,
    feature,
    model: result.model ?? "unknown",
    usage: {
      promptTokens: costSummary.promptTokens,
      completionTokens: costSummary.completionTokens,
      totalTokens: costSummary.totalTokens,
    },
    costCents: usageProvided ? costSummary.costCents : 0,
    pricingFound: costSummary.pricingFound,
    usageProvided,
    requestId: result.requestId ?? undefined,
  });

  if (charging.overdrawn) {
    throw createHttpError(402, "INSUFFICIENT_TOKENS", {
      required: charging.chargeAmount,
      balance: user.aiTokenBalance,
    });
  }

  return {
    payload: result.payload,
    tokensSpent: charging.chargeAmount,
    costCents: costSummary.costCents,
    balance: charging.balance,
  };
}
