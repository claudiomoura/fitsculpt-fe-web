import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

import { TodayCheckinCard } from "@/app/(app)/app/hoy/components/TodayCheckinCard";

describe("TodayCheckinCard routes", () => {
  it("routes register weight button to check-in flow", () => {
    render(<TodayCheckinCard checkinDoneThisWeek={false} />);

    fireEvent.click(screen.getByRole("button", { name: /registrar peso/i }));
    expect(pushMock).toHaveBeenCalledWith("/app/seguimiento/check-in");
  });

  it("emphasizes the weekly coach CTA when a weekly check-in is due", () => {
    render(<TodayCheckinCard checkinDoneThisWeek weeklyCoachCheckInDue />);

    expect(screen.getByText(/check-in semanal pendiente/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /completar check-in semanal/i }),
    ).toHaveAttribute("href", "/app/hoy/weekly-review#weekly-coach-checkin");
    expect(
      screen.getByRole("link", { name: /completar check-in semanal/i }),
    ).toHaveClass("ui-button--primary", "glow-primary");
  });

  it("keeps the weekly coach CTA secondary when no due signal is available", () => {
    render(<TodayCheckinCard checkinDoneThisWeek />);

    expect(screen.queryByText(/check-in semanal pendiente/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver check-in semanal/i }),
    ).toHaveAttribute("href", "/app/hoy/weekly-review#weekly-coach-checkin");
    expect(
      screen.getByRole("link", { name: /ver check-in semanal/i }),
    ).toHaveClass("ui-button--secondary");
  });
});
