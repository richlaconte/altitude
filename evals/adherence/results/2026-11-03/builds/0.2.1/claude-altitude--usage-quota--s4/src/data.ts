// Sample data for the usage page. There is no backend; these are fixed, realistic figures.
// "Today" is 3 November 2026, so "last month" is October 2026.

export const PLAN = {
  name: 'Team',
  storageQuotaGb: 500,
  storageUsedGb: 412,
  seatsTotal: 25,
  seatsUsed: 18,
  renewsOn: '1 December 2026',
};

export type DayUsage = { date: string; usedGb: number };

// Storage used at the end of each day in October 2026 (1 Oct is a Thursday).
// Weekdays grow ~1.5–2 GB, weekends barely move. On 16 Oct the 30-day trash
// retention purged 7.6 GB; on 28 Oct the design team migrated an archive (+6 GB).
const OCTOBER_GB = [
  371.2, 372.9, 373.3, 373.6, 375.4, 377.1, 378.5, 380.2, 381.6, 382.0,
  382.3, 384.1, 385.9, 387.2, 389.0, 381.4, 381.7, 382.0, 383.9, 385.6,
  387.4, 389.1, 390.8, 391.2, 391.5, 393.6, 395.8, 401.9, 403.7, 405.4,
  405.9,
];

export const OCTOBER: DayUsage[] = OCTOBER_GB.map((usedGb, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  usedGb,
}));

export const ANNOTATIONS: Record<string, string> = {
  '2026-10-16': 'Trash auto-emptied',
  '2026-10-28': 'Archive migrated',
};
