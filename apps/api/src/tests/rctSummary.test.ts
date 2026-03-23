import assert from "node:assert/strict";
import { buildRctExperimentSummary } from "../services/rctSummary.js";

const now = new Date("2026-03-22T10:00:00.000Z");

const response = buildRctExperimentSummary(
  [
    {
      profile: {
        research: {
          rct: {
            experimentId: "future-self-rct-v1",
            group: "control",
            events: [
              { event: "recommendation_rejected", timestamp: "2026-03-20T10:00:00.000Z" },
            ],
          },
        },
      },
      tracking: {
        checkins: [
          {
            id: "c1",
            date: "2026-03-15",
            weightKg: 80,
            chestCm: 100,
            waistCm: 88,
            hipsCm: 96,
            bicepsCm: 35,
            thighCm: 55,
            calfCm: 37,
            neckCm: 39,
            bodyFatPercent: 19,
            energy: 3,
            hunger: 3,
            notes: "",
            recommendation: "",
            frontPhotoUrl: null,
            sidePhotoUrl: null,
          },
        ],
        foodLog: [],
        mealLog: [],
        workoutLog: [{ id: "w1", date: "2026-03-21", name: "Upper", durationMin: 40, notes: "" }],
        passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
      },
    },
    {
      profile: {
        research: {
          rct: {
            experimentId: "future-self-rct-v1",
            group: "treatment",
            events: [
              { event: "recommendation_accepted", timestamp: "2026-03-19T10:00:00.000Z" },
              { event: "recommendation_accepted", timestamp: "2026-03-21T10:00:00.000Z" },
            ],
          },
        },
      },
      tracking: {
        checkins: [
          {
            id: "c2",
            date: "2026-03-16",
            weightKg: 75,
            chestCm: 96,
            waistCm: 82,
            hipsCm: 94,
            bicepsCm: 33,
            thighCm: 53,
            calfCm: 36,
            neckCm: 38,
            bodyFatPercent: 17,
            energy: 4,
            hunger: 2,
            notes: "",
            recommendation: "",
            frontPhotoUrl: null,
            sidePhotoUrl: null,
          },
        ],
        foodLog: [],
        mealLog: [{ id: "m1", date: "2026-03-18", mealKey: "m1", mealType: "lunch", title: "Meal", calories: 500, protein: 30, carbs: 50, fats: 15, completedAt: "2026-03-18T13:00:00.000Z" }],
        workoutLog: [
          { id: "w2", date: "2026-03-18", name: "Lower", durationMin: 45, notes: "" },
          { id: "w3", date: "2026-03-21", name: "Full", durationMin: 50, notes: "" },
        ],
        passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
      },
    },
  ],
  { windowWeeks: 4, now },
);

assert.equal(response.experimentId, "future-self-rct-v1");
assert.equal(response.window.days, 28);
assert.equal(response.groups.control.sampleSize, 1);
assert.equal(response.groups.treatment.sampleSize, 1);
assert.equal(response.groups.treatment.recommendationAcceptanceRate, 1);
assert.equal(response.groups.control.recommendationAcceptanceRate, 0);
assert.equal(response.deltaTreatmentVsControl.recommendationAcceptanceRate, 1);
assert.equal(response.metrics.length, 7);

console.log("rct summary aggregation test passed");
