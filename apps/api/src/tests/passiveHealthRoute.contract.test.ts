import assert from "node:assert/strict";
import Fastify from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { registerPassiveHealthRoutes } from "../routes/passiveHealth.js";

function createApp() {
  const app = Fastify();
  const persistedTracking = new Map<string, unknown>();

  registerPassiveHealthRoutes(app, {
    prisma: {
      userProfile: {
        upsert: async ({ where, data, create }) => {
          const tracking = data?.tracking ?? create?.tracking;
          persistedTracking.set(where.userId, tracking);
          return { tracking };
        },
      },
    },
    dbNull: Prisma.DbNull,
    requireUser: async () => ({ id: "user_test" } as any),
    getOrCreateProfile: async (userId: string) => ({
      profile: {},
      tracking:
        persistedTracking.get(userId) ?? {
          checkins: [],
          foodLog: [],
          workoutLog: [],
          mealLog: [],
          passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
        },
    }),
    handleRequestError: (reply, error) => {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "INVALID_INPUT" });
      }
      return reply.status(500).send({ error: (error as Error).message || "INTERNAL_ERROR" });
    },
  });

  return app;
}

const app = createApp();

const createResponse = await app.inject({
  method: "POST",
  url: "/tracking/health/snapshots",
  payload: {
    id: "manual-2026-02-22",
    date: "2026-02-22",
    source: "manual",
    provider: "Manual sync",
    steps: 8400,
    activeCalories: 310,
    activeMinutes: 36,
    sleepHours: 7.4,
    restingHeartRate: 60,
    exerciseSessions: 0,
    note: "Manual sync",
    syncedAt: "2026-02-22T08:00:00.000Z",
  },
});

assert.equal(createResponse.statusCode, 201);
assert.equal(createResponse.json().snapshots.length, 1);

const readResponse = await app.inject({ method: "GET", url: "/tracking/health" });
assert.equal(readResponse.statusCode, 200);
assert.equal(readResponse.json().snapshots[0].steps, 8400);

const replaceResponse = await app.inject({
  method: "PUT",
  url: "/tracking/health",
  payload: {
    snapshots: [
      {
        id: "demo-2026-02-21",
        date: "2026-02-21",
        source: "demo",
        provider: "Demo Sync",
        steps: 10200,
        activeCalories: 420,
        activeMinutes: 52,
        sleepHours: 7.9,
        restingHeartRate: 58,
        exerciseSessions: 1,
        note: "Demo sync",
        syncedAt: "2026-02-21T08:00:00.000Z",
      },
    ],
    lastSyncAt: "2026-02-21T08:00:00.000Z",
    lastSyncSource: "demo",
  },
});

assert.equal(replaceResponse.statusCode, 200);
assert.equal(replaceResponse.json().lastSyncSource, "demo");
assert.equal(replaceResponse.json().snapshots[0].provider, "Demo Sync");

await app.close();
console.log("passive health route contract test passed");
