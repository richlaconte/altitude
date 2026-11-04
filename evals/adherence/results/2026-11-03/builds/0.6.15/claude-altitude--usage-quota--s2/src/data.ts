// Sample data: there is no backend. A real app would load these from its usage service.

export const plan = {
  name: 'Team',
  storageQuotaGb: 500,
  storageNearLimitGb: 400, // 80% of the quota
  seats: 25,
  seatsNearLimit: 20, // 80% of the seats
};

export const current = {
  asOf: '2026-11-03',
  storageGb: 412,
  seatsUsed: 18,
};

// Storage used at the end of each day in October 2026, in GB. Weekends grow slowly,
// a cleanup on 9 Oct removed old project archives and a bulk upload landed on 27 Oct.
const october = [
  376.6, 377.9, 378.3, 378.6, 380.1, 381.5, 382.8, 384.0, 383.1, 383.4, 383.6,
  385.2, 386.7, 387.9, 389.3, 390.4, 390.7, 390.9, 392.5, 394.0, 395.2, 396.8,
  398.0, 398.3, 398.6, 400.1, 403.4, 404.9, 406.3, 407.6, 408.0,
];

export const dailyStorage = october.map((storage, i) => ({
  day: `2026-10-${String(i + 1).padStart(2, '0')}`,
  storage,
}));
