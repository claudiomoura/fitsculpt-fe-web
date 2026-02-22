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
trackingSchema.parse(snapshotAfterFirstWrite);

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
assert.equal(responseBody.foodLog.length, 0, "response should include non-written collections");
assert.equal(responseBody.workoutLog.length, 0, "response should include non-written collections");

// Contract guard: drift in critical response field must break schema parse.
assert.throws(() =>
  trackingSchema.parse({
    checkins: responseBody.checkins,
    foodEntries: responseBody.foodLog,
    workoutLog: responseBody.workoutLog,
  })
);

console.log("tracking write contract test passed");
