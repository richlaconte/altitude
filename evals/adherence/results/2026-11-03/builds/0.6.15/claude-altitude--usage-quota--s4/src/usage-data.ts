// Sample data for the usage page. There is no backend: in production these come from the
// storage and billing services, which own the quota, seat count and daily history.

export const plan = { name: 'Team', storageQuotaGb: 500, seats: 25 };

/** The reading as of today, 3 November 2026. */
export const current = { asOf: '2026-11-03', storageGb: 412, seatsUsed: 18 };

// Storage at the end of each day in October 2026, in GB. Weekdays add more than weekends;
// on 17 October an archive of old exports was deleted.
const octoberGb = [
  379.8, 381.2, 382.5, 382.9, 383.2, 384.7, 386.4, 387.6, 389.0, 390.5, 390.9, 391.1, 392.8, 394.2,
  395.7, 396.9, 390.6, 391.0, 391.3, 393.1, 394.6, 396.4, 397.7, 399.2, 399.6, 399.9, 401.8, 403.6,
  405.0, 406.7, 408.4,
];

export const dailyStorage = octoberGb.map((storage, i) => ({
  day: `2026-10-${String(i + 1).padStart(2, '0')}`,
  storage,
}));

const first = octoberGb[0];
const last = octoberGb[octoberGb.length - 1];

export const october = {
  first,
  last,
  addedGb: Math.round((last - first) * 10) / 10,
  growthPct: Math.round(((last - first) / first) * 1000) / 10,
  perDayGb: Math.round(((last - first) / (octoberGb.length - 1)) * 10) / 10,
};

/** When storage would reach the quota if it kept growing at October's average pace. */
export function quotaReachedAt(): Date {
  const exactPerDay = (last - first) / (octoberGb.length - 1);
  const days = (plan.storageQuotaGb - current.storageGb) / exactPerDay;
  const d = new Date(`${current.asOf}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d;
}
