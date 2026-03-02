import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type CheckinEntry = {
  id: string;
  date: string;
  weightKg: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  bicepsCm: number;
  thighCm: number;
  calfCm: number;
  neckCm: number;
  bodyFatPercent: number;
  energy: number;
  hunger: number;
  notes: string;
  recommendation: string;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
};

type FoodEntry = {
  id: string;
  date: string;
  foodKey: string;
  grams: number;
};

type WorkoutEntry = {
  id: string;
  date: string;
  name: string;
  durationMin: number;
  notes: string;
};

type TrackingSnapshot = {
  checkins: CheckinEntry[];
  foodLog: FoodEntry[];
  workoutLog: WorkoutEntry[];
};

type TrackingCollection = keyof TrackingSnapshot;

const trackingStore = new Map<string, TrackingSnapshot>();

const createEmptySnapshot = (): TrackingSnapshot => ({
  checkins: [],
  foodLog: [],
  workoutLog: [],
});

async function getTrackingStoreKey() {
  return (await cookies()).get("fs_token")?.value ?? null;
}

function getSnapshotForKey(key: string): TrackingSnapshot {
  const existing = trackingStore.get(key);
  if (existing) {
    return existing;
  }

  const snapshot = createEmptySnapshot();
  trackingStore.set(key, snapshot);
  return snapshot;
}

export async function GET() {
  const key = await getTrackingStoreKey();
  if (!key) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json(getSnapshotForKey(key), { status: 200 });
}

export async function PUT(request: Request) {
  return writeTracking(request);
}

export async function POST(request: Request) {
  return writeTracking(request);
}

async function writeTracking(request: Request) {
  const key = await getTrackingStoreKey();
  if (!key) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const currentSnapshot = getSnapshotForKey(key);

  if (isTrackingSnapshot(payload)) {
    trackingStore.set(key, payload);
    return NextResponse.json(payload, { status: 200 });
  }

  const updatedSnapshot = updateSnapshot(currentSnapshot, payload);
  trackingStore.set(key, updatedSnapshot);
  return NextResponse.json(updatedSnapshot, { status: 200 });
}

function updateSnapshot(snapshot: TrackingSnapshot, payload: unknown): TrackingSnapshot {
  if (!isTrackingMutationPayload(payload)) {
    return snapshot;
  }

  const nextSnapshot: TrackingSnapshot = {
    checkins: [...snapshot.checkins],
    foodLog: [...snapshot.foodLog],
    workoutLog: [...snapshot.workoutLog],
  };

  const collectionEntries = nextSnapshot[payload.collection] as Array<unknown>;
  collectionEntries.unshift(payload.item);
  return nextSnapshot;
}

function isTrackingMutationPayload(value: unknown): value is { collection: TrackingCollection; item: CheckinEntry | FoodEntry | WorkoutEntry } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  if (payload.collection !== "checkins" && payload.collection !== "foodLog" && payload.collection !== "workoutLog") {
    return false;
  }

  if (payload.collection === "checkins") {
    return isCheckinEntry(payload.item);
  }
  if (payload.collection === "foodLog") {
    return isFoodEntry(payload.item);
  }
  return isWorkoutEntry(payload.item);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isCheckinEntry(value: unknown): value is CheckinEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.date) &&
    isNumber(value.weightKg) &&
    isNumber(value.chestCm) &&
    isNumber(value.waistCm) &&
    isNumber(value.hipsCm) &&
    isNumber(value.bicepsCm) &&
    isNumber(value.thighCm) &&
    isNumber(value.calfCm) &&
    isNumber(value.neckCm) &&
    isNumber(value.bodyFatPercent) &&
    isNumber(value.energy) &&
    isNumber(value.hunger) &&
    isString(value.notes) &&
    isString(value.recommendation) &&
    (value.frontPhotoUrl === null || isString(value.frontPhotoUrl)) &&
    (value.sidePhotoUrl === null || isString(value.sidePhotoUrl))
  );
}

function isFoodEntry(value: unknown): value is FoodEntry {
  return isRecord(value) && isString(value.id) && isString(value.date) && isString(value.foodKey) && isNumber(value.grams);
}

function isWorkoutEntry(value: unknown): value is WorkoutEntry {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.date) &&
    isString(value.name) &&
    isNumber(value.durationMin) &&
    isString(value.notes)
  );
}

function isTrackingSnapshot(value: unknown): value is TrackingSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.checkins) &&
    value.checkins.every(isCheckinEntry) &&
    Array.isArray(value.foodLog) &&
    value.foodLog.every(isFoodEntry) &&
    Array.isArray(value.workoutLog) &&
    value.workoutLog.every(isWorkoutEntry)
  );
}
