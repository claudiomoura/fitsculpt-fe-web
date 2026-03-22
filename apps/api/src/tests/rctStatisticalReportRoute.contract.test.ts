import assert from "node:assert/strict";
import Fastify from "fastify";
import { z } from "zod";
import { registerRctStatisticalReportRoute } from "../routes/rctStatisticalReport.js";

const app = Fastify();

registerRctStatisticalReportRoute(app, {
  prisma: {
    userProfile: {
      findMany: async () => [
        {
          profile: {
            research: {
              rct: {
                experimentId: "future-self-rct-v1",
                group: "control",
                events: [{ event: "recommendation_rejected", timestamp: "2026-03-20T10:00:00.000Z" }],
              },
            },
          },
          tracking: {
            checkins: [{ id: "c1", date: "2026-03-20", weightKg: 81 }],
            foodLog: [],
            mealLog: [],
            workoutLog: [{ id: "w1", date: "2026-03-20", name: "A", durationMin: 40, notes: "" }],
            passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
          },
        },
        {
          profile: {
            research: {
              rct: {
                experimentId: "future-self-rct-v1",
                group: "treatment",
                events: [{ event: "recommendation_accepted", timestamp: "2026-03-21T10:00:00.000Z" }],
              },
            },
          },
          tracking: {
            checkins: [{ id: "c2", date: "2026-03-21", weightKg: 78 }],
            foodLog: [],
            mealLog: [],
            workoutLog: [{ id: "w2", date: "2026-03-21", name: "B", durationMin: 45, notes: "" }],
            passiveData: { snapshots: [], lastSyncAt: null, lastSyncSource: null },
          },
        },
      ],
    },
  },
  requireResearchAccess: async () => ({ id: "trainer_1" }),
  handleRequestError: (reply, error) => {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "INVALID_INPUT" });
    }
    return reply.status(500).send({ error: (error as Error).message || "INTERNAL_ERROR" });
  },
});

const response = await app.inject({
  method: "GET",
  url: "/research/rct/statistical-report?windowWeeks=4",
});

assert.equal(response.statusCode, 200);
const payload = response.json();
assert.equal(payload.experimentId, "future-self-rct-v1");
assert.equal(payload.window.days, 28);
assert.equal(payload.sample.controlN, 1);
assert.equal(payload.sample.treatmentN, 1);
assert.equal(Array.isArray(payload.metrics), true);
assert.equal(payload.metrics.length, 5);

await app.close();
console.log("rct statistical report route contract test passed");
