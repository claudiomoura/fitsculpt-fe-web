import { describe, expect, it } from "vitest";
import { applyEntitlementGating, getMostSpecificActiveHref, isPathActive, sidebarUser } from "@/components/layout/navConfig";

describe("navConfig", () => {
  it("marks only exact and nested matches as active", () => {
    expect(isPathActive("/app/biblioteca/entrenamientos", "/app/biblioteca")).toBe(true);
    expect(isPathActive("/app/bibliotecario", "/app/biblioteca")).toBe(false);
  });

  it("prefers the most specific href as active", () => {
    const activeHref = getMostSpecificActiveHref("/app/biblioteca/entrenamientos", sidebarUser);

    expect(activeHref).toBe("/app/biblioteca/entrenamientos");
  });

  it("locks items that require unavailable entitlements", () => {
    const gated = applyEntitlementGating(sidebarUser, {
      status: "known",
      tier: "FREE",
      features: {
        canUseAI: false,
        canUseNutrition: false,
        canUseStrength: false,
      },
    });

    const accountSection = gated.find((section) => section.id === "account");
    const gymItem = accountSection?.items.find((item) => item.id === "gym");

    expect(gymItem?.disabled).toBe(true);
    expect(gymItem?.disabledNoteKey).toBe("common.upgradeRequired");
  });
});
