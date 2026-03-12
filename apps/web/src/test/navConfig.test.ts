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

  it("locks only items with feature requirements when entitlements are unavailable", () => {
    const gated = applyEntitlementGating(sidebarUser, {
      status: "known",
      features: {
        canUseAI: false,
        canUseNutrition: false,
        canUseStrength: false,
      },
    });

    const nutritionSection = gated.find((section) => section.id === "nutrition");
    const accountSection = gated.find((section) => section.id === "account");
    const gymItem = accountSection?.items.find((item) => item.id === "gym");

    expect(nutritionSection?.items.every((item) => item.disabled === true)).toBe(true);
    expect(gymItem?.disabled).not.toBe(true);
  });

  it("groups sidebar items into fitness, nutrition, and account sections", () => {
    const fitnessSection = sidebarUser.find((section) => section.id === "fitness");
    const nutritionSection = sidebarUser.find((section) => section.id === "nutrition");

    expect(fitnessSection?.items.map((item) => item.href)).toEqual([
      "/app/hoy",
      "/app/entrenamiento",
      "/app/biblioteca",
      "/app/biblioteca/entrenamientos",
    ]);

    expect(nutritionSection?.items.map((item) => item.href)).toEqual([
      "/app/nutricion",
      "/app/biblioteca/recetas",
      "/app/dietas",
      "/app/macros",
    ]);
  });

});
