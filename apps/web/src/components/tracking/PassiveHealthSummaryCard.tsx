"use client";

import { useMemo, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { useLanguage } from "@/context/LanguageProvider";
import { buildDemoPassiveSnapshots, getPassiveSourceLabel, type PassiveHealthOverview } from "@/lib/passiveHealth";
import type { PassiveHealthData, PassiveHealthSnapshot } from "@/services/tracking";

type Props = {
  passiveData: PassiveHealthData;
  overview: PassiveHealthOverview;
  endDate: string;
  onSaveSnapshot: (snapshot: PassiveHealthSnapshot) => Promise<void>;
  onLoadDemo: (snapshots: PassiveHealthSnapshot[]) => Promise<void>;
  onSyncDevice?: () => Promise<void>;
  showDeviceSyncCta?: boolean;
  syncPending?: boolean;
  disabled?: boolean;
};

export default function PassiveHealthSummaryCard({ passiveData, overview, endDate, onSaveSnapshot, onLoadDemo, onSyncDevice, showDeviceSyncCta = true, syncPending = false, disabled = false }: Props) {
  const { t } = useLanguage();
  const [steps, setSteps] = useState("8500");
  const [activeMinutes, setActiveMinutes] = useState("35");
  const [activeCalories, setActiveCalories] = useState("320");
  const [sleepHours, setSleepHours] = useState("7.5");
  const [restingHeartRate, setRestingHeartRate] = useState("60");
  const [exerciseSessions, setExerciseSessions] = useState("0");
  const [pending, setPending] = useState<"save" | "demo" | null>(null);
  const [isManualSyncOpen, setIsManualSyncOpen] = useState(false);
  const [isReadoutOpen, setIsReadoutOpen] = useState(false);

  const latestSource = useMemo(() => {
    if (!passiveData.lastSyncSource) return null;
    return getPassiveSourceLabel(passiveData.lastSyncSource);
  }, [passiveData.lastSyncSource]);

  const sourceBreakdown = useMemo(() => {
    const androidSyncSources = new Set(["health_connect", "google_fit", "fitbit", "garmin", "wearable", "apple_health", "smart_scale"]);
    let androidCount = 0;
    let manualCount = 0;

    passiveData.snapshots.forEach((snapshot) => {
      if (androidSyncSources.has(snapshot.source)) {
        androidCount += 1;
      } else {
        manualCount += 1;
      }
    });

    const mode = androidCount > 0 ? "android" : manualCount > 0 ? "manual" : "none";
    return { mode, androidCount, manualCount };
  }, [passiveData.snapshots]);

  async function handleSave() {
    setPending("save");
    try {
      await onSaveSnapshot({
        id: `manual-${endDate}`,
        date: endDate,
        source: "manual",
        provider: "Manual sync",
        steps: Number(steps),
        activeCalories: Number(activeCalories),
        activeMinutes: Number(activeMinutes),
        sleepHours: Number(sleepHours),
        restingHeartRate: Number(restingHeartRate),
        exerciseSessions: Number(exerciseSessions),
        note: "Manual sync",
        syncedAt: `${endDate}T08:00:00.000Z`,
      });
    } finally {
      setPending(null);
    }
  }

  async function handleDemoLoad() {
    setPending("demo");
    try {
      await onLoadDemo(buildDemoPassiveSnapshots(endDate));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="card border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(160deg,rgba(238,247,255,0.96),rgba(255,255,255,0.98)_56%,rgba(246,252,242,0.98))]" data-testid="passive-health-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{t("tracking.passiveKicker")}</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text)]">{t("tracking.passiveTitle")}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t("tracking.passiveDescription")}</p>
        </div>
        <div className="rounded-2xl border border-white/75 bg-white/85 px-4 py-3 text-sm shadow-sm">
          <p className="font-medium text-[var(--text)]">{latestSource ? `${t("tracking.passiveLatestSync")}: ${latestSource}` : t("tracking.passiveNoSync")}</p>
          <p className="mt-1 text-[var(--muted)]">{t("tracking.passiveComplementLabel")}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]" data-testid="passive-source-mode">
            {sourceBreakdown.mode === "android"
              ? `Fuente activa: Android Sync (${sourceBreakdown.androidCount})`
              : sourceBreakdown.mode === "manual"
                ? `Fuente activa: Manual (${sourceBreakdown.manualCount})`
                : "Fuente activa: Sin sincronización"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-5 md:gap-3">
        <article className="rounded-2xl border border-white/80 bg-white/88 p-3.5 shadow-sm md:p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveActiveDays")}</p>
          <p className="mt-2 text-2xl font-semibold">{overview.activeDays}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/88 p-3.5 shadow-sm md:p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveSteps")}</p>
          <p className="mt-2 text-2xl font-semibold">{overview.totalSteps.toLocaleString()}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/88 p-3.5 shadow-sm md:p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveMinutes")}</p>
          <p className="mt-2 text-2xl font-semibold">{overview.totalActiveMinutes}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/88 p-3.5 shadow-sm md:p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveSleep")}</p>
          <p className="mt-2 text-2xl font-semibold">{overview.averageSleepHours ?? "-"}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/88 p-3.5 shadow-sm md:p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveSupport")}</p>
          <p className="mt-2 text-2xl font-semibold">+{overview.supportPct}%</p>
        </article>
      </div>

      <div className="mt-5 grid gap-3">
        <details
          className="rounded-2xl border border-white/80 bg-white/82"
          onToggle={(event) =>
            setIsManualSyncOpen((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("tracking.passiveManualSyncTitle")}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{t("tracking.passiveManualSyncHelper")}</p>
            </div>
            <span className="text-xs font-semibold text-[var(--muted)]">{isManualSyncOpen ? t("ui.showLess") : t("ui.viewAll")}</span>
          </summary>
          <div className="grid gap-3 border-t border-white/80 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input label={t("tracking.passiveSteps")} value={steps} onChange={(event) => setSteps(event.target.value)} inputMode="numeric" />
              <Input label={t("tracking.passiveMinutes")} value={activeMinutes} onChange={(event) => setActiveMinutes(event.target.value)} inputMode="numeric" />
              <Input label={t("tracking.passiveCalories")} value={activeCalories} onChange={(event) => setActiveCalories(event.target.value)} inputMode="numeric" />
              <Input label={t("tracking.passiveSleep")} value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} inputMode="decimal" />
              <Input label={t("tracking.passiveRestingHr")} value={restingHeartRate} onChange={(event) => setRestingHeartRate(event.target.value)} inputMode="numeric" />
              <Input label={t("tracking.passiveExerciseSessions")} value={exerciseSessions} onChange={(event) => setExerciseSessions(event.target.value)} inputMode="numeric" />
            </div>
            {!showDeviceSyncCta ? (
              <p className="m-0 text-sm text-[var(--muted)]">{t("tracking.passiveAndroidUnavailable")}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="primary" onClick={() => void handleSave()} disabled={disabled || pending !== null}>
                {pending === "save" ? t("tracking.passiveSaving") : t("tracking.passiveSaveManual")}
              </Button>
              {showDeviceSyncCta && onSyncDevice ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void onSyncDevice()}
                  disabled={disabled || pending !== null || syncPending}
                  aria-busy={syncPending}
                >
                  {syncPending
                    ? t("tracking.passiveSyncAndroidPending")
                    : t("tracking.passiveSyncAndroid")}
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => void handleDemoLoad()} disabled={disabled || pending !== null}>
                {pending === "demo" ? t("tracking.passiveSaving") : t("tracking.passiveLoadDemo")}
              </Button>
            </div>
          </div>
        </details>

        <details
          className="rounded-2xl border border-white/80 bg-white/82"
          onToggle={(event) =>
            setIsReadoutOpen((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("tracking.passiveReadoutTitle")}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{t("tracking.passiveReadoutHelper")}</p>
            </div>
            <span className="text-xs font-semibold text-[var(--muted)]">{isReadoutOpen ? t("ui.showLess") : t("ui.viewAll")}</span>
          </summary>
          <div className="space-y-2 border-t border-white/80 px-4 py-4 text-sm text-[var(--text)]">
            <p>{t("tracking.passiveReadoutManualVsPassive")}</p>
            <p>{t("tracking.passiveReadoutSupport")}</p>
            <p>{overview.sourceCount > 0 ? `${t("tracking.passiveSourcesUsed")}: ${overview.sourceCount}` : t("tracking.passiveNoSync")}</p>
          </div>
        </details>
      </div>
    </section>
  );
}
