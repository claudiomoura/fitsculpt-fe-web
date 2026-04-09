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
                weekContext: {
                  planWeekId: "weekly_coach_2026-04-13",
                  weekIndex: 1,
                  state: "check_in_due",
                  validFrom: "2026-04-13",
                  validTo: "2026-04-19",
                  weeklyObjective: "hit all planned sessions",
                },
                draftAnswers: {
                  trainingSessionsCompleted: 3,
                  trainingSessionsPlanned: 3,
                  nutritionAdherenceScore: 4,
                },
                requiredFields: ["trainingSessionsCompleted"],
                completionState: {
                  completedFields: ["trainingSessionsCompleted"],
                  missingRequiredFields: [],
                  isComplete: true,
                },
                deadline: "2026-04-19T03:00:00.000Z",
                nextCta: "awaiting_adaptation_generation",
                updatedAt: "2026-04-19T10:00:00.000Z",
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

const invalidWeeklyCoachResponse = await app.inject({
  method: "PUT",
  url: "/tracking",
  payload: {
    checkins: [],
    foodLog: [],
    workoutLog: [],
    mealLog: [],
    weeklyCoach: {
      checkIns: {
        weekly_coach_2026_04_20: {
          checkInId: null,
          checkInState: "draft",
          weekContext: {
            planWeekId: "weekly_coach_2026-04-27",
            weekIndex: 2,
            state: "check_in_due",
            validFrom: "2026-04-20",
            validTo: "2026-04-26",
            weeklyObjective: null,
          },
          draftAnswers: {},
          requiredFields: [],
          completionState: {
            completedFields: [],
            missingRequiredFields: [],
            isComplete: false,
          },
          deadline: null,
          nextCta: null,
          updatedAt: null,
        },
      },
    },
  },
});

assert.equal(invalidWeeklyCoachResponse.statusCode, 400, "PUT /tracking should reject invalid weekly coach ownership payloads at the backend boundary");

await app.close();
console.log("tracking route contract test passed");
