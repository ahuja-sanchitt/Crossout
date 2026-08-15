// Single source of truth for "today" as a YYYY-MM-DD string. UTC, to match
// the date arithmetic in lib/instances.ts and lib/streak.ts.
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}
