import assert from "node:assert/strict";
import { futureProjectionResponseSchema } from "../schemas/futureProjection.js";
import {
  buildFutureProjection,
  buildRctMetricSnapshot,
  ensureRctAssignment,
} from "../services/futureProjection.js";

const tracking = {
  checkins: [
    {
      id: "c1",
      date: "2026-02-10",
      weightKg: 82,
      chestCm: 100,
      waistCm: 89,
      hipsCm: 98,
      bicepsCm: 35,
      thighCm: 56,
      calfCm: 38,
      neckCm: 40,
      bodyFatPercent: 20,
      energy: 3,
      hunger: 3,
      notes: "",
      recommendation: "",
      frontPhotoUrl: null,
      sidePhotoUrl: null,
    },
    {
      id: "c2",
      date: "2026-02-21",
      weightKg: 81.2,
      chestCm: 100,
      waistCm: 88,
      hipsCm: 98,
      bicepsCm: 35,
      thighCm: 56,
      calfCm: 38,
      neckCm: 40,
      bodyFatPercent: 19.5,
      energy: 4,
      hunger: 3,
      notes: "",
      recommendation: "",
      frontPhotoUrl: null,
      sidePhotoUrl: null,
    },
  ],
  foodLog: [],
  mealLog: [
    {
      id: "m1",
      date: "2026-02-18",
      mealKey: "meal-1",
      mealType: "lunch",
      title: "Almuerzo",
      calories: 650,
      protein: 34,
      carbs: 70,
      fats: 18,
      completedAt: "2026-02-18T13:00:00.000Z",
    },
    {
      id: "m2",
      date: "2026-02-20",
      mealKey: "meal-2",
      mealType: "dinner",
      title: "Cena",
      calories: 610,
      protein: 35,
      carbs: 62,
      fats: 17,
      completedAt: "2026-02-20T20:00:00.000Z",
    },
  ],
  workoutLog: [
    { id: "w1", date: "2026-02-17", name: "Upper", durationMin: 45, notes: "" },
    { id: "w2", date: "2026-02-20", name: "Lower", durationMin: 50, notes: "" },
    { id: "w3", date: "2026-02-22", name: "Full body", durationMin: 40, notes: "" },
  ],
  passiveData: {
    snapshots: [
      {
        id: "ph1",
        date: "2026-02-19",
        source: "demo",
        provider: "Demo Sync",
        steps: 9100,
        activeCalories: 290,
        activeMinutes: 33,
        sleepHours: 7.3,
        restingHeartRate: 60,
        exerciseSessions: 0,
        note: "",
        syncedAt: "2026-02-19T08:00:00.000Z",
      },
    ],
    lastSyncAt: "2026-02-19T08:00:00.000Z",
    lastSyncSource: "demo",
  },
};

const assignment = ensureRctAssignment({}, "user_projection_test", new Date("2026-02-23T12:00:00.000Z"));

const response = buildFutureProjection(
  {
    userId: "user_projection_test",
    goal: "cut",
    tracking,
    targetSessionsPerWeek: 4,
    now: new Date("2026-02-23T12:00:00.000Z"),
  },
  assignment.assignment,
);

const parsed = futureProjectionResponseSchema.parse(response);

assert.equal(parsed.horizons.length, 3);
assert.equal(parsed.horizons[0].months, 3);
assert.equal(parsed.inputs.targetSessionsPerWeek, 4);
assert.equal(parsed.experiment.id, "future-self-rct-v1");
assert.equal(parsed.disclaimer.length > 10, true);

if (parsed.experiment.projectionMode === "minimal") {
  assert.equal(parsed.horizons[0].scenarios.length, 1);
} else {
  assert.equal(parsed.horizons[0].scenarios.length, 2);
}

const metric = buildRctMetricSnapshot(
  tracking,
  {
    adaptiveEngine: {
      weeklyReviews: {
        "2026-02-16": {
          version: 1,
          updatedAt: "2026-02-23T00:00:00.000Z",
          review: {
            recommendations: [
              { decision: "accepted" },
              { decision: "rejected" },
            ],
          },
        },
      },
    },
  },
  new Date("2026-02-23T12:00:00.000Z"),
);

assert.equal(metric.weeklyActivitySessions >= 0, true);
assert.equal(metric.adherenceScore >= 0 && metric.adherenceScore <= 1, true);
assert.equal(metric.recommendationAcceptanceRate, 0.5);

console.log("future projection contract test passed");
