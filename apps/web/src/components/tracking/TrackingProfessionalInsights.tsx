"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProfessionalTrackingInsights } from "@/lib/trackingProfessionalMetrics";
import TrackingProfessionalHistoryTable from "@/components/tracking/TrackingProfessionalHistoryTable";
import styles from "./TrackingProfessionalInsights.module.css";

type Props = {
  insights: ProfessionalTrackingInsights;
};

function formatSignedMetric(value: number | null, suffix: string) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} ${suffix}`;
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%/sem`;
}

export default function TrackingProfessionalInsights({ insights }: Props) {
  const chartData = insights.weeklySeries.map((point) => ({
    label: point.label,
    peso: point.averageWeightKg,
    cintura: point.averageWaistCm,
    grasa: point.averageBodyFatPercent,
  }));

  return (
    <section className={`feature-card ${styles.shell}`} data-testid="tracking-professional-insights">
      <div className={styles.header}>
        <div>
          <h3 className="section-title section-title-sm">Lectura profesional</h3>
          <p className="muted">{insights.rangeConfig.analysisTitle}. {insights.rangeConfig.analysisDetail}</p>
        </div>
      </div>

      <div className={styles.scoreGrid}>
        <article className="feature-card feature-card--compact">
          <p className="muted">Rate of change</p>
          <strong>{formatPercent(insights.weeklyRatePct)}</strong>
          <span className="muted">{formatSignedMetric(insights.weeklyRateKg, "kg")}</span>
        </article>
        <article className="feature-card feature-card--compact">
          <p className="muted">Cintura semanal</p>
          <strong>{formatSignedMetric(insights.weeklyWaistDeltaCm, "cm")}</strong>
          <span className="muted">Nunca se interpreta aislada; siempre junto al peso.</span>
        </article>
        <article className="feature-card feature-card--compact">
          <p className="muted">Adherencia compuesta</p>
          <strong>{insights.combinedAdherencePct}%</strong>
          <span className="muted">Check-in {insights.checkinConsistencyPct}% · Nutricion {insights.nutritionLoggingPct}% · Entreno {insights.trainingConsistencyPct}%</span>
        </article>
        <article className="feature-card feature-card--compact">
          <p className="muted">Energia vs hambre</p>
          <strong>
            {insights.currentWindow?.averageEnergy?.toFixed(1) ?? "-"} / {insights.currentWindow?.averageHunger?.toFixed(1) ?? "-"}
          </strong>
          <span className="muted">{insights.rangeConfig.energyDetail}</span>
        </article>
      </div>

      {insights.waistHip ? (
        <div className={styles.waistHipCard}>
          <div>
            <p className="muted">Ratio cintura/cadera</p>
            <strong>{insights.waistHip.ratio.toFixed(2)}</strong>
          </div>
          <div>
            <strong>{insights.waistHip.assessment.label}</strong>
            <p className="muted">{insights.waistHip.assessment.detail}</p>
          </div>
        </div>
      ) : null}

      <div className={styles.columns}>
        <div className={styles.columnStack}>
          <div className={styles.alertGrid}>
            {insights.alerts.map((alert) => (
              <article key={alert.id} className={`${styles.alertCard} ${styles[`alert${alert.severity[0].toUpperCase()}${alert.severity.slice(1)}`]}`}>
                <strong>{alert.title}</strong>
                <p className="muted">{alert.detail}</p>
              </article>
            ))}
          </div>

          <div className={styles.signalGrid}>
            {insights.bodyCompositionSignals.map((signal) => (
              <article key={signal.id} className={`feature-card feature-card--compact ${styles.signalCard}`}>
                <strong>{signal.title}</strong>
                <p className="muted">{signal.detail}</p>
              </article>
            ))}
            {insights.recoveryCorrelation.map((signal) => (
              <article key={signal.id} className={`feature-card feature-card--compact ${styles.signalCard}`}>
                <strong>{signal.title}</strong>
                <p className="muted">{signal.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.columnStack}>
          <div className="feature-card feature-card--compact">
            <h4 className="section-title section-title-sm">Tendencia semanal</h4>
            {chartData.every((point) => point.peso === null && point.cintura === null && point.grasa === null) ? (
              <p className="muted">Todavia no hay semanas suficientes con datos consistentes para dibujar la tendencia.</p>
            ) : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="color-mix(in srgb, var(--border) 70%, transparent)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={40} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
                        background: "var(--bg-card)",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="peso" name="Peso" stroke="var(--accent)" strokeWidth={2.2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="cintura" name="Cintura" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="grasa" name="% grasa" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="feature-card feature-card--compact">
            <h4 className="section-title section-title-sm">Historico diario normalizado</h4>
            <TrackingProfessionalHistoryTable rows={insights.historyRows.slice(0, 12)} />
          </div>
        </div>
      </div>
    </section>
  );
}
