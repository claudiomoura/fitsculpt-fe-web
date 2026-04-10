import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrackingSummaryPreview from "@/app/(app)/app/seguimiento/TrackingSummaryPreview";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

describe("TrackingSummaryPreview", () => {
  it("renders the extracted summary surface and keeps its main interactions wired", () => {
    const onProgressRangeChange = vi.fn();
    const onPrimaryAction = vi.fn();

    renderWithProviders(
      <TrackingSummaryPreview
        progressRange="30"
        summaryKpis={[
          {
            id: "weight",
            label: "Peso actual",
            value: "80.2 kg",
            detail: "10 abr",
          },
          {
            id: "training",
            label: "Sesiones",
            value: "4",
            detail: "180 min",
          },
        ]}
        primaryInsight={{
          title: "Nutricion",
          chip: "85% adherencia",
          body: "Manten la consistencia de proteina esta semana.",
        }}
        onProgressRangeChange={onProgressRangeChange}
        onPrimaryAction={onPrimaryAction}
      />,
    );

    expect(screen.getByRole("heading", { name: /progreso/i })).toBeInTheDocument();
    expect(screen.getByText("80.2 kg")).toBeInTheDocument();
    expect(screen.getByText("Manten la consistencia de proteina esta semana.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Mes", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /revisi.n semanal/i })).toHaveAttribute(
      "href",
      "/app/weekly-review",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Semana" }));
    fireEvent.click(screen.getByRole("button", { name: /registrar check-in/i }));

    expect(onProgressRangeChange).toHaveBeenCalledWith("7");
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });
});
