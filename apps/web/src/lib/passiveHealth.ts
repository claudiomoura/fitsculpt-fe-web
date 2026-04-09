import type { PassiveHealthData, PassiveHealthSnapshot, PassiveHealthSource } from "@/services/tracking";

export type PassiveHealthOverview = {
  activeDays: number;
  totalSteps: number;
  totalActiveMinutes: number;
  averageSleepHours: number | null;
  averageRestingHeartRate: number | null;
  sourceCount: number;
  latestSyncAt: string | null;
  supportPct: number;
  snapshotsInRange: PassiveHealthSnapshot[];
};

export const defaultPassiveHealthData: PassiveHealthData = {
  snapshots: [],
  lastSyncAt: null,
  lastSyncSource: null,
};

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 1);
}

export function buildPassiveHealthOverview(
  passiveData: PassiveHealthData | null | undefined,
  args: { startDate: string; endDate: string; targetSessions?: number },
): PassiveHealthOverview {
  const data = passiveData ?? defaultPassiveHealthData;
  const snapshotsInRange = data.snapshots.filter((entry) => entry.date >= args.startDate && entry.date <= args.endDate);
  const activeDays = new Set(
    snapshotsInRange
      .filter((entry) => (entry.steps ?? 0) >= 7000 || (entry.activeMinutes ?? 0) >= 25 || entry.exerciseSessions >= 1)
      .map((entry) => entry.date),
  ).size;
  const totalSteps = snapshotsInRange.reduce((sum, entry) => sum + Math.max(0, Math.round(entry.steps ?? 0)), 0);
  const totalActiveMinutes = snapshotsInRange.reduce((sum, entry) => sum + Math.max(0, Math.round(entry.activeMinutes ?? 0)), 0);
  const sourceCount = new Set(snapshotsInRange.map((entry) => entry.provider ?? entry.source)).size;

  const targetSessions = Math.max(0, Math.round(args.targetSessions ?? 0));
  const daySupport = activeDays >= 5 ? 15 : activeDays >= 4 ? 12 : activeDays >= 3 ? 8 : activeDays >= 2 ? 5 : 0;
  const volumeSupport =
    totalActiveMinutes >= 150 || totalSteps >= 56000
      ? 10
      : totalActiveMinutes >= 90 || totalSteps >= 42000
        ? 7
        : totalActiveMinutes >= 60 || totalSteps >= 28000
          ? 4
          : 0;
  const supportPct = targetSessions > 0 && activeDays >= 2 ? Math.min(25, daySupport + volumeSupport) : 0;

  return {
    activeDays,
    totalSteps,
    totalActiveMinutes,
    averageSleepHours: average(snapshotsInRange.map((entry) => entry.sleepHours).filter((value): value is number => value !== null)),
    averageRestingHeartRate: average(snapshotsInRange.map((entry) => entry.restingHeartRate).filter((value): value is number => value !== null)),
    sourceCount,
    latestSyncAt: data.lastSyncAt,
    supportPct,
    snapshotsInRange,
  };
}

export function buildDemoPassiveSnapshots(endDate: string): PassiveHealthSnapshot[] {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const seeds = [
    { steps: 8120, activeMinutes: 34, activeCalories: 310, sleepHours: 7.3, restingHeartRate: 61, exerciseSessions: 0 },
    { steps: 10940, activeMinutes: 51, activeCalories: 420, sleepHours: 7.8, restingHeartRate: 59, exerciseSessions: 1 },
    { steps: 6540, activeMinutes: 22, activeCalories: 250, sleepHours: 6.9, restingHeartRate: 63, exerciseSessions: 0 },
    { steps: 12210, activeMinutes: 58, activeCalories: 470, sleepHours: 8.1, restingHeartRate: 58, exerciseSessions: 1 },
    { steps: 7460, activeMinutes: 29, activeCalories: 280, sleepHours: 7.5, restingHeartRate: 60, exerciseSessions: 0 },
  ];

  return seeds.map((seed, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (seeds.length - index - 1));
    const isoDate = date.toISOString().slice(0, 10);
    return {
      id: `demo-${isoDate}`,
      date: isoDate,
      source: "demo",
      provider: "Demo Sync",
      steps: seed.steps,
      activeCalories: seed.activeCalories,
      activeMinutes: seed.activeMinutes,
      sleepHours: seed.sleepHours,
      restingHeartRate: seed.restingHeartRate,
      bodyWeightKg: null,
      bodyFatPercent: null,
      exerciseSessions: seed.exerciseSessions,
      note: "Demo sync",
      syncedAt: `${isoDate}T08:00:00.000Z`,
    };
  });
}

export function getPassiveSourceLabel(source: PassiveHealthSource): string {
  switch (source) {
    case "apple_health":
      return "Apple Health";
    case "google_fit":
      return "Google Fit";
    case "health_connect":
      return "Health Connect";
    case "fitbit":
      return "Fitbit";
    case "garmin":
      return "Garmin";
    case "smart_scale":
      return "Smart Scale";
    case "wearable":
      return "Wearable";
    case "demo":
      return "Demo sync";
    case "other":
      return "Other";
    default:
      return "Manual";
  }
}
