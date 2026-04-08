import { describe, expect, it } from "vitest";
import { normalizeProfileSummaryPayload } from "@/app/(app)/app/hoy/TodayQuickActionsClient";

describe("normalizeProfileSummaryPayload", () => {
  it("flattens backend /profile envelope into direct profile fields", () => {
    const normalized = normalizeProfileSummaryPayload({
      id: "user_1",
      email: "test@fitsculpt.app",
      profile: {
        weightKg: 84,
        goal: "cut",
        goalWeightKg: 78,
      },
    });

    expect(normalized.weightKg).toBe(84);
    expect(normalized.goal).toBe("cut");
    expect(normalized.goalWeightKg).toBe(78);
  });
});
