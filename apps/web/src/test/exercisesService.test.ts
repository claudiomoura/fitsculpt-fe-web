import { describe, expect, it, vi } from "vitest";
import { fetchExercisesList, splitExercisesByOwnership } from "@/services/exercises";

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
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchExercisesList({});

    expect(fetchMock).toHaveBeenCalledWith("/api/exercises?offset=0&page=1&limit=24", {
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
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchExercisesList({ limit: 1 });

    expect(result.items).toEqual([{ id: "ex_2", name: "Squat" }]);
    expect(result.hasMore).toBe(true);
  });

  it("derives filter metadata from payload items when filters are not returned", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: "ex_3", name: "Bench Press", equipment: "Barbell", mainMuscleGroup: "Chest" },
          { id: "ex_4", name: "Row", equipment: "Cable", mainMuscleGroup: "Back" },
        ],
        total: 4,
        limit: 2,
        offset: 2,
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchExercisesList({ page: 2, limit: 2 });

    expect(result.page).toBe(2);
    expect(result.filters.equipment).toEqual(["Barbell", "Cable"]);
    expect(result.filters.primaryMuscle).toEqual(["Chest", "Back"]);
  });
});


describe("splitExercisesByOwnership", () => {
  it("classifies user-owned exercises using userId and isUserCreated", () => {
    const source = [
      { id: "ex_1", name: "Push-up" },
      { id: "ex_2", name: "Squat", userId: "user_1" },
      { id: "ex_3", name: "Burpee", isUserCreated: true },
      { id: "ex_4", name: "Lunge", userId: "user_2", isUserCreated: false },
    ];

    const result = splitExercisesByOwnership(source as never[], "user_1");

    expect(result.myExercises.map((item) => item.id)).toEqual(["ex_2", "ex_3"]);
    expect(result.fitsculptExercises.map((item) => item.id)).toEqual(["ex_1", "ex_4"]);
    expect(result.hasOwnershipSignals).toBe(true);
  });

  it("returns no ownership signals when payload does not expose ownership fields", () => {
    const source = [{ id: "ex_1", name: "Push-up" }];
    const result = splitExercisesByOwnership(source as never[], "user_1");

    expect(result.myExercises).toEqual([]);
    expect(result.fitsculptExercises.map((item) => item.id)).toEqual(["ex_1"]);
    expect(result.hasOwnershipSignals).toBe(false);
  });
});
