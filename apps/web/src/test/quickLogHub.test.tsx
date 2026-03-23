import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuickLogHub from "@/components/quick-log/QuickLogHub";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

const { createTrackingEntryMock } = vi.hoisted(() => ({
  createTrackingEntryMock: vi.fn(),
}));

vi.mock("@/services/tracking", async () => {
  const actual = await vi.importActual<typeof import("@/services/tracking")>("@/services/tracking");
  return {
    ...actual,
    createTrackingEntry: createTrackingEntryMock,
  };
});

describe("QuickLogHub", () => {
  beforeEach(() => {
    createTrackingEntryMock.mockReset();
    createTrackingEntryMock.mockResolvedValue({});
    window.__fsAnalyticsQueue = [];
  });

  it("opens and saves quick water log", async () => {
    renderWithProviders(<QuickLogHub origin="today" latestCheckin={null} currentWeightKg={77.4} />);

    fireEvent.click(screen.getByRole("button", { name: /quick log/i }));
    fireEvent.click(screen.getByRole("button", { name: /agua/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar agua/i }));

    await waitFor(() => {
      expect(createTrackingEntryMock).toHaveBeenCalledWith(
        "foodLog",
        expect.objectContaining({ foodKey: "water" }),
      );
    });

    const eventNames = (window.__fsAnalyticsQueue ?? []).map((entry) => entry.name);
    expect(eventNames).toContain("quick_log_opened");
    expect(eventNames).toContain("quick_log_saved");
  });
});
