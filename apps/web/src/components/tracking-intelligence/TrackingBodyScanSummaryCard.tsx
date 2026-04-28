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
  const detailItems = [
    ...capability.observations.slice(0, 1),
    ...capability.nextBestInputs.slice(1, 2),
  ];
  const quickStats = composition
    ? [
        { label: "Masa magra", value: formatNumber(composition.leanMassKg, "kg") },
        { label: "Masa grasa", value: formatNumber(composition.fatMassKg, "kg") },
        { label: "Fuentes", value: `${composition.sources.length}` },
      ]
    : [];

  return (
    <section className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/85 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Body scan</p>
          <h3 className="m-0 mt-1 text-lg font-semibold text-[var(--text)] sm:text-xl">Composicion corporal</h3>
          <p className="m-0 mt-1 text-sm leading-5 text-[var(--muted)]">Lectura orientativa con fotos, medidas y check-ins recientes.</p>
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
          <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(245,158,11,0.09),rgba(59,130,246,0.08))] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Grasa estimada</p>
                <p className="m-0 mt-1 text-[2rem] font-semibold leading-none text-[var(--text)] sm:text-[2.4rem]">{composition.bodyFatPercent.toFixed(1)}%</p>
              </div>
              <p className="m-0 rounded-full bg-white/75 px-3 py-1 text-sm font-medium text-[var(--text)]">
                {composition.bodyFatRangePct.min.toFixed(1)}% a {composition.bodyFatRangePct.max.toFixed(1)}%
              </p>
            </div>

            <div className="mt-3 h-2 rounded-full bg-white/80">
              <div className="relative h-full rounded-full bg-[rgba(148,163,184,0.2)]">
                <div
                  className="absolute top-0 h-full rounded-full bg-[linear-gradient(90deg,rgba(245,158,11,0.8),rgba(59,130,246,0.8))]"
                  style={{ left: `${rangeStart}%`, width: `${rangeWidth}%` }}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {quickStats.map((item) => (
                <article key={item.label} className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2.5">
                  <p className="m-0 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{item.label}</p>
                  <p className="m-0 mt-1 text-sm font-semibold text-[var(--text)]">{item.value}</p>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-3 rounded-2xl border border-[rgba(59,130,246,0.14)] bg-[rgba(239,246,255,0.72)] p-3 text-sm leading-5 text-[var(--text)] sm:p-4">
        <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Siguiente paso</p>
        <p className="m-0 mt-1 font-medium">{nextAction}</p>
      </div>

      <details className="mt-3 rounded-2xl border border-[var(--border)] bg-[rgba(248,250,252,0.8)] p-3 text-sm text-[var(--text)] sm:p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Metodologia y notas</summary>
        {composition ? (
          <div className="mt-3 grid gap-3">
            <p className="m-0 leading-5">{composition.accuracyNote}</p>
            <div className="flex flex-wrap gap-2">
              {composition.sources.map((source) => (
                <span key={source} className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-xs text-[var(--text)]">
                  {SOURCE_LABELS[source]}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {detailItems.length > 0 ? (
          <ul className="mt-3 grid gap-2 pl-5 text-sm leading-5 text-[var(--text)]">
            {detailItems.map((item, index) => (
              <li key={`body-scan-detail-${index}`}>{item}</li>
            ))}
          </ul>
        ) : null}
        <p className="m-0 mt-3 text-xs leading-5 text-[var(--muted)]">{capability.compliance.disclaimer}</p>
      </details>
    </section>
  );
}
