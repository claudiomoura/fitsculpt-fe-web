"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import styles from "./TrackingClient.module.css";

export type TrackingSummaryRange = "7" | "30" | "90" | "180";

type TrackingSummaryMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

type TrackingPrimaryInsight = {
  title: string;
  chip: string;
  body: string;
};

type Props = {
  progressRange: TrackingSummaryRange;
  summaryKpis: TrackingSummaryMetric[];
  primaryInsight: TrackingPrimaryInsight;
  onProgressRangeChange: (range: TrackingSummaryRange) => void;
  onPrimaryAction: () => void;
};

const RANGE_OPTIONS: Array<{ id: TrackingSummaryRange; labelKey: string }> = [
  { id: "7", labelKey: "tracking.rangeWeek" },
  { id: "30", labelKey: "tracking.rangeMonth" },
  { id: "90", labelKey: "tracking.rangeQuarter" },
  { id: "180", labelKey: "tracking.rangeSemester" },
];

export default function TrackingSummaryPreview({
  progressRange,
  summaryKpis,
  primaryInsight,
  onProgressRangeChange,
  onPrimaryAction,
}: Props) {
  const { t } = useLanguage();

  return (
    <section
      id="weight-entry"
      className={`card premium-surface-card surface-content-card ${styles.heroCard} ${styles.quickCheckinHero} ${styles.summaryIntro}`}
    >
      <div className={styles.summaryHeader}>
        <div className={styles.summaryHeaderCopy}>
          <p className="eyebrow m-0">{t("tracking.pageEyebrow")}</p>
          <div>
            <h1 className="section-title m-0">{t("tracking.pageTitle")}</h1>
            <p className="section-subtitle m-0">{t("tracking.pageSubtitle")}</p>
          </div>
        </div>
        <div className={styles.summaryHeaderMeta}>
          <div
            className={styles.segmentedControl}
            role="tablist"
            aria-label={t("tracking.rangeLabel")}
          >
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.segmentedButton} ${progressRange === option.id ? styles.segmentedButtonActive : ""}`}
                onClick={() => onProgressRangeChange(option.id)}
                role="tab"
                aria-selected={progressRange === option.id}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          <div className={styles.heroPrimaryActionWrap}>
            <button
              type="button"
              className={`btn ${styles.heroPrimaryAction}`}
              onClick={onPrimaryAction}
            >
              {t("today.checkinPrimaryCta")}
            </button>
          </div>
        </div>
      </div>

      <section className={styles.summaryKpiGrid} aria-label={t("tracking.summaryTitle")}>
        {summaryKpis.map((metric) => (
          <article key={metric.id} className={styles.summaryKpiCard}>
            <p className="muted m-0">{metric.label}</p>
            <strong className={styles.summaryKpiValue}>{metric.value}</strong>
            <span className="muted">{metric.detail}</span>
          </article>
        ))}
      </section>

      <section className={styles.summaryInsightCard} aria-label={t("tracking.primaryInsightTitle")}>
        <div className={styles.summaryInsightHeader}>
          <div>
            <p className="muted m-0">{t("tracking.primaryInsightTitle")}</p>
            <h2 className="section-title section-title-sm m-0">{primaryInsight.title}</h2>
          </div>
          <span className={styles.summaryInsightChip}>{primaryInsight.chip}</span>
        </div>
        <p className="m-0">{primaryInsight.body}</p>
      </section>

      <Link className={styles.heroSecondaryLink} href="/app/weekly-review">
        {t("nav.weeklyReview")}
      </Link>
    </section>
  );
}
