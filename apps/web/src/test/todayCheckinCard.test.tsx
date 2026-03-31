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
});
