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

  it("shows explicit source mode as manual when only manual snapshots exist", () => {
    renderWithProviders(
      <PassiveHealthSummaryCard
        {...baseProps}
        passiveData={{
          snapshots: [
            {
              id: "manual-1",
              date: "2026-04-09",
              source: "manual",
              provider: "Manual sync",
              steps: 8200,
              activeCalories: 300,
              activeMinutes: 34,
              sleepHours: 7.1,
              restingHeartRate: 59,
              exerciseSessions: 0,
              note: "Manual sync",
              syncedAt: "2026-04-09T08:00:00.000Z",
            },
          ],
          lastSyncAt: "2026-04-09T08:00:00.000Z",
          lastSyncSource: "manual",
        }}
      />,
    );

    expect(screen.getByTestId("passive-source-mode")).toHaveTextContent(/fuente activa: manual/i);
  });

  it("shows demo source mode and demo-origin label distinctly", () => {
    renderWithProviders(
      <PassiveHealthSummaryCard
        {...baseProps}
        passiveData={{
          snapshots: [
            {
              id: "demo-1",
              date: "2026-04-09",
              source: "demo",
              provider: "Demo Sync",
              steps: 7500,
              activeCalories: 260,
              activeMinutes: 28,
              sleepHours: 7,
              restingHeartRate: 62,
              exerciseSessions: 0,
              note: "Demo sync",
              syncedAt: "2026-04-09T08:00:00.000Z",
            },
          ],
          lastSyncAt: "2026-04-09T08:00:00.000Z",
          lastSyncSource: "demo",
        }}
      />, 
    );

    expect(screen.getByTestId("passive-source-mode")).toHaveTextContent(/fuente activa: demo/i);
    expect(screen.getByText(/origen: demo \(solo pruebas\)/i)).toBeInTheDocument();
  });

  it("shows explicit no-data message after successful android sync with zero imports", () => {
    renderWithProviders(
      <PassiveHealthSummaryCard
        {...baseProps}
        passiveData={{
          snapshots: [
            {
              id: "manual-1",
              date: "2026-04-09",
              source: "manual",
              provider: "Manual sync",
              steps: 8200,
              activeCalories: 300,
              activeMinutes: 34,
              sleepHours: 7.1,
              restingHeartRate: 59,
              exerciseSessions: 0,
              note: "Manual sync",
              syncedAt: "2026-04-09T08:00:00.000Z",
            },
          ],
          lastSyncAt: "2026-04-09T08:00:00.000Z",
          lastSyncSource: "manual",
        }}
        androidSyncState={{
          status: "success",
          message: "Permisos listos, pero Health Connect no devolvio datos recientes.",
          autoRetryPending: false,
          lastImportedCount: 0,
          syncedAt: "2026-04-09T12:00:00.000Z",
        }}
      />, 
    );

    expect(screen.getByTestId("passive-sync-status-banner")).toHaveTextContent(/sin datos recientes para importar/i);
  });
});
