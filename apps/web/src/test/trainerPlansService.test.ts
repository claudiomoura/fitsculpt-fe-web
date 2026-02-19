import { describe, expect, it, vi } from "vitest";
import {
  addExerciseToTrainerPlanDay,
  createTrainerPlan,
  getTrainerPlanDetail,
  listTrainerPlans,
  toTrainerPlanDayOptions,
} from "@/services/trainerPlans";

describe("trainerPlans service", () => {
  it("reads plans from items payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "p1", title: "Plan A", notes: "desc" }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await listTrainerPlans();

    expect(fetchMock).toHaveBeenCalledWith("/api/trainer/plans", { cache: "no-store", credentials: "include" });
    expect(result.items[0]?.id).toBe("p1");
    expect(result.items[0]?.title).toBe("Plan A");
  });

  it("creates a plan and returns parsed row", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "p2", title: "Plan B" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await createTrainerPlan({ title: " Plan B ", description: " Notes " });

    expect(fetchMock).toHaveBeenCalledWith("/api/trainer/plans", expect.objectContaining({ method: "POST" }));
    expect(result?.id).toBe("p2");
  });

  it("returns day options from detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "p3",
        title: "Plan C",
        days: [
          { id: "d1", label: "Day 1", exercises: [{ id: "e1", name: "Squat", sets: 4 }] },
          { id: "d2", label: "Day 2", exercises: [] },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const detail = await getTrainerPlanDetail("p3");
    const options = toTrainerPlanDayOptions(detail);

    expect(options).toEqual([
      { id: "d1", label: "Day 1", exercisesCount: 1 },
      { id: "d2", label: "Day 2", exercisesCount: 0 },
    ]);
  });

  it("posts exercise additions to selected day", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await addExerciseToTrainerPlanDay("plan_1", "day_1", { exerciseId: "ex_1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trainer/plans/plan_1/days/day_1/exercises",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });
});
