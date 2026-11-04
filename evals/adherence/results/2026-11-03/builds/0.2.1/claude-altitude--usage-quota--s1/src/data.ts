// Sample data: there is no backend. "Today" is Nov 3, 2026, so "last month" is October 2026.

export const AS_OF = new Date(2026, 10, 3);

export const plan = {
  name: 'Team',
  storageQuotaGb: 500,
  storageUsedGb: 412,
  seatsTotal: 25,
  seatsUsed: 18,
};

/** Storage used at the end of each day in October 2026, in GB. A 4.1 GB cleanup ran on Oct 21. */
const octoberGb = [
  377.4, 379.0, 380.3, 380.7, 381.0, 382.7, 384.2, 385.6, 387.4, 388.6, 389.1, 389.3, 390.9, 392.3, 394.2, 395.7,
  397.0, 397.4, 397.7, 399.5, 395.4, 397.0, 398.7, 400.1, 400.6, 400.9, 402.8, 404.4, 405.9, 407.6, 409.0,
];

export interface DayUsage {
  date: Date;
  gb: number;
  /** Change from the day before; null on the first day. */
  change: number | null;
}

export const daily: DayUsage[] = octoberGb.map((gb, i) => ({
  date: new Date(2026, 9, i + 1),
  gb,
  change: i === 0 ? null : Math.round((gb - octoberGb[i - 1]) * 10) / 10,
}));

/** Least-squares slope in GB per day. */
export function trendPerDay(days: DayUsage[]): number {
  const n = days.length;
  const xm = (n - 1) / 2;
  const ym = days.reduce((s, d) => s + d.gb, 0) / n;
  let num = 0;
  let den = 0;
  days.forEach((d, i) => {
    num += (i - xm) * (d.gb - ym);
    den += (i - xm) ** 2;
  });
  return num / den;
}
