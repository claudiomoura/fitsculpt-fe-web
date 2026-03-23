import assert from "node:assert/strict";
import { buildRctStatisticalReport } from "../services/rctStatisticalReport.js";

const now = new Date("2026-03-22T10:00:00.000Z");

const rows = Array.from({ length: 24 }, (_, index) => {
  const treatment = index >= 12;
  const baseDate = treatment ? "2026-03-21" : "2026-03-20";
  const inactive = treatment ? index % 5 === 0 : index % 4 === 0;
  const acceptedEvents = inactive ? 0 : treatment ? 2 : 1;
  const events = Array.from({ length: acceptedEvents }, () => ({
    event: "recommendation_accepted",
    timestamp: "2026-03-21T10:00:00.000Z",
  }));

  return {
    profile: {
      research: {
        rct: {
          experimentId: "future-self-rct-v1",
          group: treatment ? "treatment" : "control",
          events,
        },
      },
    },
    tracking: {
      checkins: inactive ? [] : [{ id: `c-${index}`, date: baseDate, weightKg: 70 }],
      foodLog: [],
      mealLog: [],
      workoutLog: inactive
        ? []
        : treatment
        ? [
            { id: `w-${index}-1`, date: "2026-03-20", name: "A", durationMin: 40, notes: "" },
            { id: `w-${index}-2`, date: "2026-03-21", name: "B", durationMin: 45, notes: "" },
          ]
        : [{ id: `w-${index}-1`, date: "2026-03-20", name: "A", durationMin: 40, notes: "" }],
      passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
    },
  };
});

const response = buildRctStatisticalReport(rows, { windowWeeks: 4, now });

assert.equal(response.experimentId, "future-self-rct-v1");
assert.equal(response.window.days, 28);
assert.equal(response.sample.controlN, 12);
assert.equal(response.sample.treatmentN, 12);
assert.equal(response.metrics.length, 5);

const retention = response.metrics.find((metric) => metric.key === "retention_proxy");
assert.ok(retention);
assert.equal(retention.significance.status, "approximated");

const adherence = response.metrics.find((metric) => metric.key === "adherence_mean");
assert.ok(adherence);
assert.equal(adherence.significance.status, "insufficient_data");

console.log("rct statistical report test passed");
