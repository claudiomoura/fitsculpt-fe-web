import { describe, expect, it } from "vitest";
import { normalizeGymListPayload } from "@/lib/gym-contracts";

describe("normalizeGymListPayload", () => {
  it("normalizes admin gyms array payload preserving metadata fields", () => {
    const result = normalizeGymListPayload([
      {
        id: "gym_1",
        name: "Alpha Gym",
        code: "ALPHA",
        activationCode: "ALPHA",
        membersCount: 12,
        requestsCount: 3,
      },
    ]);

    expect(result).toEqual([
      {
        id: "gym_1",
        name: "Alpha Gym",
        code: "ALPHA",
        activationCode: "ALPHA",
        membersCount: 12,
        requestsCount: 3,
      },
    ]);
  });

  it("accepts legacy wrapper payload and filters invalid rows", () => {
    const result = normalizeGymListPayload({
      gyms: [
        { gymId: "gym_2", gymName: "Legacy Gym" },
        { gymId: "missing-name" },
      ],
    });

    expect(result).toEqual([{ id: "gym_2", name: "Legacy Gym" }]);
  });

  it("returns an empty array for unexpected payloads", () => {
    expect(normalizeGymListPayload({ message: "boom" })).toEqual([]);
    expect(normalizeGymListPayload(null)).toEqual([]);
  });
});
