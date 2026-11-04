// Sample data for the usage page. There is no backend: these figures stand in for
// what the billing/usage service would return.

export const plan = {
  name: 'Team',
  storageQuotaGb: 500,
  seatLimit: 25,
};

export const current = {
  storageUsedGb: 412,
  seatsUsed: 18,
  asOf: '2026-11-03',
};

// Storage used at the end of each day in October 2026, in GB.
// Steady growth on weekdays, flatter weekends, and a cleanup on 14 October.
const october = [
  379.9, 381.4, 382.7, 383.1, 383.4, 385.0, 386.6, 387.9, 389.3, 390.5,
  390.8, 391.1, 392.7, 386.9, 388.4, 389.8, 390.6, 390.9, 392.5, 394.2,
  395.6, 397.3, 398.5, 398.8, 399.1, 400.9, 402.7, 404.4, 406.1, 407.8,
  408.5,
];

export const dailyStorage = october.map((usedGb, i) => ({
  day: `2026-10-${String(i + 1).padStart(2, '0')}`,
  usedGb,
}));
