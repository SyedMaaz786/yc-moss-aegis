declare global {
  var __aegisRateBuckets: Map<string, number[]> | undefined;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

function buckets(): Map<string, number[]> {
  if (!globalThis.__aegisRateBuckets) {
    globalThis.__aegisRateBuckets = new Map();
  }
  return globalThis.__aegisRateBuckets;
}

/** Simple fixed-window limiter, in-memory per warm instance. Good enough to keep a public demo from being cost-bombed. */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const store = buckets();
  const recent = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  store.set(key, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}
