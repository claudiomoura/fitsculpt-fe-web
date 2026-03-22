import assert from "node:assert/strict";
import Fastify from "fastify";
import { z } from "zod";
import { registerFutureProjectionRoutes } from "../routes/futureProjection.js";

function createApp() {
  const app = Fastify();
  const persistedProfiles = new Map<string, unknown>();

  registerFutureProjectionRoutes(app, {
    prisma: {
      trainingPlan: {
        findFirst: async () => ({ daysPerWeek: 4 }),
      },
      userProfile: {
        update: async ({ where, data }) => {
          persistedProfiles.set(where.userId, data.profile);
          return { profile: data.profile };
        },
      },
    },
    requireUser: async () => ({ id: "user_projection_route" } as any),
    getOrCreateProfile: async (userId: string) => ({
      profile: persistedProfiles.get(userId) ?? { goal: "cut" },
      tracking: {
        checkins: [
          { id: "p1", date: "2026-02-10", weightKg: 82, chestCm: 100, waistCm: 90, hipsCm: 98, bicepsCm: 35, thighCm: 56, calfCm: 38, neckCm: 40, bodyFatPercent: 20, energy: 3, hunger: 3, notes: "", recommendation: "", frontPhotoUrl: null, sidePhotoUrl: null },
          { id: "p2", date: "2026-02-22", weightKg: 81.3, chestCm: 100, waistCm: 88.5, hipsCm: 98, bicepsCm: 35, thighCm: 56, calfCm: 38, neckCm: 40, bodyFatPercent: 19.5, energy: 4, hunger: 3, notes: "", recommendation: "", frontPhotoUrl: null, sidePhotoUrl: null },
        ],
        passiveData: {
          snapshots: [
            { id: "ph1", date: "2026-02-20", source: "demo", provider: "Demo Sync", steps: 8500, activeCalories: 280, activeMinutes: 30, sleepHours: 7.2, restingHeartRate: 60, exerciseSessions: 0, note: "", syncedAt: "2026-02-20T08:00:00.000Z" },
          ],
          lastSyncAt: "2026-02-20T08:00:00.000Z",
          lastSyncSource: "demo",
        },
        foodLog: [],
        mealLog: [
          { id: "m1", date: "2026-02-20", mealKey: "meal-1", mealType: "lunch", title: "Almuerzo", calories: 620, protein: 35, carbs: 70, fats: 18, completedAt: "2026-02-20T13:00:00.000Z" },
        ],
        workoutLog: [{ id: "w1", date: "2026-02-21", name: "Upper", durationMin: 45, notes: "Good" }],
      },
    }),
    handleRequestError: (reply, error) => {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "INVALID_INPUT" });
      }
      return reply.status(500).send({ error: (error as Error).message || "INTERNAL_ERROR" });
    },
  });

  return { app, persistedProfiles };
}

const { app, persistedProfiles } = createApp();

const projectionResponse = await app.inject({ method: "GET", url: "/projection/future-self" });
assert.equal(projectionResponse.statusCode, 200);
const projectionPayload = projectionResponse.json();
assert.equal(projectionPayload.horizons.length, 3);
assert.equal(projectionPayload.experiment.id, "future-self-rct-v1");

const statusResponse = await app.inject({ method: "GET", url: "/research/rct/status" });
assert.equal(statusResponse.statusCode, 200);
const statusPayload = statusResponse.json();
assert.equal(statusPayload.status, "active");
assert.equal(typeof statusPayload.group, "string");

const eventResponse = await app.inject({
  method: "POST",
  url: "/research/rct/events",
  payload: {
    event: "projection_viewed",
    context: { origin: "contract_test", horizonMonths: 3 },
  },
});

assert.equal(eventResponse.statusCode, 200);
assert.equal(eventResponse.json().ok, true);
assert.equal(typeof persistedProfiles.get("user_projection_route"), "object");

await app.close();
console.log("future projection route contract test passed");
