import { describe, expect, it } from "vitest";
import { canAccessAdmin, canAccessDevelopment, canAccessTrainer } from "@/config/roleAccess";
import { buildNavigationSections } from "@/components/layout/navConfig";

describe("role access helpers", () => {
  it("allows admin access for admin role", () => {
    expect(canAccessAdmin({ role: "admin" })).toBe(true);
  });

  it("allows trainer access for trainer role", () => {
    expect(canAccessTrainer({ role: "trainer" })).toBe(true);
  });

  it("allows trainer access when backend marks isTrainer despite USER role", () => {
    expect(canAccessTrainer({ role: "USER", isCoach: true, gymMembershipState: "in_gym" })).toBe(true);
  });

  it("allows development access for dev role", () => {
    expect(canAccessDevelopment({ role: "dev" })).toBe(true);
    expect(canAccessDevelopment({ role: "developer" })).toBe(true);
  });

  it("hides restricted access for missing role", () => {
    expect(canAccessTrainer({})).toBe(false);
    expect(canAccessAdmin({})).toBe(false);
    expect(canAccessDevelopment({})).toBe(false);
  });
});

describe("navigation section gating", () => {
  it("hides trainer and admin entries when role is missing", () => {
    const sections = buildNavigationSections({});
    const allItemIds = sections.flatMap((section) => section.items.map((item) => item.id));

    expect(allItemIds).not.toContain("trainer-home");
    expect(sections.find((section) => section.id === "admin")).toBeUndefined();
    expect(sections.find((section) => section.id === "development")).toBeUndefined();
    expect(sections.find((section) => section.id === "trainer")).toBeUndefined();
  });

  it("shows admin section and trainer entry for admin users", () => {
    const sections = buildNavigationSections({ role: "admin" });
    const allItemIds = sections.flatMap((section) => section.items.map((item) => item.id));

    expect(allItemIds).toContain("trainer-home");
    expect(sections.find((section) => section.id === "admin")).toBeDefined();
    expect(sections.find((section) => section.id === "trainer")).toBeDefined();
    expect(sections.find((section) => section.id === "development")).toBeUndefined();
    expect(allItemIds).toContain("admin-labs");
  });


  it("shows trainer plus account only for trainer users", () => {
    const sections = buildNavigationSections({ role: "trainer", isCoach: true });
    const sectionIds = sections.map((section) => section.id);
    const allItemIds = sections.flatMap((section) => section.items.map((item) => item.id));

    expect(sectionIds).toEqual(["trainer", "account"]);
    expect(allItemIds).toContain("trainer-home");
    expect(allItemIds).toContain("profile");
    expect(allItemIds).not.toContain("today");
    expect(allItemIds).not.toContain("training");
    expect(allItemIds).not.toContain("nutrition-calendar");
    expect(allItemIds).not.toContain("admin-dashboard");
  });

  it("marks admin gym requests as unavailable to avoid broken flows", () => {
    const sections = buildNavigationSections({ role: "admin" });
    const adminSection = sections.find((section) => section.id === "admin");

    expect(adminSection).toBeDefined();
    const gymRequestsItem = adminSection?.items.find((item) => item.id === "admin-gym-requests");
    expect(gymRequestsItem?.disabled).toBe(true);
    expect(gymRequestsItem?.disabledNoteKey).toBe("common.comingSoon");
  });


  it("shows development section only for admin dev users", () => {
    const sections = buildNavigationSections({ role: "admin", isDev: true });

    expect(sections.find((section) => section.id === "development")).toBeDefined();
  });

  it("hides development section for non-admin dev users", () => {
    const sections = buildNavigationSections({ role: "dev" });
    const allItemIds = sections.flatMap((section) => section.items.map((item) => item.id));

    expect(sections.find((section) => section.id === "development")).toBeUndefined();
    expect(sections.find((section) => section.id === "admin")).toBeUndefined();
    expect(sections.find((section) => section.id === "trainer")).toBeUndefined();
    expect(allItemIds).not.toContain("dev-trainer-home");
  });
});
