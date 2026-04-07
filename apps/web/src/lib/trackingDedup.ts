type TrackingSnapshot = {
  checkins?: unknown[];
  foodLog?: unknown[];
  workoutLog?: unknown[];
  mealLog?: unknown[];
  passiveData?: unknown;
};

function getStore(): { pending: Promise<TrackingSnapshot> | null } {
  const g = globalThis as { __trackingDedup?: { pending: Promise<TrackingSnapshot> | null } };
  if (!g.__trackingDedup) {
    g.__trackingDedup = { pending: null };
  }
  return g.__trackingDedup;
}

export async function fetchTrackingSnapshotDeduped(): Promise<TrackingSnapshot> {
  const store = getStore();

  if (store.pending) {
    return store.pending;
  }

  store.pending = fetch("/api/tracking", { cache: "no-store", credentials: "include" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }
      return response.json() as Promise<TrackingSnapshot>;
    })
    .finally(() => {
      store.pending = null;
    });

  return store.pending;
}
