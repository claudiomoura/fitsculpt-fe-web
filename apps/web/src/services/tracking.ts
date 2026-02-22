export type TrackingCollection = "checkins" | "foodLog" | "workoutLog";

export type CheckinEntry = {
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

export type FoodEntry = {
  id: string;
  date: string;
  foodKey: string;
  grams: number;
};

export type WorkoutEntry = {
  id: string;
  date: string;
  name: string;
  durationMin: number;
  notes: string;
};

export type TrackingEntryByCollection = {
  checkins: CheckinEntry;
  foodLog: FoodEntry;
  workoutLog: WorkoutEntry;
};

export type TrackingSnapshot = {
  checkins: CheckinEntry[];
  foodLog: FoodEntry[];
  workoutLog: WorkoutEntry[];
};

export async function createTrackingEntry<TCollection extends TrackingCollection>(
  collection: TCollection,
  item: TrackingEntryByCollection[TCollection]
): Promise<TrackingSnapshot> {
  const response = await fetch("/api/tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ collection, item }),
  });

  if (!response.ok) {
    throw new Error(`TRACKING_WRITE_FAILED:${response.status}`);
  }

  return (await response.json()) as TrackingSnapshot;
}
