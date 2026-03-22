import type {
  CheckinEntry,
  FoodEntry,
  MealLogEntry,
  TrackingCollection,
  TrackingEntryCreateInput,
  TrackingSnapshot,
  WorkoutEntry,
} from "./schemas.js";
import { defaultTracking } from "./schemas.js";

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

  const source = value as Partial<Record<TrackingCollection, unknown>>;
  return {
    checkins: normalizeCollection(source.checkins, normalizeCheckinEntry),
    foodLog: normalizeCollection(source.foodLog, normalizeFoodEntry),
    workoutLog: normalizeCollection(source.workoutLog, normalizeWorkoutEntry),
    mealLog: normalizeCollection(source.mealLog, normalizeMealLogEntry),
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
