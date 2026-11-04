// Sample data — there is no backend. Deterministic so the page renders the same every time.

export const plan = {
  name: 'Team',
  storageQuotaGb: 500,
  storageUsedGb: 412,
  seatsTotal: 25,
  seatsUsed: 18,
  asOf: new Date(2026, 10, 3), // 3 Nov 2026
};

export type DayUsage = { date: Date; gb: number };

// Day-over-day change in GB for October 2026 (31 days, starting Thu 1 Oct).
// Weekdays bring steady uploads, weekends are quiet, and on 17 Oct a trash purge freed space.
const deltas = [
  0, 1.9, 0.4, 0.3, 2.1, 1.8, 2.4, 1.6, 1.2, 0.3, 0.2, 2.2, 1.9, 2.6, 1.7,
  1.4, -4.1, 0.2, 2.3, 2.0, 1.8, 2.5, 1.3, 0.4, 0.3, 2.4, 2.1, 1.9, 2.7, 1.5,
];

export const october: DayUsage[] = (() => {
  let gb = 370.2; // ends 31 Oct at 409.5 GB; ~412 GB by 3 Nov
  return Array.from({ length: 31 }, (_, i) => {
    if (i > 0) gb += deltas[i - 1];
    return { date: new Date(2026, 9, i + 1), gb: Math.round(gb * 10) / 10 };
  });
})();
