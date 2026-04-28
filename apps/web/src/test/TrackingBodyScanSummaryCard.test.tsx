import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrackingBodyScanSummaryCard from "@/components/tracking-intelligence/TrackingBodyScanSummaryCard";
import { defaultProfile } from "@/lib/profile";
import type { PassiveHealthData } from "@/services/tracking";
import { buildTrackingBodyScanCapability } from "@/domains/tracking-intelligence";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

const passiveData: PassiveHealthData = {
  snapshots: [
    {
      id: "passive-1",
      date: "2026-04-09",
      source: "health_connect",
      provider: "Health Connect",
      steps: 9300,
      activeCalories: 330,
      activeMinutes: 38,
      sleepHours: 7.1,
      restingHeartRate: 58,
      exerciseSessions: 1,
      note: "",
      syncedAt: "2026-04-09T08:00:00.000Z",
    },
  ],
  lastSyncAt: "2026-04-09T08:00:00.000Z",
  lastSyncSource: "health_connect",
};

describe("TrackingBodyScanSummaryCard", () => {
  it("renders composition metrics and precision explanation", () => {
    const capability = buildTrackingBodyScanCapability({
      origin: "tracking",
      profile: { ...defaultProfile, goal: "cut", sex: "male", age: 34, heightCm: 178 },
      checkins: [
        {
          id: "old",
          date: "2026-03-28",
          weightKg: 82,
          chestCm: 100,
          waistCm: 86,
          hipsCm: 96,
          bicepsCm: 32,
          thighCm: 55,
          calfCm: 37,
          neckCm: 39,
          bodyFatPercent: 20,
          energy: 3,
          hunger: 2,
          notes: "",
          recommendation: "",
          frontPhotoUrl: "front-old",
          sidePhotoUrl: null,
        },
        {
          id: "new",
          date: "2026-04-10",
          weightKg: 80,
          chestCm: 99,
          waistCm: 84,
          hipsCm: 95,
          bicepsCm: 32,
          thighCm: 55,
          calfCm: 37,
          neckCm: 39,
          bodyFatPercent: 18,
          energy: 3,
          hunger: 2,
          notes: "",
          recommendation: "",
          frontPhotoUrl: "front-new",
          sidePhotoUrl: "side-new",
        },
      ],
      passiveData,
      rangeDays: 30,
    });

    renderWithProviders(<TrackingBodyScanSummaryCard capability={capability} />);

    expect(screen.getByText(/(% grasa estimado|estimated body fat)/i)).toBeInTheDocument();
    expect(screen.getByText(/(^composicion$|lean mass estimate)/i)).toBeInTheDocument();
    expect(screen.getByText(/(masa grasa|fat mass estimate)/i)).toBeInTheDocument();
    expect(screen.getByText(/(estimacion hibrida|precision honesta)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/(grasa corporal manual|body fat manual)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/medidas corporales/i).length).toBeGreaterThan(0);
  });
});
