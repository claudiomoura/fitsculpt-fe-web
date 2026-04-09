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
  disabled?: boolean;
};

export default function PassiveHealthSummaryCard({ passiveData, overview, endDate, onSaveSnapshot, onLoadDemo, onSyncDevice, disabled = false }: Props) {
  const { t } = useLanguage();
  const [steps, setSteps] = useState("8500");
  const [activeMinutes, setActiveMinutes] = useState("35");
  const [activeCalories, setActiveCalories] = useState("320");
  const [sleepHours, setSleepHours] = useState("7.5");
  const [restingHeartRate, setRestingHeartRate] = useState("60");
  const [exerciseSessions, setExerciseSessions] = useState("0");
  const [pending, setPending] = useState<"save" | "demo" | null>(null);

  const latestSource = useMemo(() => {
    if (!passiveData.lastSyncSource) return null;
    return getPassiveSourceLabel(passiveData.lastSyncSource);
  }, [passiveData.lastSyncSource]);

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
    <section className="card border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(231,245,255,0.92),rgba(255,255,255,0.96)_52%,rgba(244,252,241,0.96))]" data-testid="passive-health-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{t("tracking.passiveKicker")}</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text)]">{t("tracking.passiveTitle")}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t("tracking.passiveDescription")}</p>
        </div>
        <div className="rounded-2xl border border-white/75 bg-white/80 px-4 py-3 text-sm shadow-sm">
          <p className="font-medium text-[var(--text)]">{latestSource ? `${t("tracking.passiveLatestSync")}: ${latestSource}` : t("tracking.passiveNoSync")}</p>
          <p className="mt-1 text-[var(--muted)]">{t("tracking.passiveComplementLabel")}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveActiveDays")}</p>
          <p className="mt-2 text-2xl font-semibold">{overview.activeDays}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveSteps")}</p>
          <p className="mt-2 text-2xl font-semibold">{overview.totalSteps.toLocaleString()}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveMinutes")}</p>
          <p className="mt-2 text-2xl font-semibold">{overview.totalActiveMinutes}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveSleep")}</p>
          <p className="mt-2 text-2xl font-semibold">{overview.averageSleepHours ?? "-"}</p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("tracking.passiveSupport")}</p>
          <p className="mt-2 text-2xl font-semibold">+{overview.supportPct}%</p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/80 bg-white/78 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("tracking.passiveManualSyncTitle")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label={t("tracking.passiveSteps")} value={steps} onChange={(event) => setSteps(event.target.value)} inputMode="numeric" />
            <Input label={t("tracking.passiveMinutes")} value={activeMinutes} onChange={(event) => setActiveMinutes(event.target.value)} inputMode="numeric" />
            <Input label={t("tracking.passiveCalories")} value={activeCalories} onChange={(event) => setActiveCalories(event.target.value)} inputMode="numeric" />
            <Input label={t("tracking.passiveSleep")} value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} inputMode="decimal" />
            <Input label={t("tracking.passiveRestingHr")} value={restingHeartRate} onChange={(event) => setRestingHeartRate(event.target.value)} inputMode="numeric" />
            <Input label={t("tracking.passiveExerciseSessions")} value={exerciseSessions} onChange={(event) => setExerciseSessions(event.target.value)} inputMode="numeric" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="primary" onClick={() => void handleSave()} disabled={disabled || pending !== null}>
              {pending === "save" ? t("tracking.passiveSaving") : t("tracking.passiveSaveManual")}
            </Button>
            {onSyncDevice ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => void onSyncDevice()} disabled={disabled || pending !== null}>
                Sincronizar Android
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={() => void handleDemoLoad()} disabled={disabled || pending !== null}>
              {pending === "demo" ? t("tracking.passiveSaving") : t("tracking.passiveLoadDemo")}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/78 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("tracking.passiveReadoutTitle")}</p>
          <div className="mt-3 space-y-2 text-sm text-[var(--text)]">
            <p>{t("tracking.passiveReadoutManualVsPassive")}</p>
            <p>{t("tracking.passiveReadoutSupport")}</p>
            <p>{overview.sourceCount > 0 ? `${t("tracking.passiveSourcesUsed")}: ${overview.sourceCount}` : t("tracking.passiveNoSync")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
