const buckets = new Map<string, number[]>();
export function isRateLimited(key: string, max = 20): boolean {
  const now = Date.now();
  if (buckets.size > 10000) for (const [id, times] of buckets) if (!times.length || now - times.at(-1)! > 60000) buckets.delete(id);
  const recent = (buckets.get(key) ?? []).filter(t => now - t < 60000);
  if (recent.length >= max) return true;
  if (buckets.size >= 10000 && !buckets.has(key)) return true;
  recent.push(now);
  buckets.set(key, recent);
  return false;
}
