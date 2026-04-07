import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      <TodayPriorityHero
        trainingState="workout"
        todayWorkoutId="workout-123"
        hasTrainingAccess
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Empezar entrenamiento" }));
    expect(pushMock).toHaveBeenCalledWith("/app/entrenamiento/workout-123/start");
  });

  it("uses deterministic fallback routes for rest and no-plan states", () => {
    const { rerender } = render(<TodayPriorityHero trainingState="rest" />);

    fireEvent.click(screen.getByRole("button", { name: "Ver semana" }));
    expect(pushMock).toHaveBeenCalledWith("/app/entrenamiento");

    rerender(<TodayPriorityHero trainingState="no-plan" />);
    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }));
    expect(pushMock).toHaveBeenCalledWith("/app/entrenamiento/editar");
  });
});
