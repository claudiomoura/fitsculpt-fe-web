import type {
  CheckinEntry,
  FoodEntry,
  MealLogEntry,
  PassiveHealthData,
  PassiveHealthSnapshot,
  PassiveHealthSource,
  TrackingCollection,
  TrackingEntryCreateInput,
  TrackingSnapshot,
  WeeklyCoachPersistedAdaptation,
  WeeklyCoachPersistedCheckIn,
  WeeklyCoachTrackingState,
  WorkoutEntry,
} from "./schemas.js";
import {
  defaultTracking,
  weeklyCoachPersistedAdaptationSchema,
  weeklyCoachPersistedCheckInSchema,
  weeklyCoachTrackingSchema,
} from "./schemas.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function toNullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function buildLegacyId(prefix: string, rawId: unknown, rawDate: unknown, index: number): string {
  const id = toText(rawId);
  if (id) return id;
  const date = toText(rawDate, "undated");
  return `${prefix}-${date}-${index + 1}`;
}

function normalizeCheckinEntry(entry: unknown, index: number): CheckinEntry | null {
  if (!isRecord(entry)) return null;
  const date = toText(entry.date);
  if (!date) return null;
  return {
    id: buildLegacyId("legacy-checkin", entry.id, date, index),
    date,
    weightKg: toNumber(entry.weightKg),
    chestCm: toNumber(entry.chestCm),
    waistCm: toNumber(entry.waistCm),
    hipsCm: toNumber(entry.hipsCm),
    bicepsCm: toNumber(entry.bicepsCm),
    thighCm: toNumber(entry.thighCm),
    calfCm: toNumber(entry.calfCm),
    neckCm: toNumber(entry.neckCm),
    bodyFatPercent: toNumber(entry.bodyFatPercent),
    energy: toNumber(entry.energy),
    hunger: toNumber(entry.hunger),
    notes: toText(entry.notes),
    recommendation: toText(entry.recommendation),
    frontPhotoUrl: toNullableText(entry.frontPhotoUrl),
    sidePhotoUrl: toNullableText(entry.sidePhotoUrl),
    backPhotoUrl: toNullableText(entry.backPhotoUrl),
  };
}

function normalizeFoodEntry(entry: unknown, index: number): FoodEntry | null {
  if (!isRecord(entry)) return null;
  const date = toText(entry.date);
  if (!date) return null;
  return {
    id: buildLegacyId("legacy-food", entry.id, date, index),
    date,
    foodKey: toText(entry.foodKey, `legacy-food-${index + 1}`),
    grams: toNumber(entry.grams),
  };
}

function normalizeWorkoutEntry(entry: unknown, index: number): WorkoutEntry | null {
  if (!isRecord(entry)) return null;
  const date = toText(entry.date);
  if (!date) return null;
  return {
    id: buildLegacyId("legacy-workout", entry.id, date, index),
    date,
    name: toText(entry.name, `Workout ${index + 1}`),
    durationMin: toNumber(entry.durationMin),
    notes: toText(entry.notes),
  };
}

function normalizeMealLogEntry(entry: unknown, index: number): MealLogEntry | null {
  if (!isRecord(entry)) return null;
  const date = toText(entry.date);
  if (!date) return null;
  return {
    id: buildLegacyId("legacy-meal", entry.id, date, index),
    date,
    mealKey: toText(entry.mealKey, `legacy-meal-${date}-${index + 1}`),
    mealType: toText(entry.mealType, "meal"),
    title: toText(entry.title, `Meal ${index + 1}`),
    calories: toNumber(entry.calories),
    protein: toNumber(entry.protein),
    carbs: toNumber(entry.carbs),
    fats: toNumber(entry.fats),
    completedAt: toText(entry.completedAt, `${date}T00:00:00.000Z`),
  };
}

