// Sample data — there is no backend. "Today" is 3 Nov 2026; "last month" is October 2026.

export const PLAN = {
  name: 'Business',
  storageQuotaGb: 500,
  storageUsedGb: 412,
  seatsTotal: 25,
  seatsUsed: 18,
  renews: '1 Dec 2026',
};

/**
 * Total storage used at the end of each day in October 2026, in GB.
 * Steady weekday uploads, quieter weekends, and a cleanup on 14 Oct
 * when a teammate emptied an old archive folder.
 */
const OCTOBER_TOTALS_GB = [
  381.0, 382.2, 382.7, 382.9, 384.5, 385.8, 387.2, 388.7, 389.6, 389.9,
  390.1, 391.8, 393.2, 387.5, 388.9, 390.4, 390.8, 391.0, 392.7, 394.5,
  395.8, 397.4, 398.9, 399.2, 399.5, 401.3, 403.0, 404.7, 406.4, 408.2,
  408.5,
];

export type DayUsage = { date: Date; gb: number };

export const OCTOBER: DayUsage[] = OCTOBER_TOTALS_GB.map((gb, i) => ({
  date: new Date(2026, 9, i + 1),
  gb,
}));

/** Least-squares slope in GB/day — the trend, robust to a single cleanup dip. */
export function trendSlope(days: DayUsage[]): { slope: number; intercept: number } {
  const n = days.length;
  const xs = days.map((_, i) => i);
  const ys = days.map((d) => d.gb);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}
