import { describe, expect, it, vi } from "vitest";
import { fetchExercisesList } from "@/services/exercises";

describe("fetchExercisesList", () => {
  it("reads the items array from API payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "ex_1", name: "Push-up" }],
        total: 1,
        page: 1,
        limit: 24,
      }),
    });
    // @ts-expect-error test mock
    global.fetch = fetchMock;

    const result = await fetchExercisesList({});

    expect(fetchMock).toHaveBeenCalledWith("/api/exercises?page=1&limit=24", {
      cache: "no-store",
      signal: undefined,
    });
    expect(result.items).toEqual([{ id: "ex_1", name: "Push-up" }]);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it("falls back to the data array when items is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "ex_2", name: "Squat" }],
        total: 2,
        page: 1,
        limit: 1,
      }),
    });
    // @ts-expect-error test mock
    global.fetch = fetchMock;

    const result = await fetchExercisesList({ limit: 1 });

    expect(result.items).toEqual([{ id: "ex_2", name: "Squat" }]);
    expect(result.hasMore).toBe(true);
  });
});
