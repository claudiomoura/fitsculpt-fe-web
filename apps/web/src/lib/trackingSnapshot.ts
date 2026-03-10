type UnknownRecord = Record<string, unknown>;

type TrackingSnapshot = {
  checkins: unknown[];
  foodLog: unknown[];
  workoutLog: unknown[];
};

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readSnapshotCandidate(payload: unknown): unknown {
  if (!isObject(payload)) return payload;
  if ("data" in payload && isObject(payload.data)) {
    return payload.data;
  }
  return payload;
}

export function normalizeTrackingSnapshotPayload(payload: unknown): TrackingSnapshot {
  const candidate = readSnapshotCandidate(payload);
  if (!isObject(candidate)) {
    return { checkins: [], foodLog: [], workoutLog: [] };
  }

  return {
    checkins: asArray(candidate.checkins),
    foodLog: asArray(candidate.foodLog),
    workoutLog: asArray(candidate.workoutLog),
  };
}
