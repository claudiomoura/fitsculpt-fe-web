import assert from "node:assert/strict";
import { chargeAiUsage, chargeAiUsageForResult } from "../ai/chargeAiUsage.js";

type UsageLogRecord = {
  userId: string;
  feature: string;
  requestId?: string;
  mode: string;
  meta?: Record<string, unknown>;
};

function createHttpError(statusCode: number, code: string, debug?: Record<string, unknown>) {
  const error = new Error(code) as Error & {
    statusCode: number;
    code: string;
    debug?: Record<string, unknown>;
  };
  error.statusCode = statusCode;
  error.code = code;
  error.debug = debug;
  return error;
}

function buildPrismaMock(initialBalance: number) {
  const state = {
    user: {
      id: "u1",
      aiTokenBalance: initialBalance,
      aiTokenResetAt: new Date(Date.now() + 60_000),
      aiTokenRenewalAt: null as Date | null,
    },
    logs: [] as UsageLogRecord[],
    updateCalls: 0,
  };

  const tx = {
    user: {
      findUnique: async () => ({ ...state.user }),
      update: async ({ data }: { data: { aiTokenBalance: number } }) => {
        state.updateCalls += 1;
        state.user.aiTokenBalance = data.aiTokenBalance;
        return { ...state.user };
      },
    },
    aiUsageLog: {
      findFirst: async ({ where }: { where: { userId: string; feature: string; requestId?: string; mode: string } }) => {
        if (!where.requestId) return null;
        const found = [...state.logs]
          .reverse()
          .find(
            (entry) =>
              entry.userId === where.userId &&
              entry.feature === where.feature &&
              entry.requestId === where.requestId &&
              entry.mode === where.mode
          );
        return found
          ? {
              ...found,
              createdAt: new Date(),
            }
          : null;
      },
      create: async ({ data }: { data: UsageLogRecord }) => {
        state.logs.push(data);
        return data;
      },
    },
  };

  const prisma = {
    $transaction: async (cb: (trx: typeof tx) => Promise<unknown>) => cb(tx),
  };

  return { prisma, state };
}

async function run() {
  const pricing = {
    "gpt-4o-mini": {
      inputPer1k: 0.01,
      outputPer1k: 0.03,
    },
  };

  {
    const { prisma, state } = buildPrismaMock(500);

    const first = await chargeAiUsageForResult({
      prisma: prisma as never,
      pricing,
      user: {
        id: "u1",
        plan: "PRO",
        aiTokenBalance: 500,
        aiTokenResetAt: state.user.aiTokenResetAt,
        aiTokenRenewalAt: null,
      },
      feature: "tip",
      result: {
        payload: { ok: true },
        model: "gpt-4o-mini",
        requestId: "req-1",
        usage: {
          prompt_tokens: 40,
          completion_tokens: 80,
          total_tokens: 120,
        },
      },
      createHttpError,
    });

    assert.equal(first.balanceAfter, 380);
    assert.equal(first.tokensSpent, 120);
    assert.equal(first.idempotentReplay, false);

    const replay = await chargeAiUsageForResult({
      prisma: prisma as never,
      pricing,
      user: {
        id: "u1",
        plan: "PRO",
        aiTokenBalance: 500,
        aiTokenResetAt: state.user.aiTokenResetAt,
        aiTokenRenewalAt: null,
      },
      feature: "tip",
      result: {
        payload: { ok: true },
        model: "gpt-4o-mini",
        requestId: "req-1",
        usage: {
          prompt_tokens: 40,
          completion_tokens: 80,
          total_tokens: 120,
        },
      },
      createHttpError,
    });

    assert.equal(replay.balanceAfter, 380);
    assert.equal(replay.tokensSpent, 0);
    assert.equal(replay.idempotentReplay, true);
    assert.equal(state.updateCalls, 1);
  }

  {
    const { prisma, state } = buildPrismaMock(500);

    await assert.rejects(
      () =>
        chargeAiUsage({
          prisma: prisma as never,
          pricing,
          user: {
            id: "u1",
            plan: "PRO",
            aiTokenBalance: 500,
            aiTokenResetAt: state.user.aiTokenResetAt,
            aiTokenRenewalAt: null,
          },
          feature: "tip",
          execute: async () => {
            throw createHttpError(500, "AI_UPSTREAM_FAILURE");
          },
          createHttpError,
        }),
      (error: unknown) => (error as { code?: string }).code === "AI_UPSTREAM_FAILURE"
    );

    assert.equal(state.updateCalls, 0);
    assert.equal(state.user.aiTokenBalance, 500);
  }

  console.log("chargeAiUsage tests passed");
}

void run();
