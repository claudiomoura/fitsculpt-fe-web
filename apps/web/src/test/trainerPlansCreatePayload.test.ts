import { describe, expect, it, vi } from "vitest";
import { createTrainerPlan } from "@/services/trainer/plans";

describe("services/trainer/plans.createTrainerPlan", () => {
  it("sends daysCount together with daysPerWeek to satisfy backend schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: "p1", title: "Plan 1", days: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await createTrainerPlan({ title: "Plan 1", daysPerWeek: 3 });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.daysPerWeek).toBe(3);
    expect(body.daysCount).toBe(3);
  });
});
