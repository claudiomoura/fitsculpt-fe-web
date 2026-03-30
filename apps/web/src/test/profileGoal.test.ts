import { describe, expect, it } from "vitest";
import { normalizeGoalWeightForGoal } from "@/lib/profileGoal";

describe("normalizeGoalWeightForGoal", () => {
  it("keeps goal weight editable for cut/bulk", () => {
    expect(normalizeGoalWeightForGoal("cut", 82, 75)).toBe(75);
    expect(normalizeGoalWeightForGoal("bulk", 82, 90)).toBe(90);
  });

  it("syncs goal weight with current weight when goal is maintain", () => {
    expect(normalizeGoalWeightForGoal("maintain", 82, 70)).toBe(82);
    expect(normalizeGoalWeightForGoal("maintain", null, 70)).toBeNull();
  });
});
