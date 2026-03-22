import assert from "node:assert/strict";
import Fastify from "fastify";
import { z } from "zod";
import { registerRctSummaryRoute } from "../routes/rctSummary.js";

const app = Fastify();

registerRctSummaryRoute(app, {
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
            checkins: [],
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
            checkins: [],
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
  url: "/research/rct/summary?windowWeeks=4",
});

assert.equal(response.statusCode, 200);
const payload = response.json();
assert.equal(payload.experimentId, "future-self-rct-v1");
assert.equal(payload.window.days, 28);
assert.equal(payload.groups.control.sampleSize, 1);
assert.equal(payload.groups.treatment.sampleSize, 1);
assert.equal(Array.isArray(payload.metrics), true);

await app.close();
console.log("rct summary route contract test passed");
