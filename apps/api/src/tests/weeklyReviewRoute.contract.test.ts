import assert from "node:assert/strict";
import Fastify from "fastify";
import { z } from "zod";
import { registerWeeklyReviewRoute } from "../routes/weeklyReview.js";

function createApp() {
  const app = Fastify();
  const persistedProfiles = new Map<string, unknown>();

  registerWeeklyReviewRoute(app, {
    prisma: {
      trainingPlan: {
        findFirst: async () => ({ title: "Plan fuerza", daysPerWeek: 4 }),
      },
      nutritionPlan: {
        findFirst: async () => ({ title: "Cut", dailyCalories: 2200 }),
      },
      userProfile: {
        update: async ({ where, data }) => {
          persistedProfiles.set(where.userId, data.profile);
          return { profile: data.profile };
        },
      },
    },
    requireUser: async () => ({ id: "user_test" } as any),
    getOrCreateProfile: async (userId: string) => ({
      profile: persistedProfiles.get(userId) ?? { goal: "cut" },
      tracking: {
        checkins: [
          { id: "p1", date: "2026-02-10", weightKg: 80.6, chestCm: 100, waistCm: 86, hipsCm: 95, bicepsCm: 35, thighCm: 56, calfCm: 38, neckCm: 40, bodyFatPercent: 18, energy: 4, hunger: 2, notes: "", recommendation: "", frontPhotoUrl: null, sidePhotoUrl: null },
          { id: "p2", date: "2026-02-17", weightKg: 79.5, chestCm: 100, waistCm: 84.5, hipsCm: 95, bicepsCm: 35, thighCm: 56, calfCm: 38, neckCm: 40, bodyFatPercent: 18, energy: 2, hunger: 4, notes: "", recommendation: "", frontPhotoUrl: null, sidePhotoUrl: null },
          { id: "p3", date: "2026-02-20", weightKg: 79.1, chestCm: 100, waistCm: 84, hipsCm: 95, bicepsCm: 35, thighCm: 56, calfCm: 38, neckCm: 40, bodyFatPercent: 18, energy: 2, hunger: 4, notes: "", recommendation: "", frontPhotoUrl: null, sidePhotoUrl: null },
        ],
        passiveData: {
          snapshots: [
            { id: "ph1", date: "2026-02-17", source: "demo", provider: "Demo Sync", steps: 8400, activeCalories: 300, activeMinutes: 34, sleepHours: 7.2, restingHeartRate: 60, exerciseSessions: 0, note: "", syncedAt: "2026-02-17T08:00:00.000Z" },
            { id: "ph2", date: "2026-02-18", source: "demo", provider: "Demo Sync", steps: 11200, activeCalories: 420, activeMinutes: 56, sleepHours: 7.9, restingHeartRate: 58, exerciseSessions: 1, note: "", syncedAt: "2026-02-18T08:00:00.000Z" },
          ],
          lastSyncAt: "2026-02-18T08:00:00.000Z",
          lastSyncSource: "demo",
        },
        foodLog: [],
        mealLog: [
          { id: "m1", date: "2026-02-17", mealKey: "meal-1", mealType: "lunch", title: "Almuerzo", calories: 620, protein: 35, carbs: 70, fats: 18, completedAt: "2026-02-17T13:00:00.000Z" },
          { id: "m2", date: "2026-02-18", mealKey: "meal-2", mealType: "dinner", title: "Cena", calories: 580, protein: 32, carbs: 60, fats: 16, completedAt: "2026-02-18T20:00:00.000Z" },
          { id: "m3", date: "2026-02-20", mealKey: "meal-3", mealType: "breakfast", title: "Desayuno", calories: 460, protein: 28, carbs: 50, fats: 14, completedAt: "2026-02-20T08:00:00.000Z" },
        ],
        workoutLog: [{ id: "w1", date: "2026-02-20", name: "Upper", durationMin: 45, notes: "Good" }],
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

const getResponse = await app.inject({ method: "GET", url: "/review/weekly?startDate=2026-02-16&endDate=2026-02-22" });
assert.equal(getResponse.statusCode, 200);
const getPayload = getResponse.json();
assert.equal(Array.isArray(getPayload.recommendations), true);
assert.equal(getPayload.summary.trainingTargetSessions, 4);
assert.equal(getPayload.summary.passiveActiveDays, 2);

const defaultResponse = await app.inject({ method: "GET", url: "/review/weekly" });
assert.equal(defaultResponse.statusCode, 200);
const defaultPayload = defaultResponse.json();
assert.equal(typeof persistedProfiles.get("user_test"), "object", "default weekly review should persist in profile JSON");

const decisionResponse = await app.inject({
  method: "POST",
  url: "/review/weekly/decision",
  payload: {
    weekKey: defaultPayload.summary.weekKey,
    recommendationId: defaultPayload.recommendations[0].id,
    decision: "accepted",
  },
});

assert.equal(decisionResponse.statusCode, 200);
assert.equal(decisionResponse.json().review.recommendations[0].decision, "accepted");

await app.close();
console.log("weekly review route contract test passed");
