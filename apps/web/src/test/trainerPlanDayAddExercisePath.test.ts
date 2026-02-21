import { describe, expect, it, vi } from "vitest";
import { addExerciseToPlanDay } from "@/services/trainer/plans";

describe("services/trainer/plans.addExerciseToPlanDay", () => {
  it("encodes dynamic segments in the BFF path to avoid 404s with special chars", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await addExerciseToPlanDay({
      planId: "plan/with space",
      dayId: "día 1/mañana",
      exerciseId: "bench-press",
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/trainer/plans/plan%2Fwith%20space/days/d%C3%ADa%201%2Fma%C3%B1ana/exercises");

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ exerciseId: "bench-press" });
  });
});
