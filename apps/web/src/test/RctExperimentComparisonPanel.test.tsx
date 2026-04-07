import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/context/ThemeProvider";
import RctExperimentComparisonPanel from "@/components/weekly-review/RctExperimentComparisonPanel";

const useUserRoleMock = vi.fn();
const getRctStatisticalReportMock = vi.fn();

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => useUserRoleMock(),
}));

vi.mock("@/services/futureProjection", () => ({
  getRctStatisticalReport: (...args: unknown[]) => getRctStatisticalReportMock(...args),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

function renderPanel() {
  return render(
    <ThemeProvider>
      <RctExperimentComparisonPanel />
    </ThemeProvider>,
  );
}

describe("RctExperimentComparisonPanel", () => {
  beforeEach(() => {
    useUserRoleMock.mockReset();
    getRctStatisticalReportMock.mockReset();
  });

  it("is hidden for regular users", () => {
    useUserRoleMock.mockReturnValue({
      isAdmin: false,
      isTrainer: false,
      isDev: false,
      loading: false,
    });

    renderPanel();
    expect(screen.queryByTestId("rct-summary-panel")).not.toBeInTheDocument();
  });

  it("renders summary table for trainer role", async () => {
    useUserRoleMock.mockReturnValue({
      isAdmin: false,
      isTrainer: true,
      isDev: false,
      loading: false,
    });

    getRctStatisticalReportMock.mockResolvedValue({
      ok: true,
      data: {
        experimentId: "future-self-rct-v1",
        generatedAt: "2026-03-22T10:00:00.000Z",
        window: { days: 56, weeksApprox: 8, startDate: "2026-01-26", endDate: "2026-03-22" },
        disclaimer:
          "Reporte exploratorio para seguimiento de hipotesis RCT. No implica causalidad clinica ni reemplaza evaluacion estadistica completa.",
        limitations: [
          "Usa agregados anonimizados por grupo y ventana; no expone datos individuales.",
          "Las aproximaciones de significancia son orientativas y no sustituyen analisis inferencial formal.",
        ],
        sample: {
          controlN: 11,
          treatmentN: 12,
          minGroupN: 11,
          controlCompleteness: 0.64,
          treatmentCompleteness: 0.83,
          overallCompleteness: 0.735,
          confidence: "low",
          rationale: "n minimo por grupo=11; completitud promedio=74%",
        },
        metrics: [
          {
            key: "retention_proxy",
            label: "Retencion proxy",
            unit: "ratio",
            controlMean: 0.636,
            treatmentMean: 0.833,
            deltaTreatmentVsControl: 0.197,
            relativeEffectPercent: 30.97,
            practicalEffect: "large practical effect",
            sampleConfidence: "low",
            significance: {
              status: "approximated",
              method: "two_proportion_z",
              statistic: 0.9,
              pValueApprox: 0.35,
              note: "Aproximacion exploratoria.",
            },
          },
          {
            key: "adherence_mean",
            label: "Adherencia media",
            unit: "ratio",
            controlMean: 0.48,
            treatmentMean: 0.61,
            deltaTreatmentVsControl: 0.13,
            relativeEffectPercent: 27.08,
            practicalEffect: "medium practical effect",
            sampleConfidence: "low",
            significance: {
              status: "insufficient_data",
              method: "unavailable",
              statistic: null,
              pValueApprox: null,
              note: "No hay varianza por grupo.",
            },
          },
          {
            key: "logging_frequency_mean",
            label: "Frecuencia de logging media",
            unit: "days_per_week",
            controlMean: 2.1,
            treatmentMean: 3.2,
            deltaTreatmentVsControl: 1.1,
            relativeEffectPercent: 52.38,
            practicalEffect: "large practical effect",
            sampleConfidence: "low",
            significance: {
              status: "insufficient_data",
              method: "unavailable",
              statistic: null,
              pValueApprox: null,
              note: "No hay varianza por grupo.",
            },
          },
          {
            key: "recommendation_acceptance_rate",
            label: "Recommendation acceptance rate",
            unit: "ratio",
            controlMean: 0.3,
            treatmentMean: 0.55,
            deltaTreatmentVsControl: 0.25,
            relativeEffectPercent: 83.33,
            practicalEffect: "large practical effect",
            sampleConfidence: "low",
            significance: {
              status: "approximated",
              method: "two_proportion_z",
              statistic: 1.3,
              pValueApprox: 0.19,
              note: "Aproximacion exploratoria.",
            },
          },
          {
            key: "weekly_activity_sessions_mean",
            label: "Weekly activity sessions media",
            unit: "sessions_per_week",
            controlMean: 1.8,
            treatmentMean: 2.4,
            deltaTreatmentVsControl: 0.6,
            relativeEffectPercent: 33.33,
            practicalEffect: "large practical effect",
            sampleConfidence: "low",
            significance: {
              status: "insufficient_data",
              method: "unavailable",
              statistic: null,
              pValueApprox: null,
              note: "No hay varianza por grupo.",
            },
          },
        ],
      },
    });

    renderPanel();

    expect(await screen.findByText(/rct comparativo control vs treatment/i)).toBeInTheDocument();
    expect(await screen.findByText(/retencion proxy/i)).toBeInTheDocument();
    expect(screen.getByText(/n control=11/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/ventana personalizada en dias/i), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: /aplicar dias/i }));

    await waitFor(() => {
      expect(getRctStatisticalReportMock).toHaveBeenCalledWith({ windowDays: 40 });
    });
  });
});
