import type { AuthMeResponse } from "@/lib/types";

type CacheEntry = {
  data: AuthMeResponse;
  timestamp: number;
};

const CACHE_TTL = 300_000; // 5 minutes

function getStore(): {
  pending: Promise<AuthMeResponse> | null;
  cache: CacheEntry | null;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (!g.__authDedup) {
    g.__authDedup = { pending: null as Promise<AuthMeResponse> | null, cache: null as CacheEntry | null };
  }
  return g.__authDedup;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const store = getStore();

  if (store.cache && Date.now() - store.cache.timestamp < CACHE_TTL) {
    return store.cache.data;
  }

  if (store.pending) {
    return store.pending;
  }

  store.pending = fetch("/api/auth/me", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) {
        throw new Error(`HTTP_${r.status}`);
      }
      return r.json() as Promise<AuthMeResponse>;
    })
    .then((data) => {
      store.cache = { data, timestamp: Date.now() };
      return data;
    })
    .finally(() => {
      store.pending = null;
    });

  return store.pending;
}

export function invalidateAuthMeCache(): void {
  const store = getStore();
  store.cache = null;
}
