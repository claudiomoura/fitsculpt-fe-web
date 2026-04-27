import Link from "next/link";
import type { TrackingBodyScanCapability } from "@/domains/tracking-intelligence";
import type { BodyFatScanExecutionResult } from "@/services/trackingBodyFatScan";

type MinimalCapability = Pick<TrackingBodyScanCapability, "state" | "nextBestInputs" | "compliance">;

type TrackingAiBodyFatScanPanelProps = {
  capability: MinimalCapability;
  estimatedTokens: number;
  tokenBalance: number | null;
  isProEligible: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  result: BodyFatScanExecutionResult | null;
  onAnalyze: () => void;
  onRetry: () => void;
  t: (key: string) => string;
  openHref?: string;
};

function formatConfidence(confidence: "low" | "medium" | "high", t: (key: string) => string) {
  if (confidence === "high") return t("tracking.aiBodyScan.confidenceHigh");
  if (confidence === "medium") return t("tracking.aiBodyScan.confidenceMedium");
  return t("tracking.aiBodyScan.confidenceLow");
}

export default function TrackingAiBodyFatScanPanel({
  capability,
  estimatedTokens,
  tokenBalance,
  isProEligible,
  isLoading,
  errorMessage,
  result,
  onAnalyze,
  onRetry,
  t,
  openHref = "/app/body-scan",
}: TrackingAiBodyFatScanPanelProps) {
  const hasInsufficientData = capability.state === "insufficient_data";
  const isTokenBlocked = typeof tokenBalance === "number" && tokenBalance < estimatedTokens;
  const isResultReady = result?.status === "completed" && Boolean(result.estimate);
  const resultErrorMessage = errorMessage ?? (result?.status === "failed" ? result.errorMessage ?? result.summary : null);

  return (
    <section
      id="ai-body-fat-scan"
      className="rounded-3xl border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(16,185,129,0.06),rgba(255,255,255,0.98),rgba(59,130,246,0.06))] p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-[42rem]">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            {t("tracking.aiBodyScan.eyebrow")}
          </p>
          <h3 className="m-0 mt-1 text-lg font-semibold text-[var(--text)]">{t("tracking.aiBodyScan.title")}</h3>
          <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">{t("tracking.aiBodyScan.subtitle")}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white/90 px-2 py-1 text-[10px] text-right text-[var(--muted)]">
          <p className="m-0">{tokenBalance ?? "-"} tokens</p>
        </div>
      </div>

      {isResultReady ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border border-[rgba(59,130,246,0.16)] bg-white/90 p-4">
            <p className="m-0 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.aiBodyScan.resultTitle")}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <p className="m-0 text-4xl font-semibold text-[var(--text)]">{result.estimate?.pointPercent.toFixed(1)}%</p>
                <p className="m-0 mt-1 text-xs text-[var(--muted)]">{formatConfidence(result.confidence, t)} · {result.confidenceScore ?? "-"}/100</p>
              </div>
              <div className="rounded-xl bg-[rgba(15,23,42,0.04)] px-2 py-1 text-right">
                <p className="m-0 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">rango</p>
                <p className="m-0 text-sm font-semibold text-[var(--text)]">
                  {result.estimate?.range.min.toFixed(0)}-{result.estimate?.range.max.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white/85 p-3">
            <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{t("tracking.aiBodyScan.nextActionsTitle")}</p>
            <div className="mt-2 space-y-1">
              {(result.nextActions.length > 0 ? result.nextActions : capability.nextBestInputs).slice(0, 2).map((item: string, index: number) => (
                <p key={`scan-next-${index}`} className="m-0 text-xs leading-4 text-[var(--text)]">{item}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!isProEligible ? (
        <div className="mt-4 rounded-2xl border border-[rgba(245,158,11,0.3)] bg-[rgba(255,247,237,0.92)] p-4">
          <p className="m-0 text-sm font-semibold text-[var(--text)]">{t("tracking.aiBodyScan.lockedTitle")}</p>
          <p className="m-0 mt-2 text-sm leading-6 text-[var(--text)]">{t("tracking.aiBodyScan.lockedBody")}</p>
          <div className="mt-3">
            <Link href="/app/settings/billing" className="btn primary fit-content">{t("billing.upgradePro")}</Link>
          </div>
        </div>
      ) : null}

      {isProEligible && hasInsufficientData ? (
        <div className="mt-4 rounded-2xl border border-[rgba(148,163,184,0.28)] bg-white/85 p-4">
          <p className="m-0 text-sm font-semibold text-[var(--text)]">{t("tracking.aiBodyScan.insufficientDataTitle")}</p>
          <p className="m-0 mt-2 text-sm leading-6 text-[var(--text)]">{t("tracking.aiBodyScan.insufficientDataBody")}</p>
          <div className="mt-3 space-y-1">
            {capability.nextBestInputs.slice(0, 3).map((item: string, index: number) => (
              <p key={`scan-input-${index}`} className="m-0 text-xs text-[var(--muted)]">• {item}</p>
            ))}
          </div>
        </div>
      ) : null}

      {isProEligible && !hasInsufficientData && isTokenBlocked ? (
        <div className="mt-4 rounded-2xl border border-[rgba(239,68,68,0.24)] bg-[rgba(254,242,242,0.95)] p-4">
          <p className="m-0 text-sm font-semibold text-[var(--text)]">{t("tracking.aiBodyScan.tokenBlockedTitle")}</p>
          <p className="m-0 mt-2 text-sm leading-6 text-[var(--text)]">{t("tracking.aiBodyScan.tokenBlockedBody")}</p>
          <div className="mt-3">
            <Link href="/app/settings/billing" className="btn secondary fit-content">{t("billing.manageBilling")}</Link>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <Link href={openHref} className="btn primary fit-content">{t("tracking.aiBodyScan.analyzeCta")}</Link>
        {!isResultReady && isProEligible && !hasInsufficientData && !isTokenBlocked ? (
          <button type="button" className={`btn secondary ${isLoading ? "is-loading" : ""}`} onClick={onAnalyze} disabled={isLoading}>
            {isLoading ? t("tracking.aiBodyScan.analyzing") : "Usar fotos"}
          </button>
        ) : null}
      </div>

      {resultErrorMessage ? (
        <div className="mt-3 rounded-2xl border border-[rgba(239,68,68,0.24)] bg-[rgba(254,242,242,0.92)] p-4" role="alert">
          <p className="m-0 text-sm text-[var(--text)]">{resultErrorMessage}</p>
          <div className="mt-3">
            <button type="button" className="btn secondary fit-content" onClick={onRetry}>Reintentar</button>
          </div>
        </div>
      ) : null}

      <p className="m-0 mt-3 text-[10px] leading-4 text-[var(--muted)] opacity-70">{capability.compliance.disclaimer}</p>
    </section>
  );
}
