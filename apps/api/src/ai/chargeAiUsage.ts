import type { PrismaClient } from "@prisma/client";
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

export async function chargeAiUsage(params: ChargeAiUsageParams) {
  const { prisma, pricing, user, feature, execute, createHttpError } = params;

  if (user.subscriptionPlan !== "PRO") {
    throw createHttpError(403, "NOT_PRO");
  }

  if (user.aiTokenBalance <= 0) {
    throw createHttpError(403, "INSUFFICIENT_TOKENS");
  }

  const result = await execute();
  const usage = result.usage ?? {};
  const promptTokens = Math.max(0, usage.prompt_tokens ?? 0);
  const completionTokens = Math.max(0, usage.completion_tokens ?? 0);
  const totalTokens = Math.max(0, usage.total_tokens ?? 0);
  const tokensSpent = totalTokens;

  const pricingResult = calculateCostCents({
    pricing,
    model: result.model,
    promptTokens,
    completionTokens,
  });

  const meta: Record<string, unknown> = {};
  if (!result.usage) {
    meta.usageMissing = true;
  }
  if (!pricingResult.pricingFound) {
    meta.pricingMissing = true;
  }

  const nextBalance = Math.max(0, user.aiTokenBalance - tokensSpent);
  if (tokensSpent > user.aiTokenBalance) {
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
        model: result.model ?? "unknown",
        promptTokens,
        completionTokens,
        totalTokens: tokensSpent,
        costCents: pricingResult.costCents,
        currency: "usd",
        requestId: result.requestId ?? undefined,
        meta: Object.keys(meta).length > 0 ? (meta as Record<string, unknown>) : undefined,
      },
    }),
  ]);

  return {
    payload: result.payload,
    tokensSpent,
    costCents: pricingResult.costCents,
    balance: nextBalance,
  };
}
