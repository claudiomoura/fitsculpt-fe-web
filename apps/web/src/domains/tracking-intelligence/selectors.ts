import { addDays, parseDate, toDateKey } from "@/lib/calendar";
import type { ProfileData } from "@/lib/profile";
import { buildPassiveHealthOverview, defaultPassiveHealthData } from "@/lib/passiveHealth";
import { buildProfessionalTrackingInsights, normalizeDailyCheckins } from "@/lib/trackingProfessionalMetrics";
import type {
  CheckinEntry,
  MealLogEntry,
  PassiveHealthData,
  WorkoutEntry,
} from "@/services/tracking";
import type {
  TrackingAdherenceContext,
  TrackingPassiveSupportSnapshot,
  TrackingPhotoAvailability,
  TrackingPhotoComparison,
  TrackingTrendWindow,
} from "@/domains/tracking-intelligence/contracts";

export function buildTrackingProfileSnapshotFallback(profile: ProfileData): CheckinEntry | null {
  const weightKg = Number(profile.weightKg ?? 0);
  const bodyFatPercent = Number(profile.measurements.bodyFatPercent ?? 0);
  const waistCm = Number(profile.measurements.waistCm ?? 0);
  const chestCm = Number(profile.measurements.chestCm ?? 0);
  const hipsCm = Number(profile.measurements.hipsCm ?? 0);
  const bicepsCm = Number(profile.measurements.bicepsCm ?? 0);
  const thighCm = Number(profile.measurements.thighCm ?? 0);
  const calfCm = Number(profile.measurements.calfCm ?? 0);
  const neckCm = Number(profile.measurements.neckCm ?? 0);

  const hasAnyMetric = [
    weightKg,
    bodyFatPercent,
    waistCm,
    chestCm,
    hipsCm,
    bicepsCm,
    thighCm,
    calfCm,
    neckCm,
  ].some((value) => Number.isFinite(value) && value > 0);

  if (!hasAnyMetric) return null;

  return {
    id: "profile-snapshot",
    date: new Date().toISOString().slice(0, 10),
    weightKg: Number.isFinite(weightKg) ? weightKg : 0,
    chestCm: Number.isFinite(chestCm) ? chestCm : 0,
    waistCm: Number.isFinite(waistCm) ? waistCm : 0,
    hipsCm: Number.isFinite(hipsCm) ? hipsCm : 0,
    bicepsCm: Number.isFinite(bicepsCm) ? bicepsCm : 0,
    thighCm: Number.isFinite(thighCm) ? thighCm : 0,
    calfCm: Number.isFinite(calfCm) ? calfCm : 0,
    neckCm: Number.isFinite(neckCm) ? neckCm : 0,
    bodyFatPercent: Number.isFinite(bodyFatPercent) ? bodyFatPercent : 0,
    energy: 0,
    hunger: 0,
    notes: "",
    recommendation: "",
    frontPhotoUrl: null,
    sidePhotoUrl: null,
  };
}

export function detectTrackingSupport(entries?: Array<Record<string, unknown>> | null) {
  if (!entries || entries.length === 0) {
    return {
      energy: false,
      notes: false,
      bodyFat: false,
      waist: false,
      measurements: false,
    };
  }

  const hasField = (field: string) =>
    entries.some((entry) => Object.prototype.hasOwnProperty.call(entry, field));

  const measurementFields = [
    "chestCm",
    "hipsCm",
    "bicepsCm",
    "thighCm",
    "calfCm",
    "neckCm",
  ];

  return {
    energy: hasField("energy"),
    notes: hasField("notes"),
    bodyFat: hasField("bodyFatPercent"),
    waist: hasField("waistCm"),
    measurements: measurementFields.some((field) => hasField(field)),
  };
}

export function selectTrackingAnalysisCheckins(checkins: CheckinEntry[], profile: ProfileData): CheckinEntry[] {
  if (checkins.length > 0) return checkins;
  const fallback = buildTrackingProfileSnapshotFallback(profile);
  return fallback ? [fallback] : [];
}

export function selectNormalizedTrackingCheckins(checkins: CheckinEntry[], profile: ProfileData): CheckinEntry[] {
  return normalizeDailyCheckins(selectTrackingAnalysisCheckins(checkins, profile));
}

