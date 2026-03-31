import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

import { TodayPriorityHero } from "@/app/(app)/app/hoy/components/TodayPriorityHero";

describe("TodayPriorityHero routes", () => {
  it("navigates to entrenamiento routes (not /app/entreno)", () => {
    render(
      <TodayPriorityHero
        trainingState="workout"
        todayWorkoutId="workout-123"
        hasTrainingAccess
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Detalles" }));
    expect(pushMock).toHaveBeenCalledWith("/app/entrenamiento/workout-123");

    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    expect(pushMock).toHaveBeenCalledWith("/app/entrenamiento/workout-123/start");
  });
});
