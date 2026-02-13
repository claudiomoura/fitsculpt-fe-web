import { describe, expect, it } from "vitest";
import { canAccessAdmin, canAccessTrainer } from "@/config/roleAccess";
import { buildNavigationSections } from "@/components/layout/navConfig";

describe("role access helpers", () => {
  it("allows admin access for admin role", () => {
    expect(canAccessAdmin({ role: "admin" })).toBe(true);
  });

  it("allows trainer access for trainer role", () => {
    expect(canAccessTrainer({ role: "trainer" })).toBe(true);
  });

  it("hides restricted access for missing role", () => {
    expect(canAccessTrainer({})).toBe(false);
    expect(canAccessAdmin({})).toBe(false);
  });
});

describe("navigation section gating", () => {
  it("hides trainer and admin entries when role is missing", () => {
    const sections = buildNavigationSections({});
    const allItemIds = sections.flatMap((section) => section.items.map((item) => item.id));

    expect(allItemIds).not.toContain("trainer-home");
    expect(sections.find((section) => section.id === "admin")).toBeUndefined();
  });

  it("shows admin section and trainer entry for admin users", () => {
    const sections = buildNavigationSections({ role: "admin" });
    const allItemIds = sections.flatMap((section) => section.items.map((item) => item.id));

    expect(allItemIds).toContain("trainer-home");
    expect(sections.find((section) => section.id === "admin")).toBeDefined();
    expect(allItemIds).toContain("admin-labs");
  });
});
