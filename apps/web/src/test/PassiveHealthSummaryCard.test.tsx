import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PassiveHealthSummaryCard from "@/components/tracking/PassiveHealthSummaryCard";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

const baseProps = {
  passiveData: {
    snapshots: [],
    lastSyncAt: null,
    lastSyncSource: null,
  },
  overview: {
    activeDays: 3,
    totalSteps: 18250,
    totalActiveMinutes: 140,
    averageSleepHours: 7.2,
    averageRestingHeartRate: 60,
    supportPct: 64,
    sourceCount: 0,
    latestSyncAt: null,
    snapshotsInRange: [],
  },
  endDate: "2026-04-09",
  onSaveSnapshot: vi.fn().mockResolvedValue(undefined),
  onLoadDemo: vi.fn().mockResolvedValue(undefined),
};

describe("PassiveHealthSummaryCard", () => {
  it("hides the Android sync CTA when the surface disables it", () => {
    renderWithProviders(
      <PassiveHealthSummaryCard
        {...baseProps}
        showDeviceSyncCta={false}
        onSyncDevice={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByText(/cargar snapshot manual/i));

    expect(
      screen.queryByRole("button", { name: /sincronizar android/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/solo está disponible dentro de la app android/i),
    ).toBeInTheDocument();
  });

  it("shows and wires the Android sync CTA when enabled", () => {
    const onSyncDevice = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <PassiveHealthSummaryCard
        {...baseProps}
        showDeviceSyncCta
        onSyncDevice={onSyncDevice}
      />,
    );

    fireEvent.click(screen.getByText(/cargar snapshot manual/i));

    fireEvent.click(screen.getByRole("button", { name: /sincronizar android/i }));

    expect(onSyncDevice).toHaveBeenCalledTimes(1);
  });

  it("renders pending Android sync state with disabled CTA", () => {
    renderWithProviders(
      <PassiveHealthSummaryCard
        {...baseProps}
        showDeviceSyncCta
        onSyncDevice={vi.fn().mockResolvedValue(undefined)}
        syncPending
      />,
    );

    fireEvent.click(screen.getByText(/cargar snapshot manual/i));

    expect(
      screen.getByRole("button", { name: /sincronizando android/i }),
    ).toBeDisabled();
  });
});
