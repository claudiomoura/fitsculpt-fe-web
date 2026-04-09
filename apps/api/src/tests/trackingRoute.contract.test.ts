import assert from "node:assert/strict";
import Fastify from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { registerTrackingRoutes } from "../routes/tracking.js";

function createApp() {
  const app = Fastify();
  const persistedTracking = new Map<string, unknown>();

  registerTrackingRoutes(app, {
    prisma: {
      userProfile: {
        upsert: async ({ where, data, create }) => {
          const tracking = data?.tracking ?? create?.tracking;
          persistedTracking.set(where.userId, tracking);
          return { tracking };
        },
        update: async ({ where, data }) => {
          persistedTracking.set(where.userId, data.tracking);
          return { tracking: data.tracking };
        },
      },
    },
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
          weeklyCoach: {
            checkIns: {
              "weekly_coach_2026-04-13": {
                checkInId: "weekly_coach_2026-04-13:req_1",
                checkInState: "submitted",
              },
            },
          },
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

const replaceResponse = await app.inject({
  method: "PUT",
  url: "/tracking",
  payload: {
    checkins: [
      {
        id: "checkin-1",
        date: "2026-04-19",
        weightKg: 80.4,
        chestCm: 100,
        waistCm: 84,
        hipsCm: 95,
        bicepsCm: 35,
        thighCm: 56,
        calfCm: 38,
        neckCm: 40,
        bodyFatPercent: 18,
        energy: 4,
        hunger: 2,
        notes: "solid week",
        recommendation: "stay the course",
        frontPhotoUrl: null,
        sidePhotoUrl: null,
      },
    ],
    foodLog: [],
    workoutLog: [],
    mealLog: [],
  },
});

assert.equal(replaceResponse.statusCode, 200);
assert.equal(replaceResponse.json().checkins.length, 1);
assert.equal(
  replaceResponse.json().weeklyCoach.checkIns["weekly_coach_2026-04-13"].checkInState,
  "submitted",
  "PUT /tracking should preserve weekly coach ownership when updating other tracking collections",
);

await app.close();
console.log("tracking route contract test passed");
