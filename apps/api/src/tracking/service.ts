import type { TrackingCollection, TrackingEntryCreateInput, TrackingSnapshot } from "./schemas.js";
import { defaultTracking } from "./schemas.js";

export function normalizeTrackingSnapshot(value: unknown): TrackingSnapshot {
  if (!value || typeof value !== "object") {
    return defaultTracking;
  }

  const source = value as Partial<Record<TrackingCollection, unknown>>;
  return {
    checkins: Array.isArray(source.checkins) ? source.checkins : [],
    foodLog: Array.isArray(source.foodLog) ? source.foodLog : [],
    workoutLog: Array.isArray(source.workoutLog) ? source.workoutLog : [],
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
