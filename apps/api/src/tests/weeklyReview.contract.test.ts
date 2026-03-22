import assert from "node:assert/strict";
import { weeklyReviewRequestSchema, weeklyReviewResponseSchema } from "../schemas/weeklyReview.js";
import { buildWeeklyReview } from "../services/weeklyReview.js";

const request = weeklyReviewRequestSchema.parse({
  startDate: "2026-02-16",
  endDate: "2026-02-22",
});

const payload = buildWeeklyReview(
  {
    checkins: [
      {
        id: "c1",
        date: "2026-02-10",
        weightKg: 80.6,
        chestCm: 100,
        waistCm: 86,
        hipsCm: 95,
        bicepsCm: 35,
        thighCm: 56,
        calfCm: 38,
        neckCm: 40,
        bodyFatPercent: 18,
        energy: 4,
        hunger: 2,
        notes: "Prev",
        recommendation: "",
        frontPhotoUrl: null,
        sidePhotoUrl: null,
      },
      {
        id: "c2",
        date: "2026-02-17",
        weightKg: 79.5,
        chestCm: 100,
        waistCm: 84.5,
        hipsCm: 95,
        bicepsCm: 35,
        thighCm: 56,
        calfCm: 38,
        neckCm: 40,
        bodyFatPercent: 18,
        energy: 2,
        hunger: 4,
        notes: "Tired",
        recommendation: "Sleep",
        frontPhotoUrl: null,
        sidePhotoUrl: null,
      },
      {
        id: "c3",
        date: "2026-02-20",
        weightKg: 79.1,
        chestCm: 100,
        waistCm: 84,
        hipsCm: 95,
        bicepsCm: 35,
        thighCm: 56,
        calfCm: 38,
        neckCm: 40,
        bodyFatPercent: 18,
        energy: 2,
        hunger: 4,
        notes: "Still hungry",
        recommendation: "",
        frontPhotoUrl: null,
        sidePhotoUrl: null,
      },
    ],
    passiveData: {
      snapshots: [
        { id: "ph1", date: "2026-02-17", source: "demo", provider: "Demo Sync", steps: 6200, activeCalories: 240, activeMinutes: 18, sleepHours: 7.2, restingHeartRate: 60, exerciseSessions: 0, note: "", syncedAt: "2026-02-17T08:00:00.000Z" },
        { id: "ph2", date: "2026-02-18", source: "demo", provider: "Demo Sync", steps: 5800, activeCalories: 220, activeMinutes: 15, sleepHours: 7.9, restingHeartRate: 58, exerciseSessions: 0, note: "", syncedAt: "2026-02-18T08:00:00.000Z" },
        { id: "ph3", date: "2026-02-20", source: "demo", provider: "Demo Sync", steps: 6900, activeCalories: 260, activeMinutes: 20, sleepHours: 7.5, restingHeartRate: 59, exerciseSessions: 0, note: "", syncedAt: "2026-02-20T08:00:00.000Z" },
      ],
      lastSyncAt: "2026-02-20T08:00:00.000Z",
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
  request,
  {
    goal: "cut",
    trainingPlan: { daysPerWeek: 4, title: "Base" },
    nutritionPlan: { dailyCalories: 2200, title: "Cut" },
  },
);

const parsed = weeklyReviewResponseSchema.parse(payload);
assert.equal(parsed.summary.rangeStart, "2026-02-16");
assert.equal(parsed.summary.rangeEnd, "2026-02-22");
assert.equal(parsed.summary.previousRangeStart, "2026-02-09");
assert.equal(parsed.summary.mealLoggingDays, 3);
assert.equal(parsed.summary.trainingTargetSessions, 4);
assert.equal(parsed.summary.passiveActiveDays, 0);
assert.equal(parsed.summary.passiveAdherenceSupportPct, 0, "insufficient passive activity should not inflate adherence");
assert.equal(parsed.recommendations.length >= 2, true, "should return multiple recommendations");
assert.equal(parsed.recommendations.some((entry) => entry.id === "training-deload"), true, "should suggest lower training demand when adherence is low");
assert.equal(parsed.recommendations.some((entry) => entry.id === "nutrition-recovery"), true, "should protect recovery when loss is too fast");

const recomp = weeklyReviewResponseSchema.parse(
  buildWeeklyReview(
    {
      checkins: [
        { id: "p1", date: "2026-02-10", weightKg: 80.1, chestCm: 100, waistCm: 86, hipsCm: 95, bicepsCm: 35, thighCm: 56, calfCm: 38, neckCm: 40, bodyFatPercent: 18, energy: 4, hunger: 2, notes: "", recommendation: "", frontPhotoUrl: null, sidePhotoUrl: null },
        { id: "p2", date: "2026-02-18", weightKg: 80.1, chestCm: 100, waistCm: 85.2, hipsCm: 95, bicepsCm: 35, thighCm: 56, calfCm: 38, neckCm: 40, bodyFatPercent: 18, energy: 4, hunger: 2, notes: "", recommendation: "", frontPhotoUrl: null, sidePhotoUrl: null },
      ],
      passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
      foodLog: [],
      mealLog: [
        { id: "rm1", date: "2026-02-17", mealKey: "meal-1", mealType: "lunch", title: "Lunch", calories: 600, protein: 35, carbs: 60, fats: 18, completedAt: "2026-02-17T13:00:00.000Z" },
        { id: "rm2", date: "2026-02-18", mealKey: "meal-2", mealType: "dinner", title: "Dinner", calories: 600, protein: 35, carbs: 60, fats: 18, completedAt: "2026-02-18T13:00:00.000Z" },
        { id: "rm3", date: "2026-02-19", mealKey: "meal-3", mealType: "breakfast", title: "Breakfast", calories: 600, protein: 35, carbs: 60, fats: 18, completedAt: "2026-02-19T13:00:00.000Z" },
      ],
      workoutLog: [
        { id: "rw1", date: "2026-02-18", name: "Full body", durationMin: 50, notes: "" },
        { id: "rw2", date: "2026-02-20", name: "Upper", durationMin: 45, notes: "" },
      ],
    },
    request,
    {
      goal: "cut",
      trainingPlan: { daysPerWeek: 2, title: "Base" },
      nutritionPlan: { dailyCalories: 2100, title: "Cut" },
    },
  ),
);

assert.equal(recomp.recommendations.some((entry) => entry.id === "nutrition-maintain"), true, "should flag recomposition when weight is stable and waist drops");

const emptyParsed = weeklyReviewResponseSchema.parse(
  buildWeeklyReview(
    {
      checkins: [],
      foodLog: [],
      mealLog: [],
      workoutLog: [],
      passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
    },
    request,
    {
      trainingPlan: { daysPerWeek: 3 },
    },
  ),
);

assert.equal(emptyParsed.summary.checkinsCount, 0, "empty tracking should be supported");
assert.equal(emptyParsed.recommendations.some((entry) => entry.type === "habit"), true, "empty state should prioritize habit recommendations");

const passiveBridge = weeklyReviewResponseSchema.parse(
  buildWeeklyReview(
    {
      checkins: [],
      foodLog: [],
      mealLog: [],
      workoutLog: [{ id: "w-passive", date: "2026-02-19", name: "Gym", durationMin: 40, notes: "" }],
      passiveData: {
        snapshots: [
          { id: "pb1", date: "2026-02-17", source: "demo", provider: "Demo Sync", steps: 9800, activeCalories: 320, activeMinutes: 34, sleepHours: 7.3, restingHeartRate: 60, exerciseSessions: 0, note: "", syncedAt: "2026-02-17T08:00:00.000Z" },
          { id: "pb2", date: "2026-02-18", source: "demo", provider: "Demo Sync", steps: 12100, activeCalories: 440, activeMinutes: 58, sleepHours: 7.8, restingHeartRate: 59, exerciseSessions: 1, note: "", syncedAt: "2026-02-18T08:00:00.000Z" },
          { id: "pb3", date: "2026-02-20", source: "demo", provider: "Demo Sync", steps: 8700, activeCalories: 300, activeMinutes: 28, sleepHours: 7.4, restingHeartRate: 61, exerciseSessions: 0, note: "", syncedAt: "2026-02-20T08:00:00.000Z" },
        ],
        lastSyncAt: "2026-02-20T08:00:00.000Z",
        lastSyncSource: "demo",
      },
    },
    request,
    {
      trainingPlan: { daysPerWeek: 4, title: "Base" },
    },
  ),
);

assert.equal(passiveBridge.recommendations.some((entry) => entry.id === "habit-passive-bridge"), true, "passive activity should complement but not replace manual adherence");

console.log("weekly review contract test passed");
