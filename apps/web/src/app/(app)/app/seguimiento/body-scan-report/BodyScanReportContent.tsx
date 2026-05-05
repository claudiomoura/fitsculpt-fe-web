"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import { getTrackingRangeConfig } from "@/lib/trackingProfessionalRules";
import {
  buildTrackingBodyScanCapability,
  estimateTrackingBodyScanTokens,
  selectPassiveSupportOverview,
  type TrackingBodyScanCapability,
  type TrackingRecommendationCapability,
} from "@/domains/tracking-intelligence";
import { hasAiEntitlement } from "@/components/access/aiEntitlements";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getUserProfile } from "@/lib/profileService";
import { defaultPassiveHealthData } from "@/lib/passiveHealth";
import type {
  CheckinEntry,
  PassiveHealthData,
  WorkoutEntry,
} from "@/services/tracking";
import type { BodyFatScanExecutionResult } from "@/services/trackingBodyFatScan";
import TrackingAiBodyFatScanPanel from "@/components/tracking-intelligence/TrackingAiBodyFatScanPanel";
import styles from "./BodyScanReportContent.module.css";

type BodyScanReportContentProps = {
  profile: ProfileData;
  checkins: CheckinEntry[];
  passiveData: PassiveHealthData;
  progressRange: number;
  tokenBalance: number | null;
  recommendationCapability: TrackingRecommendationCapability;
  bodyFatScanResult: BodyFatScanExecutionResult | null;
  bodyFatScanRunState: "idle" | "loading" | "failed";
  bodyFatScanRunError: string | null;
  onAnalyze: () => void;
  onRetry: () => void;
};

