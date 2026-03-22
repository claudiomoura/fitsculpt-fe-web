"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { trackEvent } from "@/lib/analytics";
import { useUserRole } from "@/hooks/useUserRole";
import { getRctStatisticalReport } from "@/services/futureProjection";
import type {
  RctStatisticalMetric,
  RctStatisticalReportResponse,
} from "@/types/futureProjection";

function formatMetricValue(metric: RctStatisticalMetric, value: number | null): string {
  if (value === null) return "N/D";
  if (metric.unit === "ratio") return `${Math.round(value * 100)}%`;
  return value.toFixed(2);
}

function formatEffectPercent(value: number | null): string {
  if (value === null) return "N/D";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function confidenceBadgeClass(level: "low" | "medium" | "high"): string {
  if (level === "high") return "border-[rgba(21,128,61,0.24)] bg-[rgba(240,253,244,0.96)] text-[rgb(22,101,52)]";
  if (level === "medium") return "border-[rgba(202,138,4,0.24)] bg-[rgba(254,252,232,0.96)] text-[rgb(133,77,14)]";
  return "border-[rgba(180,83,9,0.24)] bg-[rgba(255,247,237,0.96)] text-[rgb(154,52,18)]";
}

function toCsv(report: RctStatisticalReportResponse): string {
  const lines = [
    "metric_key,metric_label,control_mean,treatment_mean,delta_treatment_vs_control,relative_effect_percent,practical_effect,sample_confidence,significance_status,significance_method,p_value_approx",
    ...report.metrics.map((metric) => {
      const row = [
        metric.key,
        `"${metric.label.replace(/"/g, '""')}"`,
        metric.controlMean === null ? "" : String(metric.controlMean),
        metric.treatmentMean === null ? "" : String(metric.treatmentMean),
        metric.deltaTreatmentVsControl === null ? "" : String(metric.deltaTreatmentVsControl),
        metric.relativeEffectPercent === null ? "" : String(metric.relativeEffectPercent),
        `"${metric.practicalEffect}"`,
        metric.sampleConfidence,
        metric.significance.status,
        metric.significance.method,
        metric.significance.pValueApprox === null ? "" : String(metric.significance.pValueApprox),
      ];
      return row.join(",");
    }),
  ];
  return lines.join("\n");
}

function downloadCsv(report: RctStatisticalReportResponse) {
  const blob = new Blob([toCsv(report)], { type: "text/csv;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `rct-stat-report-${report.window.days}d-${report.window.endDate}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function downloadJson(report: RctStatisticalReportResponse) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `rct-stat-report-${report.window.days}d-${report.window.endDate}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function RctExperimentComparisonPanel() {
  const { isAdmin, isTrainer, isDev, loading: roleLoading } = useUserRole();
  const canView = isAdmin || isTrainer || isDev;

  const [report, setReport] = useState<RctStatisticalReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWindowWeeks, setSelectedWindowWeeks] = useState<4 | 8 | 12>(8);
  const [customWindowDaysInput, setCustomWindowDaysInput] = useState("56");

  const appliedWindow = useMemo(() => {
    if (report) {
      if (report.window.days === 28) return "4w";
      if (report.window.days === 56) return "8w";
      if (report.window.days === 84) return "12w";
      return "custom";
    }
    return "8w";
  }, [report]);

  async function loadReport(params?: { windowWeeks?: 4 | 8 | 12; windowDays?: number }) {
    if (!canView) return;
    setLoading(true);
    setError(null);
    const result = await getRctStatisticalReport(params);
    setLoading(false);
    if (!result.ok) {
      setReport(null);
      setError("No pudimos cargar el reporte estadistico del experimento.");
      return;
    }
    setReport(result.data);
    trackEvent("rct_summary_viewed", {
      origin: "weekly_review",
      windowDays: result.data.window.days,
    });
  }

  useEffect(() => {
    if (roleLoading || !canView) return;
    void loadReport({ windowWeeks: selectedWindowWeeks });
  }, [roleLoading, canView, selectedWindowWeeks]);

  if (roleLoading || !canView) return null;

  return (
    <section className="card border border-[rgba(15,23,42,0.10)] bg-[linear-gradient(135deg,rgba(245,252,255,0.96),rgba(255,255,255,0.98),rgba(252,250,245,0.96))]" data-testid="rct-summary-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Research panel</p>
          <h2 className="m-0 mt-1 text-xl font-semibold text-[var(--text)]">RCT comparativo control vs treatment</h2>
          <p className="m-0 mt-1 text-sm text-[var(--muted)]">Baseline estadistico agregado por grupo, sin datos individuales sensibles.</p>
        </div>
        {report ? (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => downloadCsv(report)}>
              Exportar CSV
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => downloadJson(report)}>
              Exportar JSON
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant={appliedWindow === "4w" ? "primary" : "ghost"} onClick={() => setSelectedWindowWeeks(4)}>4 semanas</Button>
        <Button type="button" size="sm" variant={appliedWindow === "8w" ? "primary" : "ghost"} onClick={() => setSelectedWindowWeeks(8)}>8 semanas</Button>
        <Button type="button" size="sm" variant={appliedWindow === "12w" ? "primary" : "ghost"} onClick={() => setSelectedWindowWeeks(12)}>12 semanas</Button>
        <div className="ml-1 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-2 py-1">
          <input
            type="number"
            min={7}
            max={365}
            value={customWindowDaysInput}
            onChange={(event) => setCustomWindowDaysInput(event.target.value)}
            className="w-20 border-0 bg-transparent text-sm text-[var(--text)] outline-none"
            aria-label="Ventana personalizada en dias"
          />
          <Button
            type="button"
            size="sm"
            variant={appliedWindow === "custom" ? "primary" : "ghost"}
            onClick={() => {
              const days = Number.parseInt(customWindowDaysInput, 10);
              if (!Number.isFinite(days) || days < 7 || days > 365) {
                setError("La ventana personalizada debe estar entre 7 y 365 dias.");
                return;
              }
              void loadReport({ windowDays: days });
            }}
          >
            Aplicar dias
          </Button>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm text-[var(--muted)]">Calculando baseline estadistico...</p> : null}
      {error ? <p className="mt-4 text-sm text-[rgb(154,52,18)]">{error}</p> : null}

      {report ? (
        <>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Ventana {report.window.startDate} - {report.window.endDate} ({report.window.days} dias)
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full border px-2 py-1 font-medium ${confidenceBadgeClass(report.sample.confidence)}`}>
              Confianza muestra: {report.sample.confidence}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-[var(--muted)]">
              n control={report.sample.controlN} · n treatment={report.sample.treatmentN}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-[var(--muted)]">
              Completitud {Math.round(report.sample.overallCompleteness * 100)}%
            </span>
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-[var(--border)] px-2 py-2 text-left text-[var(--muted)]">Metrica</th>
                  <th className="border-b border-[var(--border)] px-2 py-2 text-left text-[var(--muted)]">Control</th>
                  <th className="border-b border-[var(--border)] px-2 py-2 text-left text-[var(--muted)]">Treatment</th>
                  <th className="border-b border-[var(--border)] px-2 py-2 text-left text-[var(--muted)]">Delta T-C</th>
                  <th className="border-b border-[var(--border)] px-2 py-2 text-left text-[var(--muted)]">Efecto relativo</th>
                  <th className="border-b border-[var(--border)] px-2 py-2 text-left text-[var(--muted)]">Interpretacion</th>
                  <th className="border-b border-[var(--border)] px-2 py-2 text-left text-[var(--muted)]">Significancia aprox.</th>
                </tr>
              </thead>
              <tbody>
                {report.metrics.map((metric) => (
                  <tr key={metric.key}>
                    <td className="border-b border-[var(--border)] px-2 py-2 text-[var(--text)]">{metric.label}</td>
                    <td className="border-b border-[var(--border)] px-2 py-2 text-[var(--text)]">{formatMetricValue(metric, metric.controlMean)}</td>
                    <td className="border-b border-[var(--border)] px-2 py-2 text-[var(--text)]">{formatMetricValue(metric, metric.treatmentMean)}</td>
                    <td className="border-b border-[var(--border)] px-2 py-2 text-[var(--text)]">{formatMetricValue(metric, metric.deltaTreatmentVsControl)}</td>
                    <td className="border-b border-[var(--border)] px-2 py-2 text-[var(--text)]">{formatEffectPercent(metric.relativeEffectPercent)}</td>
                    <td className="border-b border-[var(--border)] px-2 py-2 text-[var(--text)]">{metric.practicalEffect}</td>
                    <td className="border-b border-[var(--border)] px-2 py-2 text-[var(--text)]">
                      {metric.significance.status === "approximated"
                        ? `z=${metric.significance.statistic ?? "N/D"}, p~${metric.significance.pValueApprox ?? "N/D"}`
                        : "insufficient_data"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[rgb(154,52,18)]">{report.disclaimer}</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-[var(--muted)]">
            {report.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
