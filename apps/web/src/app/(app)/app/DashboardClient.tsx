"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";

type CheckinEntry = {
  date: string;
  weightKg: number;
  bodyFatPercent: number;
};

type TrackingPayload = {
  checkins?: CheckinEntry[];
};

type ChartPoint = {
  label: string;
  value: number;
};

function buildSeries(checkins: CheckinEntry[], key: "weightKg" | "bodyFatPercent") {
  return [...checkins]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ label: entry.date, value: entry[key] }));
}

function LineChart({ data, unit }: { data: ChartPoint[]; unit: string }) {
  if (data.length === 0) return null;

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const width = 120;
  const height = 40;
  const padding = 6;

  const points = data.map((point, index) => {
    const x = padding + (index / Math.max(1, data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (point.value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const latest = data[data.length - 1];

  return (
    <div className="chart-wrapper">
      <div className="chart-meta">
        <strong>
          {latest.value} {unit}
        </strong>
        <span className="muted">{latest.label}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img">
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={path}
        />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="2.2" fill="var(--accent)" />
        ))}
      </svg>
    </div>
  );
}

export default function DashboardClient() {
  const { t } = useLanguage();
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadTracking = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("LOAD_ERROR");
        const data = (await response.json()) as TrackingPayload;
        if (active) setCheckins(data.checkins ?? []);
      } catch {
        if (active) setError(t("dashboard.chartError"));
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTracking();
    return () => {
      active = false;
    };
  }, [t]);

  const weightSeries = useMemo(() => buildSeries(checkins, "weightKg"), [checkins]);
  const bodyFatSeries = useMemo(() => buildSeries(checkins, "bodyFatPercent"), [checkins]);

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("dashboard.aiSectionTitle")}</h2>
            <p className="section-subtitle">{t("dashboard.aiSectionSubtitle")}</p>
          </div>
        </div>
        <div className="list-grid" style={{ marginTop: 16 }}>
          <div className="feature-card" style={{ display: "grid", gap: 12 }}>
            <div>
              <strong>{t("dashboard.aiTrainingTitle")}</strong>
              <p className="muted" style={{ marginTop: 6 }}>{t("dashboard.aiTrainingSubtitle")}</p>
            </div>
            <Link className="btn" href="/app/entrenamiento?ai=1">
              {t("dashboard.aiTrainingCta")}
            </Link>
          </div>
          <div className="feature-card" style={{ display: "grid", gap: 12 }}>
            <div>
              <strong>{t("dashboard.aiNutritionTitle")}</strong>
              <p className="muted" style={{ marginTop: 6 }}>{t("dashboard.aiNutritionSubtitle")}</p>
            </div>
            <Link className="btn" href="/app/nutricion?ai=1">
              {t("dashboard.aiNutritionCta")}
            </Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("dashboard.progressTitle")}</h2>
            <p className="section-subtitle">{t("dashboard.progressSubtitle")}</p>
          </div>
          <Link className="btn secondary" href="/app/seguimiento">
            {t("dashboard.progressCta")}
          </Link>
        </div>

        {loading ? (
          <p className="muted" style={{ marginTop: 12 }}>{t("dashboard.progressLoading")}</p>
        ) : error ? (
          <p className="muted" style={{ marginTop: 12 }}>{error}</p>
        ) : checkins.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 12 }}>
            <p className="muted" style={{ margin: 0 }}>{t("dashboard.progressEmpty")}</p>
            <Link className="btn" href="/app/seguimiento" style={{ width: "fit-content", marginTop: 12 }}>
              {t("dashboard.progressEmptyCta")}
            </Link>
          </div>
        ) : (
          <div className="dashboard-charts">
            <div className="feature-card chart-card">
              <div className="chart-header">
                <h3>{t("dashboard.weightChartTitle")}</h3>
                <span className="muted">{t("dashboard.weightChartSubtitle")}</span>
              </div>
              <LineChart data={weightSeries} unit="kg" />
            </div>
            <div className="feature-card chart-card">
              <div className="chart-header">
                <h3>{t("dashboard.bodyFatChartTitle")}</h3>
                <span className="muted">{t("dashboard.bodyFatChartSubtitle")}</span>
              </div>
              <LineChart data={bodyFatSeries} unit="%" />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