export function selectLatestTrackingCheckin(checkins: CheckinEntry[], profile?: ProfileData): CheckinEntry | null {
  const source = profile ? selectTrackingAnalysisCheckins(checkins, profile) : checkins;
  if (source.length === 0) return null;
  return [...source].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function buildTrackingTrendWindow(rangeDays: number, referenceDate = new Date()): TrackingTrendWindow {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = addDays(end, -(Math.max(1, rangeDays) - 1));
  start.setHours(0, 0, 0, 0);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    rangeDays: Math.max(1, rangeDays),
  };
}

export function selectCheckinsInTrendWindow(
  checkins: CheckinEntry[],
  rangeDays: number,
  referenceDate = new Date(),
): CheckinEntry[] {
  const window = buildTrackingTrendWindow(rangeDays, referenceDate);
  const start = parseDate(window.startDate);
  const end = parseDate(window.endDate);
  if (!start || !end) return [];

  return checkins.filter((entry) => {
    const parsed = parseDate(entry.date);
    return parsed ? parsed >= start && parsed <= end : false;
  });
}

export function selectTrackingPhotoAvailability(entry: CheckinEntry | null | undefined): TrackingPhotoAvailability {
  const hasFrontPhoto = Boolean(entry?.frontPhotoUrl);
  const hasSidePhoto = Boolean(entry?.sidePhotoUrl);

  return {
    hasFrontPhoto,
    hasSidePhoto,
    hasAnyPhoto: hasFrontPhoto || hasSidePhoto,
  };
}

export function selectTrackingPhotoComparison(checkins: CheckinEntry[]): TrackingPhotoComparison {
  const entriesWithPhotos = [...checkins]
    .filter((entry) => selectTrackingPhotoAvailability(entry).hasAnyPhoto)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    current: entriesWithPhotos[0] ?? null,
    baseline: entriesWithPhotos.length > 1 ? entriesWithPhotos[entriesWithPhotos.length - 1] ?? null : null,
    totalEntriesWithPhotos: entriesWithPhotos.length,
  };
}

export function selectPassiveSupportSnapshot(
  passiveData: PassiveHealthData | null | undefined,
  rangeDays: number,
): TrackingPassiveSupportSnapshot {
  const safePassiveData = passiveData ?? defaultPassiveHealthData;
  const window = buildTrackingTrendWindow(rangeDays);
  const start = parseDate(window.startDate);
  const end = parseDate(window.endDate);

  const snapshots = safePassiveData.snapshots.filter((entry) => {
    const parsed = parseDate(entry.date);
    return parsed && start && end ? parsed >= start && parsed <= end : false;
  });

  return {
    snapshots,
    lastSyncAt: safePassiveData.lastSyncAt,
    lastSyncSource: safePassiveData.lastSyncSource,
  };
}

export function selectPassiveSupportOverview(
  passiveData: PassiveHealthData | null | undefined,
  rangeDays: number,
  targetSessionsPerWeek: number,
) {
  const window = buildTrackingTrendWindow(rangeDays);

  return buildPassiveHealthOverview(passiveData ?? defaultPassiveHealthData, {
    startDate: window.startDate,
    endDate: window.endDate,
    targetSessions: targetSessionsPerWeek,
  });
}

export function selectTrackingAdherenceContext(input: {
  checkins: CheckinEntry[];
  mealLog: MealLogEntry[];
  workoutLog: WorkoutEntry[];
  passiveData: PassiveHealthData | null | undefined;
  profile: ProfileData;
  rangeDays: number;
}): TrackingAdherenceContext & {
  professionalInsights: ReturnType<typeof buildProfessionalTrackingInsights>;
} {
  const checkins = selectTrackingAnalysisCheckins(input.checkins, input.profile);
  const trendWindow = buildTrackingTrendWindow(input.rangeDays);
  const passiveSupport = selectPassiveSupportSnapshot(input.passiveData, input.rangeDays);

  return {
    checkins,
    mealLog: input.mealLog,
    workoutLog: input.workoutLog,
    passiveSupport,
    trendWindow,
    targetSessionsPerWeek: Number(input.profile.trainingPreferences.daysPerWeek ?? 0),
    professionalInsights: buildProfessionalTrackingInsights({
      checkins,
      mealLog: input.mealLog,
      workoutLog: input.workoutLog,
      profile: input.profile,
      rangeDays: input.rangeDays,
    }),
  };
}