function formatNumber(value: number | null, suffix: string): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)} ${suffix}`;
}

function getConfidenceLabel(confidence: TrackingBodyScanCapability["confidence"]): string {
  if (confidence === "high") return "Alta";
  if (confidence === "medium") return "Media";
  return "Baja";
}

function getConfidenceBg(confidence: TrackingBodyScanCapability["confidence"]): string {
  if (confidence === "high") return "rgba(22,163,74,0.14)";
  if (confidence === "medium") return "rgba(245,158,11,0.16)";
  return "rgba(148,163,184,0.16)";
}

const SOURCE_LABELS: Record<string, string> = {
  manual_body_fat: "Grasa manual",
  us_navy: "Medidas",
  bmi_age: "Perfil base",
};

export default function BodyScanReportContent({
  profile,
  checkins,
  passiveData,
  progressRange,
  tokenBalance,
  recommendationCapability,
  bodyFatScanResult,
  bodyFatScanRunState,
  bodyFatScanRunError,
  onAnalyze,
  onRetry,
}: BodyScanReportContentProps) {
  const { t } = useLanguage();
  const hasPro = hasAiEntitlement(profile);
  const estimatedTokens = useMemo(
    () =>
      estimateTrackingBodyScanTokens({
        origin: "body_scan_report",
        profile,
        checkins,
        passiveData,
        rangeDays: progressRange,
      }),
    [profile, checkins, passiveData, progressRange],
  );
  const capability = useMemo(
    () =>
      buildTrackingBodyScanCapability({
        origin: "body_scan_report",
        profile,
        checkins,
        passiveData,
        rangeDays: progressRange,
      }),
    [profile, checkins, passiveData, progressRange],
  );
  const composition = capability.data.composition;
  const passive = useMemo(
    () => selectPassiveSupportOverview(passiveData, progressRange, 3),
    [passiveData, progressRange],
  );
  const range = composition?.bodyFatRangePct ?? null;
  const rangeStart = range ? Math.max(0, Math.min(100, (range.min / 45) * 100)) : 0;
  const rangeWidth = range ? Math.max(6, Math.min(100 - rangeStart, ((range.max - range.min) / 45) * 100)) : 0;
  const latestScanDate = checkins.length > 0
    ? [...checkins].sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null
    : null;
  const primaryNextAction = capability.nextBestInputs[0] ?? t("tracking.defaultNextAction") ?? "Mantén check-ins comparables cada 2 semanas.";
  const resultErrorMessage = bodyFatScanRunError ?? (bodyFatScanResult?.status === "failed" ? bodyFatScanResult.errorMessage ?? bodyFatScanResult.summary : null);
  const topObservations = capability.observations.slice(0, 2);

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>Reporte corporal</p>
        {composition ? (
          <>
            <p className={styles.heroEstimate}>{composition.bodyFatPercent.toFixed(1)}%</p>
            <p className={styles.heroRange}>
              {composition.bodyFatRangePct.min.toFixed(1)}% – {composition.bodyFatRangePct.max.toFixed(1)}%
            </p>
            <p className={styles.heroSupport}>
              {latestScanDate ? `${latestScanDate}` : capability.summary}
            </p>
          </>
        ) : (
          <p className={styles.heroSupport}>{capability.summary}</p>
        )}
        <div className={styles.heroCtas}>
          <Link href="/app/seguimiento/check-in" className="btn primary fit-content">
            Actualizar scan
          </Link>
          <Link href="/app/seguimiento" className={styles.heroSecondary}>Volver a progreso</Link>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Confianza y calidad de inputs</h2>
        <article className={styles.confidenceCard} style={{ backgroundColor: getConfidenceBg(capability.confidence) }}>
          <p className={styles.cardLabel}>Confianza del resultado</p>
          <p className={styles.confidenceBadge}>{getConfidenceLabel(capability.confidence)}</p>
          {composition ? (
            <>
              <p className={styles.confidenceScore}>{composition.confidenceScore}/100</p>
              <div className={styles.sourceList}>
                {composition.sources.map((s) => (
                  <span key={s} className={styles.sourceChip}>{SOURCE_LABELS[s] ?? s}</span>
                ))}
              </div>
              <p className={styles.cardMeta}>{checkins.length} check-in{checkins.length !== 1 ? "s" : ""} considerado{checkins.length !== 1 ? "s" : ""}</p>
            </>
          ) : (
            <p className={styles.cardMeta}>Sin suficientes inputs para un estimado.</p>
          )}
        </article>
      </section>

      {composition ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Composición corporal</h2>
          <div className={styles.heroEstimateRow}>
            <div>
              <p className={styles.cardLabel}>Grasa estimada</p>
              <p className={styles.bigNumber}>{composition.bodyFatPercent.toFixed(1)}%</p>
            </div>
            <span className={styles.rangeBadge}>
              {composition.bodyFatRangePct.min.toFixed(1)}% a {composition.bodyFatRangePct.max.toFixed(1)}%
            </span>
          </div>
          <div className={styles.rangeBar}>
            <div className={styles.rangeTrack}>
              <div
                className={styles.rangeFill}
                style={{ left: `${rangeStart}%`, width: `${rangeWidth}%` }}
              />
            </div>
          </div>
          <div className={styles.compositionGrid}>
            <article className={styles.metricCard}>
              <p className={styles.cardLabel}>Masa magra</p>
              <p className={styles.metricValue}>{formatNumber(composition.leanMassKg, "kg")}</p>
            </article>
            <article className={styles.metricCard}>
              <p className={styles.cardLabel}>Masa grasa</p>
              <p className={styles.metricValue}>{formatNumber(composition.fatMassKg, "kg")}</p>
            </article>
          </div>
        </section>
      ) : null}

      {topObservations.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Lectura rápida</h2>
          <ul className={styles.observationList}>
            {topObservations.map((obs, i) => (
              <li key={i} className={styles.observationItem}>{obs}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Siguiente mejor paso</h2>
        <article className={styles.nextStepCard}>
          <p className={styles.nextStepAction}>{primaryNextAction}</p>
          <Link
            href={primaryNextAction.includes("foto") ? "/app/seguimiento/check-in" : primaryNextAction.includes("entren") ? "/app/entrenamiento" : primaryNextAction.includes("nutri") ? "/app/nutricion" : "/app/seguimiento"}
            className="btn primary fit-content"
          >
            {primaryNextAction.includes("foto") ? "Actualizar fotos" : primaryNextAction.includes("entren") ? "Ir a entrenamiento" : primaryNextAction.includes("nutri") ? "Ir a nutrición" : "Continuar"}
          </Link>
        </article>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Escaneo IA</h2>
        <TrackingAiBodyFatScanPanel
          capability={{
            state: capability.state,
            nextBestInputs: capability.nextBestInputs,
            compliance: capability.compliance,
          }}
          estimatedTokens={estimatedTokens}
          tokenBalance={tokenBalance}
          isProEligible={hasPro}
          isLoading={bodyFatScanRunState === "loading"}
          errorMessage={resultErrorMessage}
          result={bodyFatScanResult}
          onAnalyze={onAnalyze}
          onRetry={onRetry}
          t={t}
          openHref="/app/body-scan"
        />
      </section>

      <details className={styles.disclosure}>
        <summary className={styles.disclosureSummary}>
          <span>Metodología y límites</span>
          <span className={styles.disclosureIndicator}>Ver</span>
        </summary>
        <div className={styles.disclosureBody}>
          {composition ? <p className={styles.methodologyNote}>{composition.accuracyNote}</p> : null}
          <p className={styles.disclaimer}>{capability.compliance.disclaimer}</p>
        </div>
      </details>
    </div>
  );
}