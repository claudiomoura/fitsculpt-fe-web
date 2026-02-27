import assert from "node:assert/strict";
import { chargeAiUsage, chargeAiUsageForResult } from "../ai/chargeAiUsage.js";

type UsageLogRecord = {
  userId: string;
  feature: string;
  requestId?: string;
  mode: string;
  meta?: Record<string, unknown>;
};

type UserUpdateManyWhere = {
  id: string;
  updatedAt?: Date;
  aiTokenBalance?: { gte: number };
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
      updatedAt: new Date(),
    },
    logs: [] as UsageLogRecord[],
    updateCalls: 0,
    updateManyCalls: 0,
    throwOnLogCreateCode: null as string | null,
  };

  const tx = {
    user: {
      findUnique: async () => ({ ...state.user }),
      update: async ({ data }: { data: { aiTokenBalance: number } }) => {
        state.updateCalls += 1;
        state.user.aiTokenBalance = data.aiTokenBalance;
        state.user.updatedAt = new Date(state.user.updatedAt.getTime() + 1);
        return { ...state.user };
      },
      updateMany: async ({ where, data }: { where: UserUpdateManyWhere; data: { aiTokenBalance: number } }) => {
        state.updateManyCalls += 1;
        if (where.updatedAt && where.updatedAt.getTime() !== state.user.updatedAt.getTime()) {
          return { count: 0 };
        }
        const whereBalance = where.aiTokenBalance;
        if (whereBalance && typeof whereBalance === "object" && "gte" in whereBalance) {
          if (state.user.aiTokenBalance < whereBalance.gte) {
            return { count: 0 };
          }
        }
        state.user.aiTokenBalance = data.aiTokenBalance;
        state.user.updatedAt = new Date(state.user.updatedAt.getTime() + 1);
        return { count: 1 };
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
        if (state.throwOnLogCreateCode) {
          const error = new Error("log create failed") as Error & { code?: string };
          error.code = state.throwOnLogCreateCode;
          throw error;
        }
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
    assert.equal(state.updateManyCalls, 1);
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

  {
    const { prisma, state } = buildPrismaMock(100);

    await assert.rejects(
      () =>
        chargeAiUsageForResult({
          prisma: prisma as never,
          pricing,
          user: {
            id: "u1",
            plan: "PRO",
            aiTokenBalance: 100,
            aiTokenResetAt: state.user.aiTokenResetAt,
            aiTokenRenewalAt: null,
          },
          feature: "tip",
          result: {
            payload: { ok: true },
            model: "gpt-4o-mini",
            requestId: "req-2",
            usage: {
              prompt_tokens: 20,
              completion_tokens: 100,
              total_tokens: 120,
            },
          },
          createHttpError,
        }),
      (error: unknown) => (error as { code?: string }).code === "INSUFFICIENT_TOKENS"
    );

    assert.equal(state.user.aiTokenBalance, 100);
    assert.equal(state.logs.length, 0);
  }

  {
    const { prisma, state } = buildPrismaMock(500);
    state.throwOnLogCreateCode = "P2002";
    state.logs.push({
      userId: "u1",
      feature: "tip",
      requestId: "req-dup",
      mode: "AI",
      meta: {
        balanceAfter: 380,
      },
    });

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
        requestId: "req-dup",
        usage: {
          prompt_tokens: 40,
          completion_tokens: 80,
          total_tokens: 120,
        },
      },
      createHttpError,
    });

    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.tokensSpent, 0);
    assert.equal(replay.balanceAfter, 380);
  }

  {
    const { prisma, state } = buildPrismaMock(150);

    const baseParams = {
      prisma: prisma as never,
      pricing,
      user: {
        id: "u1",
        plan: "PRO",
        aiTokenBalance: 150,
        aiTokenResetAt: state.user.aiTokenResetAt,
        aiTokenRenewalAt: null,
      },
      feature: "tip",
      createHttpError,
    };

    const [a, b] = await Promise.allSettled([
      chargeAiUsageForResult({
        ...baseParams,
        result: {
          payload: { ok: true },
          model: "gpt-4o-mini",
          requestId: "req-concurrent-a",
          usage: {
            prompt_tokens: 40,
            completion_tokens: 60,
            total_tokens: 100,
          },
        },
      }),
      chargeAiUsageForResult({
        ...baseParams,
        result: {
          payload: { ok: true },
          model: "gpt-4o-mini",
          requestId: "req-concurrent-b",
          usage: {
            prompt_tokens: 30,
            completion_tokens: 70,
            total_tokens: 100,
          },
        },
      }),
    ]);

    const fulfilledCount = [a, b].filter((entry) => entry.status === "fulfilled").length;
    const rejected = [a, b].find((entry) => entry.status === "rejected") as PromiseRejectedResult | undefined;

    assert.equal(fulfilledCount, 1);
    assert.equal((rejected?.reason as { code?: string } | undefined)?.code, "INSUFFICIENT_TOKENS");
    assert.equal(state.user.aiTokenBalance, 50);
    assert.equal(state.logs.length, 1);
  }

  console.log("chargeAiUsage tests passed");
}

void run();
