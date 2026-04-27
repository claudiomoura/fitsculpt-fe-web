import type { TrackingBodyScanCapability, TrackingBodyCompositionEstimateSource } from "@/domains/tracking-intelligence";

type TrackingBodyScanSummaryCardProps = {
  capability: TrackingBodyScanCapability;
};

const SOURCE_LABELS: Record<TrackingBodyCompositionEstimateSource, string> = {
  manual_body_fat: "Grasa corporal manual",
  us_navy: "Medidas corporales",
  bmi_age: "Perfil base",
};

function formatNumber(value: number | null, suffix: string): string {
  if (value === null || Number.isNaN(value)) return "Sin base suficiente";
  return `${value.toFixed(1)} ${suffix}`;
}

function getConfidenceBadge(confidence: TrackingBodyScanCapability["confidence"]): string {
  if (confidence === "high") return "Alta";
  if (confidence === "medium") return "Media";
  return "Baja";
}

function getConfidenceTone(confidence: TrackingBodyScanCapability["confidence"]): string {
  if (confidence === "high") return "rgba(22,163,74,0.14)";
  if (confidence === "medium") return "rgba(245,158,11,0.16)";
  return "rgba(148,163,184,0.16)";
}

export default function TrackingBodyScanSummaryCard({ capability }: TrackingBodyScanSummaryCardProps) {
  const composition = capability.data.composition;
  const range = composition?.bodyFatRangePct ?? null;
  const rangeStart = range ? Math.max(0, Math.min(100, (range.min / 45) * 100)) : 0;
  const rangeWidth = range ? Math.max(6, Math.min(100 - rangeStart, ((range.max - range.min) / 45) * 100)) : 0;
  const nextAction = capability.nextBestInputs[0] ?? "Mantener check-ins comparables cada 2-4 semanas.";

  return (
    <section className="rounded-3xl border border-[rgba(15,23,42,0.08)] bg-white/85 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Body scan</p>
          <h3 className="m-0 mt-2 text-xl font-semibold text-[var(--text)]">Composicion corporal</h3>
          <p className="m-0 mt-2 text-sm leading-6 text-[var(--muted)]">Lectura orientativa basada en fotos, medidas y registros recientes.</p>
        </div>
        <div
          className="rounded-2xl border border-[var(--border)] px-3 py-2 text-right"
          style={{ backgroundColor: getConfidenceTone(capability.confidence) }}
        >
          <p className="m-0 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Confianza</p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text)]">
            {getConfidenceBadge(capability.confidence)}
            {composition ? ` · ${composition.confidenceScore}/100` : ""}
          </p>
        </div>
      </div>

      {composition ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <article className="rounded-2xl border border-[var(--border)] bg-[rgba(248,250,252,0.95)] p-3 sm:p-4">
              <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">% grasa estimado</p>
              <p className="m-0 mt-2 text-2xl font-semibold text-[var(--text)]">{composition.bodyFatPercent.toFixed(1)}%</p>
              <p className="m-0 mt-2 text-sm text-[var(--muted)]">Rango: {composition.bodyFatRangePct.min.toFixed(1)}-{composition.bodyFatRangePct.max.toFixed(1)}%</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[rgba(248,250,252,0.95)] p-3 sm:p-4">
              <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Composicion</p>
              <p className="m-0 mt-2 text-2xl font-semibold text-[var(--text)]">{formatNumber(composition.leanMassKg, "kg")}</p>
              <p className="m-0 mt-2 text-sm text-[var(--muted)]">Masa grasa: {formatNumber(composition.fatMassKg, "kg")}</p>
            </article>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(59,130,246,0.08))] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Rango estimado</p>
              <p className="m-0 text-sm font-semibold text-[var(--text)]">{composition.bodyFatRangePct.min.toFixed(1)}% a {composition.bodyFatRangePct.max.toFixed(1)}%</p>
            </div>
            <div className="mt-4 h-3 rounded-full bg-white/80">
              <div className="relative h-full rounded-full bg-[rgba(148,163,184,0.2)]">
                <div
                  className="absolute top-0 h-full rounded-full bg-[linear-gradient(90deg,rgba(245,158,11,0.8),rgba(59,130,246,0.8))]"
                  style={{ left: `${rangeStart}%`, width: `${rangeWidth}%` }}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-4 rounded-2xl border border-[rgba(59,130,246,0.14)] bg-[rgba(239,246,255,0.72)] p-4 text-sm leading-6 text-[var(--text)]">
        <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Siguiente accion</p>
        <p className="m-0 mt-2 font-medium">{nextAction}</p>
      </div>

      <details className="mt-4 rounded-2xl border border-[var(--border)] bg-[rgba(248,250,252,0.8)] p-4 text-sm text-[var(--text)]">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Ver detalles</summary>
        {composition ? (
          <div className="mt-3 grid gap-3">
            <p className="m-0 leading-6">{composition.accuracyNote}</p>
            <div className="flex flex-wrap gap-2">
              {composition.sources.map((source) => (
                <span key={source} className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-xs text-[var(--text)]">
                  {SOURCE_LABELS[source]}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid gap-2">
          {capability.observations.slice(0, 2).map((item, index) => (
            <p key={`body-scan-observation-${index}`} className="m-0 leading-6">{item}</p>
          ))}
          {capability.nextBestInputs.slice(1, 3).map((item, index) => (
            <p key={`body-scan-next-${index}`} className="m-0 leading-6">{item}</p>
          ))}
        </div>
        <p className="m-0 mt-3 text-xs leading-5 text-[var(--muted)]">{capability.compliance.disclaimer}</p>
      </details>
    </section>
  );
}
