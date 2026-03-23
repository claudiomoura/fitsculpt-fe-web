"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { trackEvent } from "@/lib/analytics";
import {
  getFutureProjection,
  getRctStatus,
  sendRctEvent,
} from "@/services/futureProjection";
import type {
  FutureProjectionHorizon,
  FutureProjectionResponse,
  RctStatusResponse,
} from "@/types/futureProjection";

function formatDelta(min: number, max: number): string {
  return `${min > 0 ? "+" : ""}${min.toFixed(1)} a ${max > 0 ? "+" : ""}${max.toFixed(1)} kg`;
}

function formatWeightRange(current: number | null, min: number, max: number): string {
  if (current === null) return `${min.toFixed(1)}-${max.toFixed(1)} kg`;
  return `${min.toFixed(1)}-${max.toFixed(1)} kg (actual ${current.toFixed(1)} kg)`;
}

function confidenceLabel(confidence: FutureProjectionHorizon["confidence"]): string {
  if (confidence === "high") return "alta";
  if (confidence === "medium") return "media";
  return "baja";
}

export default function FutureProjectionPanel() {
  const [projection, setProjection] = useState<FutureProjectionResponse | null>(null);
  const [rctStatus, setRctStatus] = useState<RctStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScenarioByHorizon, setActiveScenarioByHorizon] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      const [projectionResult, statusResult] = await Promise.all([
        getFutureProjection(),
        getRctStatus(),
      ]);

      if (!active) return;

      if (!projectionResult.ok || !statusResult.ok) {
        setError("No pudimos cargar tu proyeccion futura ahora mismo.");
        setLoading(false);
        return;
      }

      setProjection(projectionResult.data);
      setRctStatus(statusResult.data);
      setActiveScenarioByHorizon(
        Object.fromEntries(
          projectionResult.data.horizons.map((horizon) => [
            horizon.months,
            horizon.scenarios[0]?.id ?? "current-consistency",
          ]),
        ),
      );
      setLoading(false);

      trackEvent("future_projection_viewed", {
        origin: "weekly_review",
        rctGroup: statusResult.data.group,
      });
      trackEvent("rct_status_viewed", {
        origin: "weekly_review",
        rctGroup: statusResult.data.group,
      });
      void sendRctEvent({ event: "projection_viewed", context: { origin: "weekly_review" } });
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  const horizons = projection?.horizons ?? [];

  const selectedScenarios = useMemo(
    () =>
      horizons.map((horizon) => {
        const activeScenario =
          horizon.scenarios.find((entry) => entry.id === activeScenarioByHorizon[horizon.months]) ??
          horizon.scenarios[0];
        return { horizon, activeScenario };
      }),
    [activeScenarioByHorizon, horizons],
  );

  const onScenarioSelect = (months: number, scenarioId: string) => {
    setActiveScenarioByHorizon((prev) => ({ ...prev, [months]: scenarioId }));
    if (!rctStatus) return;
    trackEvent("future_projection_scenario_selected", {
      origin: "weekly_review",
      rctGroup: rctStatus.group,
      horizonMonths: months,
      scenarioId,
    });
    void sendRctEvent({
      event: "projection_scenario_selected",
      context: { origin: "weekly_review", horizonMonths: months, scenarioId },
    });
  };

  if (loading) {
    return (
      <section className="card border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(252,250,245,0.95),rgba(245,250,255,0.95))]">
        <p className="text-sm text-[var(--muted)]">Calculando proyeccion futura...</p>
      </section>
    );
  }

  if (error || !projection || !rctStatus) {
    return (
      <section className="card border border-[rgba(194,65,12,0.18)] bg-[rgba(255,247,237,0.92)]">
        <h2 className="m-0 text-lg font-semibold text-[rgb(154,52,18)]">Future Self Projection v1</h2>
        <p className="mt-2 text-sm text-[rgb(154,52,18)]">{error ?? "No pudimos cargar la proyeccion por ahora."}</p>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(243,250,246,0.92),rgba(255,255,255,0.96),rgba(244,248,255,0.92))]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Future self projection v1</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">Proyeccion 3/6/12 meses con tus datos reales</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text)]">
            Motor determinista y explicable basado en adherencia, tendencia de peso y consistencia de las ultimas semanas.
            No es un resultado garantizado ni una recomendacion medica.
          </p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[var(--text)] shadow-sm">
          <p className="m-0 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">RCT</p>
          <p className="m-0 mt-1 font-medium">Grupo: {rctStatus.group === "treatment" ? "Tratamiento" : "Control"}</p>
          <p className="m-0 text-xs text-[var(--muted)]">Modo: {rctStatus.projectionMode === "full" ? "Completo" : "Comparativo"}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Adherencia estimada</p>
          <p className="mt-1 text-2xl font-semibold">{Math.round(projection.inputs.adherenceScore * 100)}%</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Consistencia</p>
          <p className="mt-1 text-2xl font-semibold">{Math.round(projection.inputs.consistencyScore * 100)}%</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Logging semanal</p>
          <p className="mt-1 text-2xl font-semibold">{projection.inputs.loggingFrequencyDaysPerWeek.toFixed(1)} dias</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Tendencia de peso</p>
          <p className="mt-1 text-2xl font-semibold">
            {projection.inputs.weightTrendKgPerWeek === null
              ? "Sin datos"
              : `${projection.inputs.weightTrendKgPerWeek > 0 ? "+" : ""}${projection.inputs.weightTrendKgPerWeek.toFixed(2)} kg/sem`}
          </p>
        </article>
      </div>

      <div className="mt-5 space-y-3">
        {selectedScenarios.map(({ horizon, activeScenario }) => (
          <article key={horizon.months} className="rounded-2xl border border-white/80 bg-white/82 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-lg font-semibold text-[var(--text)]">Horizonte {horizon.months} meses</h3>
              <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--text)]">
                Confianza {confidenceLabel(horizon.confidence)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {horizon.scenarios.map((scenario) => (
                <Button
                  key={`${horizon.months}-${scenario.id}`}
                  type="button"
                  size="sm"
                  variant={activeScenario?.id === scenario.id ? "primary" : "ghost"}
                  onClick={() => onScenarioSelect(horizon.months, scenario.id)}
                >
                  {scenario.label}
                </Button>
              ))}
            </div>
            {activeScenario ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                  <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Cambio esperado</p>
                  <p className="m-0 mt-1 text-lg font-semibold text-[var(--text)]">
                    {formatDelta(activeScenario.expectedDeltaKg.min, activeScenario.expectedDeltaKg.max)}
                  </p>
                  <p className="m-0 mt-1 text-xs text-[var(--muted)]">
                    Peso proyectado: {formatWeightRange(
                      activeScenario.projectedWeightKg?.current ?? null,
                      activeScenario.projectedWeightKg?.min ?? activeScenario.expectedDeltaKg.min,
                      activeScenario.projectedWeightKg?.max ?? activeScenario.expectedDeltaKg.max,
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                  <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Supuestos explicitos</p>
                  <div className="mt-2 space-y-1">
                    {activeScenario.assumptions.map((assumption, index) => (
                      <p key={`${horizon.months}-assumption-${index}`} className="m-0 text-sm text-[var(--text)]">
                        {assumption}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/80 bg-white/82 p-4">
        <p className="m-0 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Limitaciones de esta version</p>
        <div className="mt-2 space-y-1">
          {projection.limitations.map((limitation, index) => (
            <p key={`limitation-${index}`} className="m-0 text-sm text-[var(--text)]">
              {limitation}
            </p>
          ))}
        </div>
        <p className="m-0 mt-3 text-xs text-[var(--muted)]">{projection.disclaimer}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(239,246,255,0.8)] p-4">
        <p className="m-0 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Metrica base RCT (semana actual)</p>
        <p className="m-0 mt-2 text-sm text-[var(--text)]">
          Actividad semanal: <strong>{rctStatus.latestMetrics.weeklyActivitySessions}</strong> sesiones ·
          Adherencia: <strong>{Math.round(rctStatus.latestMetrics.adherenceScore * 100)}%</strong> ·
          Aceptacion recomendaciones: <strong>{rctStatus.latestMetrics.recommendationAcceptanceRate === null ? "N/D" : `${Math.round(rctStatus.latestMetrics.recommendationAcceptanceRate * 100)}%`}</strong> ·
          Frecuencia de logging: <strong>{rctStatus.latestMetrics.loggingFrequencyDays}/7</strong>
        </p>
      </div>
    </section>
  );
}
