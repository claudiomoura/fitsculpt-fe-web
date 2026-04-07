import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/context/LanguageProvider";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

import { TodayPriorityHero } from "@/app/(app)/app/hoy/components/TodayPriorityHero";

describe("TodayPriorityHero routes", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("navigates to deterministic workout start route", () => {
    render(
      <LanguageProvider>
        <TodayPriorityHero
          trainingState="workout"
          todayWorkoutId="workout-123"
          hasTrainingAccess
        />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Empezar entrenamiento" }));
    expect(pushMock).toHaveBeenCalledWith("/app/entrenamiento/workout-123/start");
  });

  it("uses deterministic fallback routes for rest and no-plan states", () => {
    // Test rest state - should show single "Ver semana" CTA
    const { rerender } = render(
      <LanguageProvider>
        <TodayPriorityHero trainingState="rest" />
      </LanguageProvider>,
    );

    const restButton = screen.getByRole("button", { name: "Ver semana" });
    fireEvent.click(restButton);
    expect(pushMock).toHaveBeenCalledWith("/app/entrenamiento");

    // Test no-plan state - should show 3 CTAs (all as links now)
    rerender(
      <LanguageProvider>
        <TodayPriorityHero
          trainingState="no-plan"
          hasAiEntitlement={false}
          gymMembershipState="not_in_gym"
        />
      </LanguageProvider>,
    );

    // With 3 CTAs in no-plan state, all are ButtonLink (rendered as links)
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(3);

    // Log the links for debugging
    links.forEach((link) => {
      console.log("Link href:", link.getAttribute("href"), "text:", link.textContent);
    });

    // Verify there's a link to manual plan editing
    const hasEditarLink = links.some((link) => link.getAttribute("href") === "/app/entrenamiento/editar");
    expect(hasEditarLink).toBe(true);
  });
});
