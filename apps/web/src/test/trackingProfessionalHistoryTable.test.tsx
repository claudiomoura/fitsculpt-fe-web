import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrackingProfessionalHistoryTable from "@/components/tracking/TrackingProfessionalHistoryTable";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

describe("TrackingProfessionalHistoryTable", () => {
  it("renders normalized rows and entry counts", () => {
    renderWithProviders(
      <TrackingProfessionalHistoryTable
        rows={[
          {
            id: "2026-03-22-normalized",
            dayKey: "2026-03-22",
            date: "2026-03-22",
            weightKg: 79.8,
            chestCm: 100,
            waistCm: 84.2,
            hipsCm: 97.8,
            bicepsCm: 35,
            thighCm: 58,
            calfCm: 37,
            neckCm: 39,
            bodyFatPercent: 17.4,
            energy: 2.5,
            hunger: 4,
            notes: "Semana dura pero consistente",
            recommendation: "keep",
            frontPhotoUrl: null,
            sidePhotoUrl: null,
            sourceCount: 3,
          },
        ]}
      />,
    );

    expect(screen.getByText("2026-03-22")).toBeInTheDocument();
    expect(screen.getByText("3 entradas")).toBeInTheDocument();
    expect(screen.getByText("79.8 kg")).toBeInTheDocument();
    expect(screen.getByText("Semana dura pero consistente")).toBeInTheDocument();
  });
});
