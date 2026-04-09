import assert from "node:assert/strict";
import { trackingEntryCreateSchema, trackingSchema } from "../tracking/schemas.js";
import { normalizeTrackingSnapshot, upsertTrackingEntry } from "../tracking/service.js";

const firstPayload = trackingEntryCreateSchema.parse({
  collection: "checkins",
  item: {
    id: "checkin-1",
    date: "2026-02-22",
    weightKg: 80,
    chestCm: 100,
    waistCm: 85,
    hipsCm: 95,
    bicepsCm: 35,
    thighCm: 56,
    calfCm: 38,
    neckCm: 40,
    bodyFatPercent: 18,
    energy: 4,
    hunger: 2,
    notes: "Good week",
    recommendation: "Keep current plan",
    frontPhotoUrl: null,
    sidePhotoUrl: null,
  },
});

const snapshotAfterFirstWrite = upsertTrackingEntry(undefined, firstPayload);
assert.equal(snapshotAfterFirstWrite.checkins.length, 1, "POST /tracking should append new checkin entries");
assert.equal(snapshotAfterFirstWrite.checkins[0]?.id, "checkin-1", "checkin id should be persisted");
assert.deepEqual(snapshotAfterFirstWrite.passiveData.snapshots, [], "tracking snapshot should carry passive health container by default");
trackingSchema.parse(snapshotAfterFirstWrite);

const normalizedLegacySnapshot = normalizeTrackingSnapshot({
  checkins: [{ id: "legacy-1", date: "2026-02-20", weightKg: "81.2" }],
  workoutLog: [{ id: "workout-legacy", date: "2026-02-20", name: "Upper body" }],
  mealLog: [{ id: "meal-legacy", date: "2026-02-20", title: "Almuerzo", mealKey: "meal-legacy" }],
  weeklyCoach: {
    checkIns: {
      "weekly_coach_2026-02-16": {
        checkInId: null,
        checkInState: "draft",
        weekContext: {
          planWeekId: "weekly_coach_2026-02-16",
          weekIndex: 1,
          state: "check_in_due",
          validFrom: "2026-02-16",
          validTo: "2026-02-22",
          weeklyObjective: "keep adherence high",
        },
        draftAnswers: {
          trainingSessionsPlanned: 3,
          currentWeightKg: 81.2,
        },
        requiredFields: ["trainingSessionsCompleted"],
        completionState: {
          completedFields: ["trainingSessionsPlanned"],
          missingRequiredFields: ["trainingSessionsCompleted"],
          isComplete: false,
        },
        deadline: "2026-02-22T03:00:00.000Z",
        nextCta: "submit_check_in",
        updatedAt: "2026-02-20T10:00:00.000Z",
      },
      "weekly_coach_invalid": {
        checkInState: "draft",
        updatedAt: "2026-02-20T10:00:00.000Z",
      },
      "weekly_coach_2026-02-23": {
        checkInId: null,
        checkInState: "draft",
        weekContext: {
          planWeekId: "weekly_coach_2026-03-01",
          weekIndex: 2,
          state: "check_in_due",
          validFrom: "2026-02-23",
          validTo: "2026-03-01",
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
});
trackingSchema.parse(normalizedLegacySnapshot);
assert.equal(normalizedLegacySnapshot.checkins[0]?.notes, "", "legacy checkins should receive safe default strings");
assert.equal(normalizedLegacySnapshot.mealLog[0]?.completedAt, "2026-02-20T00:00:00.000Z", "legacy meal log should receive a stable completion timestamp");
assert.equal(normalizedLegacySnapshot.passiveData.lastSyncAt, null, "legacy tracking should normalize passive data safely");
assert.equal(
  normalizedLegacySnapshot.weeklyCoach?.checkIns["weekly_coach_2026-02-16"] && typeof normalizedLegacySnapshot.weeklyCoach.checkIns["weekly_coach_2026-02-16"],
  "object",
  "weekly coach check-in ownership should survive tracking normalization",
);
assert.equal(
  Object.keys(normalizedLegacySnapshot.weeklyCoach?.checkIns ?? {}).length,
  1,
  "weekly coach normalization should drop malformed or mismatched persisted entries",
);

const updatePayload = trackingEntryCreateSchema.parse({
  collection: "checkins",
  item: {
    ...firstPayload.item,
    weightKg: 79.5,
  },
});

const snapshotAfterUpdate = upsertTrackingEntry(snapshotAfterFirstWrite, updatePayload);
assert.equal(snapshotAfterUpdate.checkins.length, 1, "POST /tracking should upsert by id within the same collection");
assert.equal(snapshotAfterUpdate.checkins[0]?.weightKg, 79.5, "updated checkin should replace previous value");

const responseBody = normalizeTrackingSnapshot(snapshotAfterUpdate);
trackingSchema.parse(responseBody);

const mealPayload = trackingEntryCreateSchema.parse({
  collection: "mealLog",
  item: {
    id: "meal-1",
    date: "2026-02-22",
    mealKey: "2026-02-22:breakfast:oats",
    mealType: "breakfast",
    title: "Avena",
    calories: 420,
    protein: 28,
    carbs: 52,
    fats: 12,
    completedAt: "2026-02-22T10:00:00.000Z",
  },
});
const snapshotAfterMeal = upsertTrackingEntry(normalizedLegacySnapshot, mealPayload);
assert.equal(snapshotAfterMeal.mealLog.length, 2, "meal log entry should append without dropping legacy entries");
trackingSchema.parse(snapshotAfterMeal);
assert.deepEqual(
  snapshotAfterMeal.weeklyCoach,
  normalizedLegacySnapshot.weeklyCoach,
  "collection upserts should preserve unrelated weekly coach ownership",
);
assert.equal(responseBody.foodLog.length, 0, "response should include non-written collections");
assert.equal(responseBody.workoutLog.length, 0, "response should include non-written collections");
assert.equal(responseBody.mealLog.length, 0, "response should include meal log collection");
assert.equal(Array.isArray(responseBody.passiveData.snapshots), true, "response should include passive health snapshots collection");

// Contract guard: drift in critical response field must break schema parse.
assert.throws(() =>
  trackingSchema.parse({
    checkins: responseBody.checkins,
    foodEntries: responseBody.foodLog,
    workoutLog: responseBody.workoutLog,
  })
);

console.log("tracking write contract test passed");