function toPassiveSource(value: unknown): PassiveHealthSource {
  if (
    value === "manual" ||
    value === "demo" ||
    value === "apple_health" ||
    value === "google_fit" ||
    value === "health_connect" ||
    value === "fitbit" ||
    value === "garmin" ||
    value === "smart_scale" ||
    value === "wearable" ||
    value === "other"
  ) {
    return value;
  }
  return "manual";
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = toNumber(value, Number.NaN);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizePassiveHealthSnapshot(entry: unknown, index: number): PassiveHealthSnapshot | null {
  if (!isRecord(entry)) return null;
  const date = toText(entry.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return {
    id: buildLegacyId("legacy-passive", entry.id, date, index),
    date,
    source: toPassiveSource(entry.source),
    provider: toNullableText(entry.provider),
    steps: toNullableNumber(entry.steps),
    activeCalories: toNullableNumber(entry.activeCalories),
    activeMinutes: toNullableNumber(entry.activeMinutes),
    sleepHours: toNullableNumber(entry.sleepHours),
    restingHeartRate: toNullableNumber(entry.restingHeartRate),
    bodyWeightKg: toNullableNumber(entry.bodyWeightKg),
    bodyFatPercent: toNullableNumber(entry.bodyFatPercent),
    exerciseSessions: Math.max(0, Math.round(toNumber(entry.exerciseSessions))),
    note: toText(entry.note),
    syncedAt: toText(entry.syncedAt, `${date}T00:00:00.000Z`),
  };
}

export function normalizePassiveHealthData(value: unknown): PassiveHealthData {
  if (!isRecord(value)) {
    return defaultTracking.passiveData;
  }

  const snapshots = normalizeCollection(value.snapshots, normalizePassiveHealthSnapshot)
    .sort((a, b) => b.date.localeCompare(a.date) || b.syncedAt.localeCompare(a.syncedAt) || b.id.localeCompare(a.id))
    .slice(0, 180);

  return {
    snapshots,
    lastSyncAt: toNullableText(value.lastSyncAt),
    lastSyncSource: value.lastSyncSource ? toPassiveSource(value.lastSyncSource) : null,
  };
}

function normalizeWeeklyCoachPersistedCheckIn(
  planWeekId: string,
  value: unknown,
): WeeklyCoachPersistedCheckIn | null {
  const result = weeklyCoachPersistedCheckInSchema.safeParse(value);
  if (!result.success) {
    return null;
  }

  return result.data.weekContext.planWeekId === planWeekId ? result.data : null;
}

function normalizeWeeklyCoachPersistedAdaptation(value: unknown): WeeklyCoachPersistedAdaptation | null {
  const result = weeklyCoachPersistedAdaptationSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function normalizeWeeklyCoachTrackingState(value: unknown): WeeklyCoachTrackingState | undefined {
  if (!isRecord(value) || !isRecord(value.checkIns)) {
    return undefined;
  }

  const checkIns = Object.fromEntries(
    Object.entries(value.checkIns).flatMap(([planWeekId, checkIn]) => {
      if (typeof planWeekId !== "string") {
        return [];
      }

      const normalizedPlanWeekId = planWeekId.trim();
      if (!normalizedPlanWeekId) {
        return [];
      }

      const normalizedCheckIn = normalizeWeeklyCoachPersistedCheckIn(normalizedPlanWeekId, checkIn);
      return normalizedCheckIn ? [[normalizedPlanWeekId, normalizedCheckIn] as const] : [];
    }),
  );

  const adaptations = isRecord(value.adaptations)
    ? Object.fromEntries(
        Object.entries(value.adaptations).flatMap(([planWeekId, adaptation]) => {
          if (typeof planWeekId !== "string") {
            return [];
          }

          const normalizedPlanWeekId = planWeekId.trim();
          if (!normalizedPlanWeekId) {
            return [];
          }

          const normalizedAdaptation = normalizeWeeklyCoachPersistedAdaptation(adaptation);
          return normalizedAdaptation ? [[normalizedPlanWeekId, normalizedAdaptation] as const] : [];
        }),
      )
    : {};

  return weeklyCoachTrackingSchema.parse({ checkIns, adaptations });
}

export function parseWeeklyCoachTrackingState(value: unknown): WeeklyCoachTrackingState {
  return weeklyCoachTrackingSchema.parse(value);
}

function normalizeCollection<T>(value: unknown, normalizeEntry: (entry: unknown, index: number) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<T[]>((acc, entry, index) => {
    const normalized = normalizeEntry(entry, index);
    if (normalized) {
      acc.push(normalized);
    }
    return acc;
  }, []);
}

export function normalizeTrackingSnapshot(value: unknown): TrackingSnapshot {
  if (!value || typeof value !== "object") {
    return defaultTracking;
  }

  const source = value as Partial<Record<TrackingCollection | "passiveData", unknown>>;
  const weeklyCoach = normalizeWeeklyCoachTrackingState((value as { weeklyCoach?: unknown }).weeklyCoach);

  return {
    checkins: normalizeCollection(source.checkins, normalizeCheckinEntry),
    foodLog: normalizeCollection(source.foodLog, normalizeFoodEntry),
    workoutLog: normalizeCollection(source.workoutLog, normalizeWorkoutEntry),
    mealLog: normalizeCollection(source.mealLog, normalizeMealLogEntry),
    passiveData: normalizePassiveHealthData(source.passiveData),
    ...(weeklyCoach ? { weeklyCoach } : {}),
  };
}

export function upsertTrackingEntry(current: unknown, payload: TrackingEntryCreateInput): TrackingSnapshot {
  const normalized = normalizeTrackingSnapshot(current);
  const currentList = normalized[payload.collection];
  const nextList = [
    ...currentList.filter((entry) => {
      if (!entry || typeof entry !== "object") return true;
      const maybeId = (entry as { id?: unknown }).id;
      return maybeId !== payload.item.id;
    }),
    payload.item,
  ];

  return {
    ...normalized,
    [payload.collection]: nextList,
  };
}

export function replacePassiveHealthData(current: unknown, payload: unknown): TrackingSnapshot {
  const normalized = normalizeTrackingSnapshot(current);
  const passiveData = normalizePassiveHealthData(payload);
  return {
    ...normalized,
    passiveData,
  };
}

export function upsertPassiveHealthSnapshot(current: unknown, snapshot: PassiveHealthSnapshot): TrackingSnapshot {
  const normalized = normalizeTrackingSnapshot(current);
  const nextSnapshots = [
    snapshot,
    ...normalized.passiveData.snapshots.filter((entry) => entry.id !== snapshot.id),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || b.syncedAt.localeCompare(a.syncedAt) || b.id.localeCompare(a.id))
    .slice(0, 180);

  return {
    ...normalized,
    passiveData: {
      snapshots: nextSnapshots,
      lastSyncAt: snapshot.syncedAt,
      lastSyncSource: snapshot.source,
    },
  };
}
