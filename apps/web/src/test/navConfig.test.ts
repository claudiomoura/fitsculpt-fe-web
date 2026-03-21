import { describe, expect, it } from "vitest";
import { applyEntitlementGating, getMostSpecificActiveHref, isPathActive, mainTabsMobile, sidebarUser } from "@/components/layout/navConfig";

describe("navConfig", () => {
  it("marks only exact and nested matches as active", () => {
    expect(isPathActive("/app/biblioteca/planes-entrenamiento", "/app/biblioteca")).toBe(true);
    expect(isPathActive("/app/bibliotecario", "/app/biblioteca")).toBe(false);
    expect(isPathActive("/app/training/workout-1", "/app/training")).toBe(true);
  });

  it("prefers the most specific href as active", () => {
    const activeHref = getMostSpecificActiveHref("/app/biblioteca/planes-entrenamiento", sidebarUser);

    expect(activeHref).toBe("/app/biblioteca/planes-entrenamiento");
  });

  it("locks only items with feature requirements when entitlements are unavailable", () => {
    const gated = applyEntitlementGating(sidebarUser, {
      status: "known",
      features: {
        canUseAI: false,
        canUseNutrition: false,
        canUseStrength: false,
        canUseBilling: true,
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
      "/app/biblioteca/planes-entrenamiento",
    ]);

    expect(nutritionSection?.items.map((item) => item.href)).toEqual([
      "/app/nutricion",
      "/app/biblioteca/recetas",
      "/app/biblioteca/planes-nutricion",
      "/app/macros",
    ]);
  });

  it("defines USER mobile tabs as the v0 five core routes", () => {
    expect(mainTabsMobile.map((tab) => tab.href)).toEqual([
      "/app/hoy",
      "/app/entrenamiento",
      "/app/nutricion",
      "/app/seguimiento",
      "/app/profile",
    ]);
  });

  it("defines USER mobile tabs with exact v0 labels", () => {
    expect(mainTabsMobile.map((tab) => tab.label)).toEqual([
      "Hoy",
      "Entreno",
      "Nutrición",
      "Progreso",
      "Perfil",
    ]);
  });

});
