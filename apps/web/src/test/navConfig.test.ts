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

  it("keeps nutrition navigation visible even when nutrition entitlements are unavailable", () => {
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
    const moreSection = gated.find((section) => section.id === "more");
    const accountSection = gated.find((section) => section.id === "account");
    const recipeLibraryItem = moreSection?.items.find((item) => item.id === "recipe-library");
    const dietPlansItem = moreSection?.items.find((item) => item.id === "diet-plans");
    const macrosItem = moreSection?.items.find((item) => item.id === "macros");
    const gymItem = accountSection?.items.find((item) => item.id === "gym");

    expect(nutritionSection?.items.every((item) => item.disabled !== true)).toBe(true);
    expect(recipeLibraryItem?.disabled).not.toBe(true);
    expect(dietPlansItem?.disabled).not.toBe(true);
    expect(macrosItem?.disabled).not.toBe(true);
    expect(gymItem?.disabled).not.toBe(true);
  });

  it("groups sidebar items into fitness, nutrition, and account sections", () => {
    const fitnessSection = sidebarUser.find((section) => section.id === "fitness");
    const nutritionSection = sidebarUser.find((section) => section.id === "nutrition");
    const moreSection = sidebarUser.find((section) => section.id === "more");

    expect(fitnessSection?.items.map((item) => item.href)).toEqual([
      "/app/hoy",
      "/app/entrenamiento",
    ]);

    expect(nutritionSection?.items.map((item) => item.href)).toEqual([
      "/app/nutricion",
    ]);

    expect(moreSection?.items.map((item) => item.href)).toEqual([
      "/app",
      "/app/biblioteca",
      "/app/biblioteca/planes-entrenamiento",
      "/app/biblioteca/recetas",
      "/app/biblioteca/planes-nutricion",
      "/app/macros",
      "/app/weekly-review",
      "/app/feed",
      "/app/gym",
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
