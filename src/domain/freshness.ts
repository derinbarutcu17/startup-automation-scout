export function isFresh(lastCheckedAt: Date | null | undefined, freshnessDays: number): boolean {
  if (!lastCheckedAt) return false;
  const ageMs = Date.now() - new Date(lastCheckedAt).getTime();
  return ageMs <= freshnessDays * 24 * 60 * 60 * 1000;
}

export function freshnessLabel(lastCheckedAt: Date | null | undefined, freshnessDays: number): "fresh" | "stale" | "never_checked" {
  if (!lastCheckedAt) return "never_checked";
  return isFresh(lastCheckedAt, freshnessDays) ? "fresh" : "stale";
}

// Source freshness: 90 days for documents considered stale if beyond (mirrors orchestration.ts stale check)
export function isSourceStale(fetchedAt: Date, staleDays = 90): boolean {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
}
