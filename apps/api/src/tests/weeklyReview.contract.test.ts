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
        date: "2026-02-17",
        weightKg: 80,
        chestCm: 100,
        waistCm: 85,
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
    ],
    foodLog: [{ id: "f1", date: "2026-02-18", foodKey: "rice", grams: 180 }],
    workoutLog: [{ id: "w1", date: "2026-02-20", name: "Upper", durationMin: 45, notes: "Good" }],
  },
  request
);

const parsed = weeklyReviewResponseSchema.parse(payload);
assert.equal(parsed.summary.rangeStart, "2026-02-16");
assert.equal(parsed.summary.rangeEnd, "2026-02-22");
assert.equal(parsed.recommendations.length <= 3, true, "recommendations should be capped at 3");
assert.ok(parsed.recommendations.length >= 2, "should return 2-3 recommendations");
assert.equal(parsed.summary.workoutsCount, 1);
assert.equal(parsed.summary.nutritionLogsCount, 1);

const emptyParsed = weeklyReviewResponseSchema.parse(
  buildWeeklyReview(
    {
      checkins: [],
      foodLog: [],
      workoutLog: [],
    },
    request
  )
);
assert.equal(emptyParsed.summary.checkinsCount, 0, "empty tracking should be supported");
assert.equal(emptyParsed.recommendations.length <= 3, true, "empty state recommendations should be capped");

assert.throws(() =>
  weeklyReviewResponseSchema.parse({
    summary: parsed.summary,
    tips: parsed.recommendations,
  })
);

console.log("weekly review contract test passed");
