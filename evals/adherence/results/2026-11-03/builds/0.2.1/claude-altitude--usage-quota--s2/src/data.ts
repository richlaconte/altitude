// Sample data — there is no backend. "Today" is 3 Nov 2026; last month is October 2026.

export const PLAN = {
  name: 'Team',
  storageQuotaGb: 500,
  storageUsedGb: 412,
  seatQuota: 25,
  seatsUsed: 18,
  asOf: new Date(2026, 10, 3),
};

export type DailyUsage = {date: Date; usedGb: number; note?: string};

// End-of-day storage used. Weekdays grow faster than weekends; the trash was emptied on the 17th.
const OCTOBER_GB = [
  371.2, 372.6, 372.9, 373.1, 374.8, 376.3, 377.5, 379.0, 380.2, 380.4,
  380.7, 382.5, 384.1, 385.0, 386.8, 388.1, 382.4, 382.6, 384.3, 386.0,
  387.9, 389.4, 390.8, 391.1, 391.3, 394.0, 396.4, 400.1, 402.6, 404.9,
  405.3,
];

const NOTES: Record<number, string> = {
  17: 'Trash emptied (5.7 GB freed)',
  28: 'Large upload: 3.7 GB in one day',
};

export const OCTOBER: DailyUsage[] = OCTOBER_GB.map((usedGb, i) => ({
  date: new Date(2026, 9, i + 1),
  usedGb,
  note: NOTES[i + 1],
}));

const first = OCTOBER[0];
const last = OCTOBER[OCTOBER.length - 1];

export const MONTH_CHANGE_GB = +(last.usedGb - first.usedGb).toFixed(1);
export const MONTH_CHANGE_PCT = (MONTH_CHANGE_GB / first.usedGb) * 100;
export const AVG_DAILY_GB = MONTH_CHANGE_GB / (OCTOBER.length - 1);

/** When storage reaches the quota if October's average daily growth continues. */
export const PROJECTED_FULL = (() => {
  const remaining = PLAN.storageQuotaGb - PLAN.storageUsedGb;
  const days = Math.ceil(remaining / AVG_DAILY_GB);
  const d = new Date(PLAN.asOf);
  d.setDate(d.getDate() + days);
  return {date: d, days};
})();

export const fmtDay = (d: Date) => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
export const fmtDayLong = (d: Date) =>
  d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
export const fmtGb = (n: number) => `${n.toFixed(1)} GB`;
