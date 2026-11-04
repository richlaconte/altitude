// Sample data for the usage page. There is no backend: these figures stand in for
// what the billing and storage services would return.

export const PLAN = { name: 'Team', storageQuotaGb: 500, seatLimit: 25 };

/** Today's readings (3 November 2026). */
export const CURRENT = { storageUsedGb: 412, seatsUsed: 18, asOf: '2026-11-03' };

/** Near-limit thresholds, at 80% of each quota. */
export const THRESHOLDS = { storageGb: 400, seats: 20 };

/** Storage used at the end of each day in October 2026, in GB. Weekdays add more than weekends; old backups were deleted on 16 October. */
const OCTOBER_GB = [
  368.0, 369.9, 370.3, 370.6, 372.8, 374.9, 376.7, 378.8, 380.5, 380.9, 381.2,
  383.6, 385.8, 387.7, 389.9, 383.2, 383.6, 383.9, 386.3, 388.6, 390.8, 392.9,
  394.8, 395.2, 395.5, 398.0, 400.3, 402.5, 404.9, 406.9, 407.4,
];

export const DAILY_STORAGE = OCTOBER_GB.map((storage, i) => ({
  day: `2026-10-${String(i + 1).padStart(2, '0')}`,
  storage,
}));

/** Storage added during September 2026, for comparison. */
export const SEPTEMBER_ADDED_GB = 31.2;

export const CLEANUP = { day: '2026-10-16', label: 'Old backups deleted' };
