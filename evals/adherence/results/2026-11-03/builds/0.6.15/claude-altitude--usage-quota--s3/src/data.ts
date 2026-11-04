// Sample data for the usage page. There is no backend: in a real product these readings come from the
// storage and billing services, which own the quota, seat count and history.

export const plan = { name: 'Team', storageQuotaGb: 500, seats: 25 };

/** Reading as of 3 November 2026. */
export const storageUsedGb = 412;
export const seatsUsed = 18;

/** Thresholds where a quota is near its limit (80%). */
export const storageHighGb = 400;
export const seatsHigh = 20;

/** Storage used at the end of 30 September, the day before the chart starts. */
export const storageStartGb = 369.2;

// Storage used at the end of each day in October 2026, in GB. Weekdays add 1.5–2.5 GB as the team uploads;
// weekends add little. On Friday 16 October the trash was emptied, freeing 5.2 GB.
const daily = [
  370.8, 372.7, 373.1, 373.4, 375.5, 377.3, 378.8, 381.2, 382.9, 383.4, 383.6, 385.5, 387.7, 389.3, 391.1, 385.9,
  386.2, 386.6, 388.6, 390.9, 392.8, 394.2, 396.8, 397.4, 397.6, 399.4, 401.5, 403.2, 405.7, 407.6, 408.0,
];

export const storageByDay = daily.map((storage, i) => ({
  day: `2026-10-${String(i + 1).padStart(2, '0')}`,
  storage,
}));
