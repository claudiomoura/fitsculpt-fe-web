import { describe, expect, it } from "vitest";
import { parseQuickVoiceMeal } from "@/lib/quickLogVoiceParser";

describe("parseQuickVoiceMeal", () => {
  it("parses a simple spanish food intent with grams", () => {
    const draft = parseQuickVoiceMeal("Comi 200g pollo y arroz");

    expect(draft.grams).toBe(200);
    expect(draft.title.toLowerCase()).toContain("pollo");
    expect(draft.title.toLowerCase()).toContain("arroz");
    expect(draft.calories).toBeGreaterThan(200);
    expect(draft.protein).toBeGreaterThan(10);
    expect(draft.matchedFoods.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back safely when no food is detected", () => {
    const draft = parseQuickVoiceMeal("solo cafe");

    expect(draft.title).toBe("solo cafe");
    expect(draft.calories).toBe(0);
    expect(draft.matchedFoods).toHaveLength(0);
  });
});
