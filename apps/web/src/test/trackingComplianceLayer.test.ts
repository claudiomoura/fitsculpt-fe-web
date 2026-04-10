import { describe, expect, it } from "vitest";
import {
  getTrackingIntelligenceCompliance,
  getTrackingIntelligenceComplianceRule,
} from "@/domains/tracking-intelligence";

describe("tracking intelligence compliance layer", () => {
  it("returns compliance bundles per capability", () => {
    const projection = getTrackingIntelligenceCompliance("projection");
    const bodyScan = getTrackingIntelligenceCompliance("body-scan");

    expect(projection.disclaimer).toContain("proyeccion");
    expect(bodyScan.safetyNotes.length).toBeGreaterThan(0);
  });

  it("exposes a shared claims policy for UI and capability consumers", () => {
    const rules = getTrackingIntelligenceComplianceRule("recommendation");

    expect(rules.blockedClaims).toContain("medical_diagnosis");
    expect(rules.safeLanguage).toContain("non_medical_advice");
  });
});
