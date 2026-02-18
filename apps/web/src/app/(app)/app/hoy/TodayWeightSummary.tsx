"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";

type CheckinEntry = {
  date?: string;
  weightKg?: number;
};

export default function TodayWeightSummary() {
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<CheckinEntry | null>(null);
  const mountedRef = useRef(true);

  const formatDate = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return (value?: string | null) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return formatter.format(date);
    };
  }, [locale]);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        if (mountedRef.current) {
          setError(t("today.lastWeightError"));
          setLatest(null);
        }
        return;
      }
      const data = (await response.json()) as { checkins?: CheckinEntry[] };
      const latestEntry = data.checkins?.length
        ? [...data.checkins].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
        : null;
      const hasWeight = Number.isFinite(latestEntry?.weightKg);
      if (mountedRef.current) {
        setLatest(hasWeight ? latestEntry : null);
      }
    } catch (_err) {
      if (mountedRef.current) {
        setError(t("today.lastWeightError"));
        setLatest(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    mountedRef.current = true;
    void loadLatest();
    return () => {
      mountedRef.current = false;
    };
  }, [loadLatest]);

  const formattedDate = latest?.date ? formatDate(latest.date) : null;

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2 className="section-title section-title-sm">{t("today.lastWeightTitle")}</h2>
          <p className="section-subtitle">{t("today.lastWeightSubtitle")}</p>
        </div>
      </div>

      {loading ? (
        <div className="info-grid" aria-busy="true" aria-live="polite">
          <div className="info-item">
            <Skeleton variant="line" className="w-40" />
            <Skeleton variant="line" className="w-55" />
            <Skeleton variant="line" className="w-70" />
          </div>
        </div>
      ) : error ? (
        <div className="status-card status-card--warning">
          <div className="inline-actions-sm">
            <Icon name="warning" />
            <strong>{t("today.lastWeightErrorTitle")}</strong>
          </div>
          <p className="muted">{error}</p>
          <Button variant="secondary" onClick={loadLatest}>
            {t("ui.retry")}
          </Button>
        </div>
      ) : latest ? (
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("today.lastWeightValueLabel")}</div>
            <div className="info-value">
              {latest.weightKg} {t("units.kilograms")}
            </div>
            {formattedDate ? (
              <div className="muted">
                {t("today.lastWeightDateLabel")} {formattedDate}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="muted">{t("today.lastWeightEmpty")}</p>
      )}

      <div className="inline-actions" style={{ marginTop: 16 }}>
        <ButtonLink href="/app/seguimiento" size="lg">
          {t("today.recordWeightCta")}
        </ButtonLink>
      </div>
    </section>
  );
}
