import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/context/LanguageProvider";
import { TodayNutritionCard } from "@/app/(app)/app/hoy/components/TodayNutritionCard";

describe("TodayNutritionCard CTA states", () => {
  it("renders action-oriented with-plan CTAs", () => {
    const onRegisterMeal = vi.fn();

    render(
      <LanguageProvider>
        <TodayNutritionCard
          hasPlan
          consumedCalories={1200}
          targetCalories={2000}
          mealsLogged={2}
          mealsTotal={4}
          primaryCtaLabel="Ver comidas de hoy"
          primaryCtaHref="/app/nutricion?day=2026-04-07"
          secondaryCtaLabel="Registrar comida"
          onSecondaryCtaClick={onRegisterMeal}
          tertiaryCtaLabel="Ver plan"
          tertiaryCtaHref="/app/nutricion"
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole("link", { name: "Ver comidas de hoy" })).toHaveAttribute(
      "href",
      "/app/nutricion?day=2026-04-07",
    );
    expect(screen.getByRole("link", { name: "Ver plan" })).toHaveAttribute(
      "href",
      "/app/nutricion",
    );

    fireEvent.click(screen.getByRole("button", { name: "Registrar comida" }));
    expect(onRegisterMeal).toHaveBeenCalledTimes(1);
  });
});
