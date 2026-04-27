import { describe, expect, it } from "vitest";
import { applyEntitlementGating, applyTabEntitlementGating, getMostSpecificActiveHref, isPathActive, mainTabsMobile, sidebarUser, trainerTabsMobile } from "@/components/layout/navConfig";

describe("navConfig", () => {
  it("marks only exact and nested matches as active", () => {
    expect(isPathActive("/app/biblioteca/planes-entrenamiento", "/app/biblioteca")).toBe(true);
    expect(isPathActive("/app/bibliotecario", "/app/biblioteca")).toBe(false);
    expect(isPathActive("/app/training/workout-1", "/app/entrenamiento")).toBe(true);
    expect(isPathActive("/app/dashboard", "/app/hoy")).toBe(true);
  });

  it("prefers the most specific href as active", () => {
    const activeHref = getMostSpecificActiveHref("/app/biblioteca/planes-entrenamiento", sidebarUser);

    expect(activeHref).toBe("/app/biblioteca/planes-entrenamiento");
  });

  it("disables nutrition and strength navigation when entitlements are unavailable", () => {
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
    const trainingItem = gated.find((section) => section.id === "fitness")?.items.find((item) => item.id === "training");
    const nutritionCalendarItem = nutritionSection?.items.find((item) => item.id === "nutrition-calendar");
    const recipeLibraryItem = moreSection?.items.find((item) => item.id === "recipe-library");
    const dietPlansItem = moreSection?.items.find((item) => item.id === "diet-plans");
    const macrosItem = moreSection?.items.find((item) => item.id === "macros");
    const gymItem = accountSection?.items.find((item) => item.id === "gym");

    expect(trainingItem?.disabled).toBe(true);
    expect(nutritionCalendarItem?.disabled).toBe(true);
    expect(recipeLibraryItem?.disabled).toBe(true);
    expect(dietPlansItem?.disabled).toBe(true);
    expect(macrosItem?.disabled).toBe(true);
    expect(gymItem?.disabled).not.toBe(true);
  });

  it("filters only gated USER tabs while keeping the tab model stable", () => {
    const gatedTabs = applyTabEntitlementGating(mainTabsMobile, {
      status: "known",
      features: {
        canUseAI: false,
        canUseNutrition: false,
        canUseStrength: true,
        canUseBilling: true,
      },
    });

    // With feature gating removed from mainTabsMobile, all 5 tabs always show
    // This is intentional - Entrenamiento and Nutricion should be visible to all users
    expect(mainTabsMobile).toHaveLength(5);
    expect(gatedTabs.map((tab) => tab.href)).toEqual([
      "/app/hoy",
      "/app/entrenamiento",
      "/app/nutricion",
      "/app/seguimiento",
      "/app/profile",
    ]);
  });

  it("groups sidebar items into fitness, nutrition, and account sections", () => {
    const fitnessSection = sidebarUser.find((section) => section.id === "fitness");
    const nutritionSection = sidebarUser.find((section) => section.id === "nutrition");
    const accountSection = sidebarUser.find((section) => section.id === "account");
    const moreSection = sidebarUser.find((section) => section.id === "more");

    expect(fitnessSection?.items.map((item) => item.href)).toEqual([
      "/app/hoy",
      "/app/entrenamiento",
    ]);

    expect(nutritionSection?.items.map((item) => item.href)).toEqual([
      "/app/nutricion",
    ]);

    expect(accountSection?.items.map((item) => item.href)).toEqual([
      "/app/seguimiento",
      "/app/body-scan",
      "/app/settings",
      "/app/profile",
    ]);

    expect(moreSection?.items.map((item) => item.href)).toEqual([
      "/app",
      "/app/biblioteca",
      "/app/biblioteca/planes-entrenamiento",
      "/app/biblioteca/recetas",
      "/app/biblioteca/planes-nutricion",
      "/app/macros",
      "/app/weekly-review",
      "/app/coach",
      "/app/feed",
      "/app/gym",
    ]);
  });

  it("defines USER mobile tabs with the current five core routes", () => {
    expect(mainTabsMobile.map((tab) => tab.href)).toEqual([
      "/app/hoy",
      "/app/entrenamiento",
      "/app/nutricion",
      "/app/seguimiento",
      "/app/profile",
    ]);
  });

  it("defines USER mobile tabs with the current labels", () => {
    expect(mainTabsMobile.map((tab) => tab.label)).toEqual([
      "Hoy",
      "Entreno",
      "Nutrición",
      "Progreso",
      "Perfil",
    ]);
  });

  it("defines TRAINER mobile tabs including requests", () => {
    expect(trainerTabsMobile.map((tab) => tab.href)).toEqual([
      "/app/trainer",
      "/app/trainer/clients",
      "/app/trainer/requests",
      "/app/trainer/plans",
      "/app/trainer/nutrition-plans",
      "/app/trainer/recipes",
      "/app/trainer/exercises",
    ]);
  });

});
